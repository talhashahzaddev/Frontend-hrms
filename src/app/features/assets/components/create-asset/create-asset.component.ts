import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';

import { Asset, AssetType } from '../../../../core/models/assets.models';
import { AssetTypeService } from '../../services/asset-type.service';
import { AssetsService } from '../../services/assets.service';
import { NotificationService } from '@core/services/notification.service';
import { LoadingService } from '@core/services/loading.service';

@Component({
  selector: 'app-create-asset',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatDialogModule
  ],
  templateUrl: './create-asset.component.html',
  styleUrls: ['./create-asset.component.scss']
})
export class CreateAssetComponent implements OnInit {
  @ViewChild('assetDialog') assetDialogTemplate!: TemplateRef<any>;
  @ViewChild('assignDialog') assignDialogTemplate!: TemplateRef<any>;

  form!: FormGroup;
  dialogForm!: FormGroup;
  assignForm!: FormGroup;
  types: AssetType[] = [];
  assets: Asset[] = [];
  filteredAssets: Asset[] = [];
  employees: any[] = [];
  filteredEmployees: any[] = [];
  selectedAsset: any;
  editingAssetId: string | null = null;
  isEditMode = false;

  dialogRef!: MatDialogRef<any>;
  assignDialogRef!: MatDialogRef<any>;

  // Filter properties
  searchQuery = '';
  typeFilter = '';
  statusFilter = '';
  dateFromFilter: Date | null = null;
  dateToFilter: Date | null = null;

  displayedColumns: string[] = ['name', 'type', 'code', 'purchaseDate', 'status', 'actions'];

  constructor(
    private fb: FormBuilder,
    private assetTypeService: AssetTypeService,
    private assetsService: AssetsService,
    private notification: NotificationService,
    private loading: LoadingService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    // DEBUG: Clear old localStorage data to ensure fresh start
    console.log('Clearing assets from localStorage for debugging');
    localStorage.removeItem('assets');
    
    this.loadAssetTypes();
    this.loadAssets();
    // mock employees (used by assign dialog)
    this.employees = [
      { id: '1', firstName: 'John', lastName: 'Doe', email: 'john.doe@company.com' },
      { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@company.com' },
      { id: '3', firstName: 'Mike', lastName: 'Johnson', email: 'mike.johnson@company.com' }
    ];
    this.filteredEmployees = [...this.employees];
  }

  private initializeForms(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      assetTag: ['', [Validators.required, Validators.maxLength(100)]],
      typeId: ['', Validators.required],
      code: ['', Validators.maxLength(50)],
      purchaseDate: [null],
      status: ['', Validators.maxLength(50)],
      notes: ['', Validators.maxLength(1000)]
    });

    this.assignForm = this.fb.group({
      employeeId: ['', Validators.required],
      assignDate: [new Date(), Validators.required],
      returnDate: [null]
    });
    // dialogForm references the same controls as `form` for template compatibility
    this.dialogForm = this.form;
  }

  private loadAssetTypes(): void {
    this.assetTypeService.getAll$().subscribe({
      next: types => this.types = types,
      error: err => console.error('Failed to load asset types', err)
    });
  }

  private loadAssets(): void {
    this.assetsService.getAll$().subscribe({
      next: items => {
        console.log('Loaded assets:', items);
        console.log('First asset structure:', items[0]);
        console.log('First asset id value:', items[0]?.id);
        this.assets = items;
        this.filteredAssets = [...items];
      },
      error: err => console.error('Failed to load assets', err)
    });
  }

  openCreateDialog(): void {
    this.isEditMode = false;
    this.form.reset();
    this.dialogRef = this.dialog.open(this.assetDialogTemplate, { width: '500px' });
  }

  editAsset(asset: any): void {
    this.isEditMode = true;
    this.editingAssetId = asset.id;
    this.form.patchValue(asset);
    this.dialogRef = this.dialog.open(this.assetDialogTemplate, { width: '500px' });
  }

deleteAsset(asset: Asset): void {
  console.log('✅ deleteAsset called');
  console.log('Asset object:', asset);
  console.log('Asset object keys:', asset ? Object.keys(asset) : 'N/A');
  console.log('Asset ID value:', asset?.id);
  console.log('Asset ID type:', typeof asset?.id);
  console.log('Asset ID is empty?', !asset?.id);
  console.log('Asset Name:', asset?.name);

  if (!asset) {
    this.notification.error('No asset selected');
    return;
  }

  if (!asset.id || asset.id.trim() === '') {
    this.notification.error('Asset ID is missing. Please refresh the page and try again.');
    console.error('Missing or empty id in asset:', asset);
    return;
  }

  if (!confirm(`Are you sure you want to delete "${asset.name}"?`)) return;

  this.loading.show();

  this.assetsService.delete(asset.id).subscribe({
    next: (response) => {
      console.log('Delete response:', response);
      this.assets = this.assets.filter(a => a.id !== asset.id);
      this.filteredAssets = this.filteredAssets.filter(a => a.id !== asset.id);

      this.notification.success(`Asset "${asset.name}" deleted successfully`);
      this.loading.hide();
    },
    error: (err) => {
      console.error('Delete error:', err);
      const errorMessage = err?.message || err?.error?.message || 'Failed to delete asset';
      this.notification.error(errorMessage);
      this.loading.hide();
    }
  });
}

  onDialogSubmit(): void {
    if (!this.form.valid) return;

    const formData = { ...this.form.value };
    
    console.log('IsEditMode:', this.isEditMode);
    console.log('EditingAssetId:', this.editingAssetId);
    console.log('Form data before submission:', formData);
    
    // Convert Date to ISO string
    if (formData.purchaseDate instanceof Date) {
      formData.purchaseDate = formData.purchaseDate.toISOString();
    }

    this.loading.show();

    if (this.isEditMode) {
      // For update, ensure we have the ID
      if (!this.editingAssetId) {
        this.notification.error('Asset ID is missing. Cannot update.');
        this.loading.hide();
        return;
      }
      console.log('Updating asset with ID:', this.editingAssetId);
      this.assetsService.update(this.editingAssetId, formData).subscribe({
        next: (response) => {
          console.log('Update response:', response);
          this.notification.success('Asset updated successfully');
          this.dialogRef.close();
          this.form.reset();
          this.editingAssetId = null;
          this.isEditMode = false;
          this.loadAssets();
          this.loading.hide();
        },
        error: err => {
          console.error('Update error:', err);
          const errorMessage = err?.message || err?.error?.message || 'Failed to update asset';
          this.notification.error(errorMessage);
          this.loading.hide();
        }
      });
    } else {
      // For create
      this.assetsService.create(formData).subscribe({
        next: (response) => {
          console.log('Create response:', response);
          this.notification.success('Asset created successfully');
          this.dialogRef.close();
          this.form.reset();
          this.loadAssets();
          this.loading.hide();
        },
        error: err => {
          console.error('Create error:', err);
          const errorMessage = err?.message || err?.error?.message || 'Failed to create asset';
          this.notification.error(errorMessage);
          this.loading.hide();
        }
      });
    }
  }

  onDialogCancel(): void {
    this.dialogRef.close();
  }

  openAssignDialog(asset: any): void {
    this.selectedAsset = asset;
    this.assignForm.reset({ employeeId: '', assignDate: new Date(), returnDate: null });
    this.assignDialogRef = this.dialog.open(this.assignDialogTemplate, { width: '500px' });
  }

  onAssignDialogSubmit(): void {
    if (!this.assignForm.valid) return;

    const data = this.assignForm.value;
    const assignmentData = {
      assetId: this.selectedAsset.id,
      employeeId: data.employeeId,
      assignDate: data.assignDate instanceof Date ? data.assignDate.toISOString() : data.assignDate,
      returnDate: data.returnDate instanceof Date ? data.returnDate.toISOString() : data.returnDate
    };

    console.log('Assignment data:', assignmentData);
    this.notification.success('Asset assigned successfully');
    this.assignDialogRef.close();
  }

  onAssignDialogCancel(): void {
    this.assignDialogRef.close();
  }

  // =========================
  // FILTERS
  // =========================
  onSearchChange(eventOrQuery: any): void {
    let value = '';
    if (typeof eventOrQuery === 'string') value = eventOrQuery;
    else if (eventOrQuery && eventOrQuery.target) value = eventOrQuery.target.value;
    this.searchQuery = String(value || '').toLowerCase();
    this.applyFilters();
  }

  onTypeFilterChange(typeId: string): void {
    this.typeFilter = typeId;
    this.applyFilters();
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  onDateFromChange(date: Date): void {
    this.dateFromFilter = date;
    this.applyFilters();
  }

  onDateToChange(date: Date): void {
    this.dateToFilter = date;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.typeFilter = '';
    this.statusFilter = '';
    this.dateFromFilter = null;
    this.dateToFilter = null;
    this.filteredAssets = [...this.assets];
  }

  applyFilters(): void {
    this.filteredAssets = this.assets.filter(asset => {
      if (this.searchQuery) {
        const q = this.searchQuery;
        if (!(
          asset.name.toLowerCase().includes(q) ||
          asset.code?.toLowerCase().includes(q) ||
          asset.typeName?.toLowerCase().includes(q) ||
          asset.status?.toLowerCase().includes(q)
        )) return false;
      }
      if (this.typeFilter && asset.id !== this.typeFilter) return false;
      if (this.statusFilter && asset.status !== this.statusFilter) return false;
      if (this.dateFromFilter && asset.purchaseDate && new Date(asset.purchaseDate) < this.dateFromFilter) return false;
      if (this.dateToFilter && asset.purchaseDate && new Date(asset.purchaseDate) > this.dateToFilter) return false;
      return true;
    });
  }
}
