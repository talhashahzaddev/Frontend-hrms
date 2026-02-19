import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AssetType, CreateAssetTypeRequest, UpdateAssetTypeRequest } from '../../../core/models/assets.models';


export interface ServiceResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
@Injectable({
  providedIn: 'root'
})



export class AssetTypeService {
  private readonly apiUrl = `${environment.apiUrl}/Assets/asset-types`;
  private readonly storageKey = 'asset_types';
  private subject = new BehaviorSubject<AssetType[]>(this.readFromStorage());
  public assetTypes$ = this.subject.asObservable();

  constructor(private http: HttpClient) {
    this.syncFromServer();
  }

  // =========================
  // GET
  // =========================
  getAll(): AssetType[] {
    return this.subject.value;
  }

  getAll$(): Observable<AssetType[]> {
    return this.assetTypes$;
  }

  getById(id: string): AssetType | undefined {
    return this.subject.value.find(t => t.id === id);
  }

  getFromServer(): Observable<AssetType[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((resp: any) => {
        const items = resp?.data || [];
        // Map API response to AssetType interface
        return items.map((item: any) => this.mapToAssetType(item));
      }),
      tap(items => {
        console.log('Mapped items from server:', items);
        this.writeToStorage(items);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Failed to fetch asset types from server', error);
        return of(this.subject.value); // fallback to local storage
      })
    );
  }

  // Helper method to map API response to AssetType
  private mapToAssetType(item: any): AssetType {
    return {
      id: item.id || item.assetTypeId || item.typeId || '',
      name: item.name || '',
      description: item.description,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt
    };
  }

  // =========================
  // CREATE
  // =========================
  create(payload: CreateAssetTypeRequest): Observable<AssetType> {
    const now = new Date().toISOString();
    const newType: AssetType = {
      id: this.generateId(),
      name: payload.name.trim(),
      description: payload.description?.trim(),
      createdAt: now
    };

    return this.http.post<any>(this.apiUrl, newType).pipe(
      map((resp: any) => {
        const data = resp?.data || resp;
        console.log('Create response:', data);
        return this.mapToAssetType(data);
      }),
      tap(assetType => this.addToLocal(assetType)),
      catchError((error: HttpErrorResponse) => {
        console.error('Failed to create asset type', error);
        return throwError(() => new Error(error.error?.message || 'Failed to create asset type'));
      })
    );
  }

  // =========================
  // UPDATE
  // =========================
  update(payload: UpdateAssetTypeRequest): Observable<AssetType> {
    return this.http.put<any>(`${this.apiUrl}/${payload.id}`, payload).pipe(
      map((resp: any) => {
        const data = resp?.data || resp;
        console.log('Update response:', data);
        return this.mapToAssetType(data);
      }),
      tap(assetType => this.updateLocal(payload.id, assetType)),
      catchError((error: HttpErrorResponse) => {
        console.error('Failed to update asset type', error);
        return throwError(() => new Error(error.error?.message || 'Failed to update asset type'));
      })
    );
  }

  // =========================
  // DELETE
  // =========================
  // delete(id: string): Observable<void> {
  //   return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
  //     map((resp: any) => {
  //       // Handle 204 No Content or empty response (both are valid success cases)
  //       if (resp && resp.success === false) {
  //         throw new Error(resp?.message || 'Failed to delete asset type');
  //       }
  //       return undefined;
  //     }),
  //     tap(() => this.removeFromLocal(id)),
  //     catchError((error: HttpErrorResponse) => {
  //       console.error('Failed to delete asset type', error);
  //       return throwError(() => new Error(error.error?.message || 'Failed to delete asset type'));
  //     })
  //   );
  // }

  delete(id: string): Observable<boolean> {
  return this.http
    .delete<ServiceResponse<boolean>>(`${this.apiUrl}/${id}`)
    .pipe(
      map(resp => {
        if (!resp.success) {
          throw new Error(resp.message || 'Delete failed');
        }
        return true;
      }),
      tap(() => this.removeFromLocal(id)),
      catchError((error: HttpErrorResponse) => {
        console.error('Delete failed', error);
        return throwError(() =>
          new Error(error.error?.message || 'Delete failed')
        );
      })
    );
}
  // =========================
  // LOCAL STORAGE HELPERS
  // =========================
  private readFromStorage(): AssetType[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private writeToStorage(items: AssetType[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
    this.subject.next(items);
  }

  private addToLocal(item: AssetType): void {
    const next = [...this.subject.value, item];
    this.writeToStorage(next);
  }

  private updateLocal(id: string, updated: AssetType): void {
    const next = this.subject.value.map(t => t.id === id ? updated : t);
    this.writeToStorage(next);
  }

  private removeFromLocal(id: string): void {
    const next = this.subject.value.filter(t => t.id !== id);
    this.writeToStorage(next);
  }

  // =========================
  // SERVER SYNC
  // =========================
  private syncFromServer(): void {
    this.getFromServer().subscribe();
  }

  // =========================
  // UTILITIES
  // =========================
  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
