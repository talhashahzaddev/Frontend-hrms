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
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AssetType } from '../../../../core/models/assets.models';
import { AssetTypeService } from '../../services/asset-type.service';
import { NotificationService } from '@core/services/notification.service';
import { LoadingService } from '@core/services/loading.service';
import { CreateAssetTypeDialogComponent } from './create-asset-type-dialog.component';

@Component({
  selector: 'app-asset-types',
  standalone: true,
  imports: [
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
    MatDialogModule
  ],
  templateUrl: './asset-types.component.html',
  styleUrls: ['./asset-types.component.scss']
})
export class AssetTypesComponent implements OnInit {
  types: AssetType[] = [];
  filteredTypes: AssetType[] = [];
  searchQuery = '';
  displayedColumns = ['name', 'description', 'createdAt', 'actions'];

  // Card styling
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
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadTypes();
  }

  private loadTypes(): void {
    this.assetTypeService.getAll$().subscribe({
      next: types => {
        this.types = types;
        this.filteredTypes = [...types];
      },
      error: err => console.error('Failed to load asset types', err)
    });
  }

  // =====================
  // CREATE / EDIT DIALOG
  // =====================
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
    
    // Validate required fields
    if (!id) {
      this.notification.error('Asset type ID is missing');
      console.error('Missing ID in updateType:', data);
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
        console.log('Update successful:', type);
        // Update local arrays with the updated item
        this.types = this.types.map(t => t.id === id ? type : t);
        this.filteredTypes = this.filteredTypes.map(t => t.id === id ? type : t);
        
        this.notification.success(`Updated asset type "${type.name}"`);
        this.loading.hide();
      },
      error: (err) => {
        console.error('Update error:', err);
        this.notification.error(err?.message || 'Failed to update asset type');
        this.loading.hide();
      }
    });
  }

  // deleteType(type: string): void {
 
  //   this.loading.show();
  //   this.assetTypeService.delete(type.id).subscribe({
  //     next: () => {
  //       this.notification.info(`Deleted asset type "${type.name}"`);
  //       this.loading.hide();
  //     },
  //     error: () => {
  //       this.notification.error('Failed to delete asset type');
  //       this.loading.hide();
  //     }
  //   });
  // }

  // template compatibility: provide `delete` alias used in templates
  // delete(type: AssetType): void {
  //   this.deleteType(type);
  // }
// ✅ This method is now called 'delete' to match template
  delete(item: AssetType): void {
    // Debug: log the item to see what properties it has
    console.log('Delete item:', item);
    console.log('Item ID:', item?.id);
    console.log('Item Name:', item?.name);
    
    // Validate item has required properties
    if (!item) {
      this.notification.error('No asset type selected');
      return;
    }
    
    if (!item.id) {
      this.notification.error('Asset type ID is missing');
      console.error('Missing ID in item:', item);
      return;
    }
    
    if (!item.name) {
      this.notification.error('Asset type name is missing');
      console.error('Missing name in item:', item);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    this.loading.show();
    this.assetTypeService.delete(item.id).subscribe({
      next: () => {
        // Remove from local arrays immediately
        this.types = this.types.filter(t => t.id !== item.id);
        this.filteredTypes = this.filteredTypes.filter(t => t.id !== item.id);
        
        this.notification.info(`Deleted asset type "${item.name}"`);
        this.loading.hide();
      },
      error: (err) => {
        console.error('Delete error:', err);
        this.notification.error(err?.message || 'Failed to delete asset type');
        this.loading.hide();
      }
    });
  }





  
  // =====================
  // FILTERS
  // =====================
  onSearchChange(eventOrQuery: any): void {
    let value = '';
    if (typeof eventOrQuery === 'string') value = eventOrQuery;
    else if (eventOrQuery && eventOrQuery.target) value = eventOrQuery.target.value;
    this.searchQuery = String(value || '').toLowerCase();
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filteredTypes = [...this.types];
  }

  applyFilters(): void {
    this.filteredTypes = this.types.filter(t =>
      t.name.toLowerCase().includes(this.searchQuery) ||
      (t.description && t.description.toLowerCase().includes(this.searchQuery))
    );
  }

  // =====================
  // CARD STYLING
  // =====================
  getCardGradient(index: number): string {
    return this.gradients[index % this.gradients.length];
  }

  getAssetIcon(index: number): string {
    return this.icons[index % this.icons.length];
  }
}
