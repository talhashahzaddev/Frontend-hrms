import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, firstValueFrom, interval } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { SharedCommonModule } from '@shared/shared-common.module';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData
} from '../../../attendance/components/confirmation-dialog/confirmation-dialog_component';
import { DatabaseBackupService } from '../../services/database-backup.service';
import { BackupFolderService, SavedBackupFolder } from '../../services/backup-folder.service';
import { BackupSettings, DatabaseBackup } from '../../models/backup.models';

type FrequencyChoice = 1 | 7 | 15 | 30 | 'custom';

@Component({
  selector: 'app-database-backup',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './database-backup.component.html',
  styleUrls: ['./database-backup.component.scss']
})
export class DatabaseBackupComponent implements OnInit, OnDestroy {
  private api = inject(DatabaseBackupService);
  private folders = inject(BackupFolderService);
  private notify = inject(NotificationService);
  private dialog = inject(MatDialog);

  readonly displayedColumns = ['startedAt', 'triggerType', 'size', 'status', 'actions'];
  readonly frequencyOptions: { value: FrequencyChoice; label: string }[] = [
    { value: 1, label: 'Every day' },
    { value: 7, label: 'Every 7 days' },
    { value: 15, label: 'Every 15 days' },
    { value: 30, label: 'Every 30 days' },
    { value: 'custom', label: 'Custom…' }
  ];
  readonly browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  readonly folderSupported = this.folders.isSupported;

  // History
  backups: DatabaseBackup[] = [];
  isLoadingBackups = true;
  isStarting = false;
  busyIds = new Set<string>();
  savedIds = new Set<string>();

  // History filter (calendar dates + optional times, in this browser's time zone)
  filterFromDate: Date | null = null;
  filterFromTime = '';
  filterToDate: Date | null = null;
  filterToTime = '';
  appliedFrom: Date | null = null;
  appliedTo: Date | null = null;

  // Schedule
  settings: BackupSettings | null = null;
  isEnabled = false;
  frequencyChoice: FrequencyChoice = 1;
  customDays = 3;
  runAtTime = '02:00';
  retentionCount = 10;
  isSavingSettings = false;

  // Folder on this computer
  folder: SavedBackupFolder | null = null;
  folderPermission: PermissionState | null = null;

  private pollSub?: Subscription;
  /** Manual backups started from this page; they are saved/downloaded automatically when done. */
  private waitingFor = new Set<string>();
  private isAutoSaving = false;

  get hasRunning(): boolean {
    return this.backups.some(b => b.status === 'running');
  }

  get frequencyDays(): number {
    return this.frequencyChoice === 'custom' ? Number(this.customDays) : this.frequencyChoice;
  }

  get canWriteToFolder(): boolean {
    return !!this.folder && this.folderPermission === 'granted';
  }

  async ngOnInit(): Promise<void> {
    this.loadSettings();
    this.folder = await this.folders.getFolder();
    if (this.folder) {
      this.folderPermission = await this.folders.permission(this.folder).catch(() => 'prompt' as PermissionState);
    }
    this.savedIds = await this.folders.getSavedIds();
    this.loadBackups();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // ======================= BACKUPS =======================

  loadBackups(): void {
    this.api.getBackups(this.appliedFrom, this.appliedTo).subscribe({
      next: res => {
        this.isLoadingBackups = false;
        if (!res.success) {
          this.notify.showError(res.message || 'Could not load backups.');
          return;
        }
        this.backups = res.data ?? [];
        this.hasRunning ? this.startPolling() : this.stopPolling();
        this.handleFinishedBackups();
        this.autoSaveToFolder();
      },
      error: err => {
        this.isLoadingBackups = false;
        this.stopPolling();
        this.notify.showError(err?.error?.message || 'Could not load backups.');
      }
    });
  }

  get isFiltered(): boolean {
    return !!(this.appliedFrom || this.appliedTo);
  }

  applyFilter(): void {
    // Date only: "from" starts at 00:00, "to" ends at 23:59:59.
    const from = this.combine(this.filterFromDate, this.filterFromTime, false);
    const to = this.combine(this.filterToDate, this.filterToTime, true);
    if (from && to && from > to) {
      this.notify.showWarning('"From" must be before "To".');
      return;
    }
    this.appliedFrom = from;
    this.appliedTo = to;
    this.isLoadingBackups = true;
    this.loadBackups();
  }

  clearFilter(): void {
    this.filterFromDate = this.filterToDate = null;
    this.filterFromTime = this.filterToTime = '';
    this.appliedFrom = this.appliedTo = null;
    this.isLoadingBackups = true;
    this.loadBackups();
  }

  private combine(date: Date | null, time: string, endOfDay: boolean): Date | null {
    if (!date) return null;
    const result = new Date(date);
    if (time) {
      const [h, m] = time.split(':').map(Number);
      result.setHours(h || 0, m || 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    } else if (endOfDay) {
      result.setHours(23, 59, 59, 999);
    } else {
      result.setHours(0, 0, 0, 0);
    }
    return result;
  }

  backupNow(): void {
    this.isStarting = true;
    this.api.startBackup().subscribe({
      next: res => {
        this.isStarting = false;
        if (res.success && res.data) {
          this.waitingFor.add(res.data.backupId);
          this.notify.showInfo(this.canWriteToFolder
            ? `Backup started. It will be saved to "${this.folder!.name}" when ready.`
            : 'Backup started. It will download when ready.');
          this.loadBackups();
        } else {
          this.notify.showError(res.message || 'Could not start backup.');
        }
      },
      error: err => {
        this.isStarting = false;
        this.notify.showError(err?.error?.message || 'Could not start backup.');
        this.loadBackups();
      }
    });
  }

  async download(backup: DatabaseBackup): Promise<void> {
    const blob = await this.fetchFile(backup);
    if (blob) this.folders.downloadBlob(backup.fileName, blob);
  }

  async saveToFolder(backup: DatabaseBackup, silent = false): Promise<void> {
    if (!this.folder) return;
    if (!silent && !(await this.ensurePermission())) return;

    const blob = await this.fetchFile(backup);
    if (!blob) return;
    try {
      await this.folders.writeFile(this.folder, backup.fileName, blob);
      await this.folders.markSaved(backup.backupId);
      this.savedIds.add(backup.backupId);
      this.notify.showSuccess(`Saved ${backup.fileName} to "${this.folder.name}".`);
    } catch (e) {
      console.error('Saving backup to folder failed', e);
      this.notify.showError(`Could not write to "${this.folder.name}". Choose the folder again.`);
      this.folderPermission = await this.folders.permission(this.folder).catch(() => 'prompt' as PermissionState);
    }
  }

  confirmDelete(backup: DatabaseBackup): void {
    const data: ConfirmationDialogData = {
      title: 'Delete backup?',
      message: `${backup.fileName} will be removed from the server. Copies already saved on your computer are not affected.`,
      confirmLabel: 'Delete',
      confirmColor: 'warn',
      icon: 'delete'
    };
    this.dialog.open(ConfirmationDialogComponent, { data, width: '440px' }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.api.deleteBackup(backup.backupId).subscribe({
        next: res => {
          res.success ? this.notify.showSuccess('Backup deleted.') : this.notify.showError(res.message);
          this.loadBackups();
        },
        error: err => this.notify.showError(err?.error?.message || 'Could not delete backup.')
      });
    });
  }

  // ======================= FOLDER =======================

  async chooseFolder(): Promise<void> {
    try {
      const folder = await this.folders.chooseFolder();
      if (!folder) return;
      this.folder = folder;
      this.folderPermission = await this.folders.permission(folder, true);
      this.notify.showSuccess(`New backups will be saved to "${folder.name}".`);
    } catch (e) {
      console.error('Folder picker failed', e);
      this.notify.showError('Could not use that folder. Please pick a different one.');
    }
  }

  async allowFolderAccess(): Promise<void> {
    if (await this.ensurePermission()) this.autoSaveToFolder();
  }

  async forgetFolder(): Promise<void> {
    await this.folders.forgetFolder();
    this.folder = null;
    this.folderPermission = null;
  }

  // ======================= SCHEDULE =======================

  loadSettings(): void {
    this.api.getSettings().subscribe({
      next: res => {
        if (res.success && res.data) this.applySettings(res.data);
      },
      error: () => this.notify.showError('Could not load backup schedule.')
    });
  }

  saveSettings(): void {
    const days = this.frequencyDays;
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      this.notify.showWarning('Enter a number of days between 1 and 365.');
      return;
    }
    if (!Number.isInteger(Number(this.retentionCount)) || this.retentionCount < 1 || this.retentionCount > 100) {
      this.notify.showWarning('Backups to keep must be between 1 and 100.');
      return;
    }

    this.isSavingSettings = true;
    this.api.updateSettings({
      isEnabled: this.isEnabled,
      frequencyDays: days,
      runAtTime: this.runAtTime,
      timeZone: this.browserTimeZone,
      retentionCount: Number(this.retentionCount)
    }).subscribe({
      next: res => {
        this.isSavingSettings = false;
        if (res.success && res.data) {
          this.applySettings(res.data);
          this.notify.showSuccess(res.message || 'Backup schedule saved.');
          this.loadBackups(); // retention may have removed old backups
        } else {
          this.notify.showError(res.message || 'Could not save schedule.');
        }
      },
      error: err => {
        this.isSavingSettings = false;
        this.notify.showError(err?.error?.message || 'Could not save schedule.');
      }
    });
  }

  // ======================= DISPLAY HELPERS =======================

  formatSize(bytes?: number | null): string {
    if (bytes == null) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
    return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  isSaved(backup: DatabaseBackup): boolean {
    return this.savedIds.has(backup.backupId);
  }

  // ======================= INTERNALS =======================

  private applySettings(s: BackupSettings): void {
    this.settings = s;
    this.isEnabled = s.isEnabled;
    this.runAtTime = s.runAtTime || '02:00';
    this.retentionCount = s.retentionCount;
    const preset = [1, 7, 15, 30].includes(s.frequencyDays);
    this.frequencyChoice = preset ? (s.frequencyDays as FrequencyChoice) : 'custom';
    if (!preset) this.customDays = s.frequencyDays;
  }

  private startPolling(): void {
    if (this.pollSub) return;
    this.pollSub = interval(4000).subscribe(() => this.loadBackups());
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  /** Reacts to manual backups from this page finishing. */
  private handleFinishedBackups(): void {
    for (const id of [...this.waitingFor]) {
      const backup = this.backups.find(b => b.backupId === id);
      if (!backup || backup.status === 'running') continue;
      this.waitingFor.delete(id);

      if (backup.status === 'failed') {
        this.notify.showError(backup.errorMessage || 'Backup failed.', 'Backup failed');
      } else if (!this.canWriteToFolder && backup.fileAvailable) {
        // No folder (or no access yet): fall back to a normal download.
        this.download(backup);
      }
    }
  }

  /** Copies finished backups (manual or scheduled) into the chosen folder, once each. */
  private async autoSaveToFolder(): Promise<void> {
    if (!this.canWriteToFolder) return;
    const since = new Date(this.folder!.selectedAt).getTime();
    const pending = this.backups.filter(b =>
      b.status === 'completed' && b.fileAvailable && !this.savedIds.has(b.backupId) && !this.busyIds.has(b.backupId) &&
      new Date(b.completedAt ?? b.startedAt).getTime() >= since);

    if (this.isAutoSaving || pending.length === 0) return;
    this.isAutoSaving = true;
    try {
      for (const backup of pending.reverse()) {
        await this.saveToFolder(backup, true);
        if (!this.savedIds.has(backup.backupId)) break; // write failed; don't retry on every poll
      }
    } finally {
      this.isAutoSaving = false;
    }
  }

  private async ensurePermission(): Promise<boolean> {
    if (!this.folder) return false;
    try {
      this.folderPermission = await this.folders.permission(this.folder, true);
    } catch {
      this.folderPermission = 'denied';
    }
    if (this.folderPermission !== 'granted') {
      this.notify.showWarning('Access to the folder was not allowed.');
      return false;
    }
    return true;
  }

  private async fetchFile(backup: DatabaseBackup): Promise<Blob | null> {
    this.busyIds.add(backup.backupId);
    try {
      return await firstValueFrom(this.api.downloadBackup(backup.backupId));
    } catch {
      this.notify.showError('Could not download the backup file from the server.');
      return null;
    } finally {
      this.busyIds.delete(backup.backupId);
    }
  }
}
