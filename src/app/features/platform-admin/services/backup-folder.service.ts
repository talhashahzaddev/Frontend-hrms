import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Remembers a folder on the admin's computer (File System Access API, Chrome/Edge)
 * and writes backup files into it. The folder handle is kept in IndexedDB, so it
 * survives page reloads; the browser may ask for permission again after a reload.
 */

// Minimal typings: these APIs are not in every TypeScript DOM lib yet.
interface WritableFile { write(data: Blob): Promise<void>; close(): Promise<void>; }
interface FileHandle { createWritable(): Promise<WritableFile>; }
export interface DirectoryHandle {
  name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>;
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
}

export interface SavedBackupFolder {
  handle: DirectoryHandle;
  name: string;
  /** ISO time the folder was chosen; only backups finished after this are auto-saved. */
  selectedAt: string;
}

const DB_NAME = 'brisk-platform-backups';
const STORE = 'kv';
const FOLDER_KEY = 'folder';
const SAVED_IDS_KEY = 'savedBackupIds';
const MAX_SAVED_IDS = 300;

@Injectable({ providedIn: 'root' })
export class BackupFolderService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  get isSupported(): boolean {
    return this.isBrowser && typeof (window as any).showDirectoryPicker === 'function' && typeof indexedDB !== 'undefined';
  }

  /** Opens the OS folder picker. Must be called from a click. Returns null if the user cancels. */
  async chooseFolder(): Promise<SavedBackupFolder | null> {
    try {
      const handle: DirectoryHandle = await (window as any).showDirectoryPicker({
        id: 'brisk-db-backups',
        mode: 'readwrite',
        startIn: 'documents'
      });
      const folder: SavedBackupFolder = { handle, name: handle.name, selectedAt: new Date().toISOString() };
      await this.put(FOLDER_KEY, folder);
      return folder;
    } catch (err: any) {
      if (err?.name === 'AbortError') return null;
      throw err;
    }
  }

  async getFolder(): Promise<SavedBackupFolder | null> {
    if (!this.isSupported) return null;
    try {
      return (await this.get<SavedBackupFolder>(FOLDER_KEY)) ?? null;
    } catch {
      return null;
    }
  }

  async forgetFolder(): Promise<void> {
    await this.del(FOLDER_KEY);
  }

  /** 'granted' | 'prompt' | 'denied'. With request=true (from a click) the browser asks the user. */
  async permission(folder: SavedBackupFolder, request = false): Promise<PermissionState> {
    const opts = { mode: 'readwrite' as const };
    const state = await folder.handle.queryPermission(opts);
    if (state === 'granted' || !request) return state;
    return folder.handle.requestPermission(opts);
  }

  async writeFile(folder: SavedBackupFolder, fileName: string, data: Blob): Promise<void> {
    const file = await folder.handle.getFileHandle(fileName, { create: true });
    const writable = await file.createWritable();
    try {
      await writable.write(data);
    } finally {
      await writable.close();
    }
  }

  async getSavedIds(): Promise<Set<string>> {
    try {
      return new Set((await this.get<string[]>(SAVED_IDS_KEY)) ?? []);
    } catch {
      return new Set();
    }
  }

  async markSaved(backupId: string): Promise<void> {
    const ids = [...(await this.getSavedIds()), backupId].slice(-MAX_SAVED_IDS);
    await this.put(SAVED_IDS_KEY, [...new Set(ids)]);
  }

  /** Normal browser download, used when no folder is chosen or the API is unsupported. */
  downloadBlob(fileName: string, data: Blob): void {
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  // ---------- tiny IndexedDB key/value store ----------

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => { resolve(request.result as T); db.close(); };
      request.onerror = () => { reject(request.error); db.close(); };
    });
  }

  private get<T>(key: string): Promise<T | undefined> { return this.tx<T | undefined>('readonly', s => s.get(key)); }
  private put(key: string, value: unknown): Promise<unknown> { return this.tx('readwrite', s => s.put(value, key)); }
  private del(key: string): Promise<unknown> { return this.tx('readwrite', s => s.delete(key)); }
}
