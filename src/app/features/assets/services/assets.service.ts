import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Asset, CreateAssetRequest } from '../../../core/models/assets.models';
import { AssetTypeService } from './asset-type.service';

export interface ServiceResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
@Injectable({
  providedIn: 'root'
})
export class AssetsService {
  private readonly apiUrl = `${environment.apiUrl}/Assets`;
  private readonly storageKey = 'assets';
  private assetsSubject = new BehaviorSubject<Asset[]>(this.readFromStorage());
  public assets$ = this.assetsSubject.asObservable();

  constructor(private http: HttpClient, private assetTypeService: AssetTypeService) {
    this.syncFromServer();
  }

  // =========================
  // GET
  // =========================
  getAll(): Asset[] {
    return this.assetsSubject.value;
  }

  getAll$(): Observable<Asset[]> {
    return this.assets$;
  }

  getById(assetId: string): Asset | undefined {
    return this.assetsSubject.value.find(a => a.id === assetId);
  }

  getFromServer(): Observable<Asset[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((resp: any) => {
        console.log('🔍 Raw API response:', resp);
        
        // Try multiple ways to extract data from response
        let items = [];
        if (Array.isArray(resp)) {
          // Response is directly an array
          items = resp;
        } else if (resp?.data && Array.isArray(resp.data)) {
          // Response has data property
          items = resp.data;
        } else if (resp?.result && Array.isArray(resp.result)) {
          // Response has result property
          items = resp.result;
        } else if (resp?.items && Array.isArray(resp.items)) {
          // Response has items property
          items = resp.items;
        } else {
          // Fallback - try to extract any array from the response
          console.warn('Could not find array in response. Response keys:', Object.keys(resp));
          items = [];
        }
        
        console.log('📦 Extracted items array:', items);
        // Map API response to Asset interface with proper type name lookup
        return items.map((item: any) => this.mapToAsset(item));
      }),
      tap(items => {
        console.log('✅ Mapped assets from server:', items);
        this.writeToStorage(items);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Failed to fetch assets from server', error);
        return of(this.assetsSubject.value); // fallback to local storage
      })
    );
  }

  // Helper method to map API response to Asset
  private mapToAsset(item: any): Asset {
    console.log('mapToAsset - incoming item:', item);
    console.log('mapToAsset - item keys:', Object.keys(item));
    
    const typeId = item.typeId || item.TypeId || item.typeID || '';
    const type = typeId ? this.assetTypeService.getById(typeId) : null;
    
    // Try multiple field name variations for ID
    const assetId = item.id || item.Id || item.ID || item.assetId || item.AssetId || item.assetID || '';
    if (!assetId) {
      console.warn('Asset ID is missing from backend response. Item:', item);
    }
    
    return {
      id: assetId,
      name: item.name || item.Name || '',
      code: item.code || item.Code,
      assetTypeId: typeId,
      typeName: item.typeName || item.TypeName || type?.name,
      purchaseDate: item.purchaseDate || item.PurchaseDate,
      status: item.status || item.Status,
      notes: item.notes || item.Notes,
      createdAt: item.createdAt || item.CreatedAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.UpdatedAt
    };
  }

  // =========================
  // CREATE
  // =========================
  create(payload: CreateAssetRequest): Observable<Asset> {
    // Only send fields that backend expects - NO id, typeName, or createdAt
    const requestData: CreateAssetRequest = {
      name: payload.name.trim(),
      assetTag: payload.assetTag.trim(),
      code: payload.code?.trim(),
      typeId: payload.typeId,
      purchaseDate: payload.purchaseDate,
      status: payload.status?.trim(), 
      notes: payload.notes?.trim()
    };

    console.log('Sending create request to backend:', requestData);

    return this.http.post<any>(this.apiUrl, requestData).pipe(
      map((resp: any) => {
        const data = resp?.data || resp;
        console.log('Create response from backend:', data);
        return this.mapToAsset(data);
      }),
      tap(asset => {
        console.log('Asset mapped locally:', asset);
        this.addToLocal(asset);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Failed to create asset', error);
        const errorMsg = error.error?.message || error.error?.errors?.[0] || 'Failed to create asset';
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  // =========================
  // UPDATE
  // =========================
  update(assetId: string, payload: any): Observable<Asset> {
    if (!assetId) {
      return throwError(() => new Error('Asset ID is required for update'));
    }

    // Build update request with only fields backend expects
    const updateData: any = {};
    
    console.log('📤 Update payload received:', payload);
    console.log('📤 Update URL will be:', `${this.apiUrl}/${assetId}`);
    
    if (payload.name) updateData.name = payload.name.trim();
    if (payload.assetTag !== undefined) updateData.assetTag = payload.assetTag?.trim();
    if (payload.code !== undefined) updateData.code = payload.code?.trim();
    // Handle both typeId (from form) and assetTypeId (from Asset interface)
    if (payload.typeId) updateData.typeId = payload.typeId;
    if (payload.assetTypeId) updateData.typeId = payload.assetTypeId;
    if (payload.purchaseDate !== undefined) updateData.purchaseDate = payload.purchaseDate;
    if (payload.status !== undefined) updateData.status = payload.status?.trim();
    if (payload.notes !== undefined) updateData.notes = payload.notes?.trim();

    console.log('✅ Sending update request for asset ID:', assetId);
    console.log('✅ Update data:', updateData);

    return this.http.put<any>(`${this.apiUrl}/${assetId}`, updateData).pipe(
      map((resp: any) => {
        console.log('✅ Update response received:', resp);
        const data = resp?.data || resp;
        console.log('Update response data:', data);
        return this.mapToAsset(data);
      }),
      tap(asset => {
        console.log('✅ Asset mapped locally after update:', asset);
        this.updateLocal(assetId, asset);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Failed to update asset', error);
        let errorMsg = 'Failed to update asset';
        if (error.status === 404) {
          errorMsg = 'Asset not found';
        } else if (error.status === 400) {
          errorMsg = error.error?.message || 'Invalid asset data';
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        } else if (error.error?.errors?.[0]) {
          errorMsg = error.error.errors[0];
        }
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  // =========================
  // DELETE
  // =========================
  // DELETE
  // =========================
  delete(assetId: string): Observable<boolean> {
    if (!assetId) {
      return throwError(() => new Error('Asset ID is required'));
    }

    console.log(`Attempting to delete asset with ID: ${assetId}`);
    const deleteUrl = `${this.apiUrl}/${assetId}`;
    console.log(`Delete URL: ${deleteUrl}`);

    return this.http
      .delete<ServiceResponse<boolean>>(deleteUrl)
      .pipe(
        map(resp => {
          if (!resp.success) {
            throw new Error(resp.message || 'Delete failed');
          }
          console.log('Asset deleted successfully from server');
          return true;
        }),
        tap(() => {
          this.removeFromLocal(assetId);
          console.log('Asset removed from local storage');
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Delete failed with status:', error.status, 'Error:', error);
          let errorMessage = 'Failed to delete asset';

          if (error.status === 405) {
            errorMessage = 'Invalid asset ID format or endpoint not found. Please ensure the asset ID is a valid GUID.';
          } else if (error.status === 403 || error.status === 401) {
            errorMessage = 'You do not have permission to delete this asset';
          } else if (error.status === 404) {
            errorMessage = 'Asset not found';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }

          return throwError(() => new Error(errorMessage));
        })
      );
  }

  // =========================
  // LOCAL STORAGE HELPERS
  // =========================
  private readFromStorage(): Asset[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private writeToStorage(items: Asset[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
    this.assetsSubject.next(items);
  }

  private addToLocal(asset: Asset): void {
    const next = [...this.assetsSubject.value, asset];
    this.writeToStorage(next);
  }

  private updateLocal(assetId: string, updated: Asset): void {
    const next = this.assetsSubject.value.map(a => a.id === assetId ? updated : a);
    this.writeToStorage(next);
  }

  private removeFromLocal(assetId: string): void {
    const next = this.assetsSubject.value.filter(a => a.id !== assetId);
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
