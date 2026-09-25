import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AssetType } from '../../../../core/models/assets.models';
import { AssetTypeService } from '../../services/asset-type.service';
import { NotificationService } from '@core/services/notification.service';
import { LoadingService } from '@core/services/loading.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CreateAssetTypeDialogComponent } from './create-asset-type-dialog.component';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-asset-types',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatMenuModule,
    MatChipsModule,
    MatDialogModule,
    MatDividerModule,
    MatPaginatorModule,
    PageHeaderComponent
  ],
  templateUrl: './asset-types.component.html',
  styleUrls: ['./asset-types.component.scss']
})
export class AssetTypesComponent implements OnInit {
  types: AssetType[] = [];
  filteredTypes: AssetType[] = [];
  private allFilteredTypes: AssetType[] = [];

  searchQuery = '';
  displayedColumns = ['name', 'description', 'createdAt', 'actions'];

  // Pagination
  totalCount = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 50];

  private gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
  ];

  private icons = [
    'laptop_mac', 'phone_iphone', 'headset', 'desktop_windows', 'print',
    'router', 'camera', 'keyboard', 'mouse', 'monitor', 'tablet', 'watch',
    'speaker', 'devices', 'memory'
  ];

  constructor(
    private assetTypeService: AssetTypeService,
    private notification: NotificationService,
    private loading: LoadingService,
    private authService: AuthService,
    private dialog: MatDialog
  ) { }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Assets Management', 'Type of Assets', actionKey);
  }

  ngOnInit(): void {
    this.loadTypes();
  }

  private loadTypes(): void {
    this.assetTypeService.getAll$().subscribe({
      next: types => {
        this.types = types;
        this.allFilteredTypes = [...types];
        this.totalCount = types.length;
        this.pageIndex = 0;
        this.applyPagination();
      },
      error: err => console.error('Failed to load asset types', err)
    });
  }

  // =========================
  // PAGINATION
  // =========================
  private applyPagination(): void {
    const start = this.pageIndex * this.pageSize;
    this.filteredTypes = this.allFilteredTypes.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyPagination();
  }

  // ── CREATE / EDIT ──────────────────────────────────────────────
  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateAssetTypeDialogComponent, { width: '500px', data: null });
    dialogRef.afterClosed().subscribe(result => { if (result) this.createType(result); });
  }

  openEditDialog(type: AssetType): void {
    const dialogRef = this.dialog.open(CreateAssetTypeDialogComponent, { width: '500px', data: type });
    dialogRef.afterClosed().subscribe(result => { if (result) this.updateType(result); });
  }

  private createType(data: any): void {
    const { name, description } = data;
    if (!name) return;

    if (this.types.some(t => t.name.toLowerCase() === name.trim().toLowerCase())) {
      this.notification.warning('Asset type with this name already exists');
      return;
    }

    this.loading.show();
    this.assetTypeService.create({ name, description }).subscribe({
      next: type => {
        this.notification.success(`Created asset type "${type.name}"`);
        this.loading.hide();
      },
      error: () => {
        this.notification.error('Failed to create asset type');
        this.loading.hide();
      }
    });
  }

  private updateType(data: any): void {
    const { id, name, description } = data;

    if (!id) {
      this.notification.error('Asset type ID is missing');
      return;
    }

    if (!name) {
      this.notification.error('Asset type name is required');
      return;
    }

    if (this.types.some(t => t.id !== id && t.name.toLowerCase() === name.trim().toLowerCase())) {
      this.notification.warning('Another asset type with this name exists');
      return;
    }

    this.loading.show();
    this.assetTypeService.update({ id, name, description }).subscribe({
      next: (type) => {
        this.types = this.types.map(t => t.id === id ? type : t);
        this.allFilteredTypes = this.allFilteredTypes.map(t => t.id === id ? type : t);
        this.applyPagination();
        this.notification.success(`Updated asset type "${type.name}"`);
        this.loading.hide();
      },
      error: (err) => {
        this.notification.error(err?.message || 'Failed to update asset type');
        this.loading.hide();
      }
    });
  }

  // ── DELETE — same pattern as employee-list ─────────────────────
  delete(item: AssetType): void {
    if (!item?.id) {
      this.notification.error('Asset type ID is missing');
      return;
    }

    const dialogData: ConfirmDeleteData = {
      title: 'Delete Asset Type',
      message: 'Are you sure you want to delete this asset type?',
      itemName: item.name,
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loading.show();
        this.assetTypeService.delete(item.id).subscribe({
          next: () => {
            this.types = this.types.filter(t => t.id !== item.id);
            this.allFilteredTypes = this.allFilteredTypes.filter(t => t.id !== item.id);
            this.totalCount = this.allFilteredTypes.length;
            if (this.pageIndex > 0 && this.pageIndex * this.pageSize >= this.totalCount) {
              this.pageIndex = Math.max(0, this.pageIndex - 1);
            }
            this.applyPagination();
            this.notification.info(`Deleted asset type "${item.name}"`);
            this.loading.hide();
          },
          error: (err) => {
            this.notification.error(err?.message || 'Failed to delete asset type');
            this.loading.hide();
          }
        });
      }
    });
  }

  // ── FILTERS ────────────────────────────────────────────────────
  onSearchChange(eventOrQuery: any): void {
    let value = '';
    if (typeof eventOrQuery === 'string') value = eventOrQuery;
    else if (eventOrQuery?.target) value = eventOrQuery.target.value;
    this.searchQuery = String(value || '').toLowerCase();
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.allFilteredTypes = [...this.types];
    this.totalCount = this.allFilteredTypes.length;
    this.pageIndex = 0;
    this.applyPagination();
  }

  applyFilters(): void {
    this.allFilteredTypes = this.types.filter(t =>
      t.name.toLowerCase().includes(this.searchQuery) ||
      (t.description && t.description.toLowerCase().includes(this.searchQuery))
    );
    this.totalCount = this.allFilteredTypes.length;
    this.pageIndex = 0;
    this.applyPagination();
  }

  // ── CARD STYLING ───────────────────────────────────────────────
  getCardGradient(index: number): string {
    return this.gradients[index % this.gradients.length];
  }

  getAssetIcon(index: number): string {
    return this.icons[index % this.icons.length];
  }
}
