import { Component, OnInit, ViewChild, TemplateRef, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; 
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RouterModule } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';

import { Asset, AssetType } from '../../../../core/models/assets.models';
import { AssetTypeService } from '../../services/asset-type.service';
import { AssetsService } from '../../services/assets.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { EmployeeSearchRequest } from '../../../../core/models/employee.models';
import { NotificationService } from '@core/services/notification.service';
import { LoadingService } from '@core/services/loading.service';
import { AuthService } from '../../../../core/services/auth.service';

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
    MatDialogModule,
    MatMenuModule,
    MatDividerModule,
    MatChipsModule,
    MatPaginatorModule,
    MatAutocompleteModule
  ],
  templateUrl: './create-asset.component.html',
  styleUrls: ['./create-asset.component.scss']
})
export class CreateAssetComponent implements OnInit, OnDestroy {
  @ViewChild('assetDialog') assetDialogTemplate!: TemplateRef<any>;
  @ViewChild('assignDialog') assignDialogTemplate!: TemplateRef<any>;
  @ViewChild('historyDialog') historyDialogTemplate!: TemplateRef<any>;
  @ViewChild('viewDialog') viewDialogTemplate!: TemplateRef<any>;
  @ViewChild('returnDialog') returnDialogTemplate!: TemplateRef<any>;

  form!: FormGroup;
  dialogForm!: FormGroup;
  assignForm!: FormGroup;
  returnForm!: FormGroup;
  types: AssetType[] = [];
  assets: Asset[] = [];
  filteredAssets: Asset[] = [];
  private allFilteredAssets: Asset[] = [];

  employees: any[] = [];
  filteredEmployees: any[] = [];
  filteredEmployees$!: Observable<any[]>;
  employeeSearchControl = new FormControl('');
  
  // Employee dropdown state (custom, non-Observable pattern)
  employeeDropdownOpen = false;
  employeeFilter = '';
  selectedEmployeeId: string | null = null;
  
  selectedAsset: any;
  selectedAssignment: any;
  editingAssetId: string | null = null;
  isEditMode = false;
  private destroy$ = new Subject<void>();

  dialogRef!: MatDialogRef<any>;
  assignDialogRef!: MatDialogRef<any>;
  historyDialogRef!: MatDialogRef<any>;
  viewDialogRef!: MatDialogRef<any>;
  returnDialogRef!: MatDialogRef<any>;

  // Filter properties
  searchQuery = '';
  typeFilter = '';
  statusFilter = '';
  dateFromFilter: Date | null = null;
  dateToFilter: Date | null = null;

  // Pagination
  totalCount = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 50];

  // Status dropdown options
  statusOptions = [
    { value: 'Available', label: 'Available' },
    { value: 'Assigned', label: 'Assigned' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Retired', label: 'Retired' }
  ];

  // Condition dropdown options
  conditionOptions = [
    { value: 'Good', label: 'Good' },
    { value: 'Fair', label: 'Fair' },
    { value: 'Poor', label: 'Poor' },
    { value: 'Damaged', label: 'Damaged' }
  ];

  displayedColumns: string[] = ['name', 'type', 'code', 'purchaseDate', 'status', 'assignedTo', 'actions'];

  constructor(
    private fb: FormBuilder,
    private assetTypeService: AssetTypeService,
    private assetsService: AssetsService,
    private employeeService: EmployeeService,
    private notification: NotificationService,
    private loading: LoadingService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Assets Management', 'Assets', actionKey);
  }

  // Auto-close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.employee-dropdown-container')) {
      this.employeeDropdownOpen = false;
    }
  }

  ngOnInit(): void {
    this.initializeForms();
    this.loadAssetTypes();
    this.loadAssets();
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      code: ['', [Validators.maxLength(100)]],
      assetTag: ['', [Validators.required, Validators.maxLength(100)]],
      typeId: ['', Validators.required],
      purchaseDate: [null],
      status: ['', Validators.maxLength(50)],
      notes: ['', Validators.maxLength(1000)]
    });

    this.assignForm = this.fb.group({
      employeeId: ['', Validators.required],
      assignDate: [new Date(), Validators.required],
      returnDate: [null],
      condition: ['Good', Validators.required]
    });
    // dialogForm references the same controls as `form` for template compatibility
    this.dialogForm = this.form;

    this.returnForm = this.fb.group({
      condition: ['Good']
    });
  }


  getAssignedToDisplay(asset: any): string {
    if (!asset) return 'Not Assigned';
    
    // Try different property name variations from backend
    const employeeName = asset.employeeName || asset.EmployeeName || asset.assignedEmployeeName || asset.currentAssigneeName;
    const employeeEmail = asset.employeeEmail || asset.EmployeeEmail || asset.assignedEmployeeEmail || asset.assigneeEmail;
    
    // If we have both name and email, display as "Name (Email)"
    if (employeeName && employeeEmail) {
      return `${employeeName} (${employeeEmail})`;
    }
    
    // If only name, display name
    if (employeeName) {
      return employeeName;
    }
    
    // If only email, display email
    if (employeeEmail) {
      return employeeEmail;
    }
    
    // Fallback: check for employeeId
    const employeeId = asset.assignedEmployeeId || asset.assignedToId || asset.employeeId || asset.EmployeeId;
    if (employeeId) {
      return employeeId;
    }
    
    return 'Not Assigned';
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
        this.assets = items;
        this.allFilteredAssets = [...items];
        this.totalCount = items.length;
        this.pageIndex = 0;
        this.applyPagination();
        
        // Fetch current assignment for each asset to populate "Assigned To" column
        items.forEach((asset: any) => {
          this.assetsService.getCurrentAssignment(asset.id).subscribe(
            assignment => {
              if (assignment) {
                // Merge assignment data into asset for display
                asset.employeeName = assignment.employeeName || assignment.EmployeeName;
                asset.employeeEmail = assignment.employeeEmail || assignment.EmployeeEmail;
                asset.assignedEmployeeId = assignment.employeeId || assignment.EmployeeId;
              } else {
                asset.employeeName = null;
                asset.employeeEmail = null;
                asset.assignedEmployeeId = null;
              }
            },
            error => {
              console.warn('Could not load assignment for asset', asset.id, error);
              asset.employeeName = null;
              asset.employeeEmail = null;
              asset.assignedEmployeeId = null;
            }
          );
        });
      },
      error: err => console.error('Failed to load assets', err)
    });
  }

  private loadEmployees(): void {
    const searchRequest: EmployeeSearchRequest = {
      searchTerm: undefined,
      page: 1,
      pageSize: 1000, // Load all employees for the dropdown
      sortBy: 'firstName',
      sortDirection: 'asc'
    };

    this.employeeService.getEmployees(searchRequest).subscribe({
      next: (response) => {
        console.log('✅ Loaded employees from backend:', response.employees);
        this.employees = response.employees;
        this.filteredEmployees = [...response.employees];
      },
      error: err => {
        console.error('❌ Failed to load employees from backend', err);
        this.employees = [];
        this.filteredEmployees = [];
      }
    });
  }

  filterEmployees(searchTerm: string): void {
    if (!searchTerm) {
      this.filteredEmployees = [...this.employees];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredEmployees = this.employees.filter(employee =>
        employee.firstName?.toLowerCase().includes(term) ||
        employee.lastName?.toLowerCase().includes(term) ||
        employee.email?.toLowerCase().includes(term)
      );
    }
  }

  displayEmployee(employeeId: string): string {
    if (!employeeId) return '';
    const employee = this.employees.find(emp => emp.employeeId === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName} — ${employee.email}` : '';
  }

  // =========================
  // PAGINATION
  // =========================
  private applyPagination(): void {
    const start = this.pageIndex * this.pageSize;
    this.filteredAssets = this.allFilteredAssets.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyPagination();
  }

  openCreateDialog(): void {
    this.isEditMode = false;
    this.form.reset();
    this.dialogRef = this.dialog.open(this.assetDialogTemplate, { width: '500px' });
  }

  editAsset(asset: any): void {
    if (!asset || !asset.id) {
      this.notification.error('Asset information is missing');
      return;
    }

    this.isEditMode = true;
    this.editingAssetId = asset.id;
    
    console.log('📝 Loading asset for edit from table:', asset);
    console.log('Asset ID:', asset.id);
    console.log('Asset from table - assetTypeId:', asset.assetTypeId);
    console.log('Asset from table - typeId:', asset.typeId);
    console.log('Asset from table properties:', Object.keys(asset));
    
    // Get the complete asset from the service (may have more complete data than table item)
    const fullAsset = this.assetsService.getById(asset.id) || asset;
    
    console.log('📝 Full asset from service:', fullAsset);
    console.log('Full asset - assetTypeId:', fullAsset?.assetTypeId);
    console.log('Full asset - typeId:', fullAsset?.typeId);
    
    // Map asset properties to form field names (handle property name mismatches)
    // assetTypeId in Asset maps to typeId in form
    const formData = {
      name: fullAsset.name || '',
      assetTag: fullAsset.assetTag || fullAsset.code || '', // Handle both assetTag and code from backend
      code: fullAsset.code || '',
      typeId: fullAsset.assetTypeId || fullAsset.typeId || '',
      purchaseDate: fullAsset.purchaseDate ? new Date(fullAsset.purchaseDate) : null,
      status: fullAsset.status || '',
      notes: fullAsset.notes || ''
    };
    
    console.log('✅ Patching form with mapped data:', formData);
    this.form.patchValue(formData);
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

    const dialogData: ConfirmDeleteData = {
      title: 'Delete Asset',
      message: 'Are you sure you want to delete this asset?',
      itemName: asset.name,
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
        this.assetsService.delete(asset.id).subscribe({
          next: (response) => {
            console.log('Delete response:', response);
            this.assets = this.assets.filter(a => a.id !== asset.id);
            this.allFilteredAssets = this.allFilteredAssets.filter(a => a.id !== asset.id);
            this.totalCount = this.allFilteredAssets.length;
            if (this.pageIndex > 0 && this.pageIndex * this.pageSize >= this.totalCount) {
              this.pageIndex = Math.max(0, this.pageIndex - 1);
            }
            this.applyPagination();
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
    console.log('🔍 Opening assign dialog for asset:', asset);
    console.log('Asset ID:', asset?.id);
    console.log('Asset name:', asset?.name);
    
    if (!asset || !asset.id) {
      this.notification.error('Asset information is missing. Please refresh and try again.');
      console.error('❌ Invalid asset object:', asset);
      return;
    }
    
    this.selectedAsset = asset;
    this.assignForm.reset({ employeeId: '', assignDate: new Date(), returnDate: null, condition: 'Good' });
    this.employeeSearchControl.reset('');
    
    // Reset employee dropdown state - keep it CLOSED when dialog opens
    this.employeeDropdownOpen = false;
    this.employeeFilter = '';
    this.selectedEmployeeId = null;
    
    // Set up the autocomplete filtered employees Observable
    this.filteredEmployees$ = this.employeeSearchControl.valueChanges.pipe(
      startWith(''),
      map(searchTerm => this.filterEmployeesBySearchTerm(searchTerm)),
      takeUntil(this.destroy$)
    );
    
    this.assignDialogRef = this.dialog.open(this.assignDialogTemplate, { width: '500px' });
  }

  private filterEmployeesBySearchTerm(searchTerm: string | null | any): any[] {
    if (!searchTerm) {
      return [...this.employees];
    }
    
    // If the value is an object (employee was selected), return all employees
    if (typeof searchTerm === 'object') {
      return [...this.employees];
    }
    
    const term = (searchTerm || '').toString().toLowerCase();
    return this.employees.filter(employee =>
      employee.firstName?.toLowerCase().includes(term) ||
      employee.lastName?.toLowerCase().includes(term) ||
      employee.email?.toLowerCase().includes(term)
    );
  }

  // ===== EMPLOYEE DROPDOWN METHODS (Custom State-Driven Pattern) =====
  
  openEmployeeDropdown(): void {
    this.employeeDropdownOpen = true;
    this.employeeFilter = '';
    this.applyEmployeeFilter();
  }

  onEmployeeSearch(searchTerm: string): void {
    this.employeeFilter = searchTerm;
    this.applyEmployeeFilter();
  }

  private applyEmployeeFilter(): void {
    if (!this.employeeFilter) {
      this.filteredEmployees = [...this.employees];
      return;
    }
    const term = this.employeeFilter.toLowerCase();
    this.filteredEmployees = this.employees.filter(employee =>
      (employee.firstName || '').toLowerCase().includes(term) ||
      (employee.lastName || '').toLowerCase().includes(term) ||
      (employee.email || '').toLowerCase().includes(term)
    );
  }

  toggleEmployee(employee: any): void {
    if (!employee || !employee.employeeId) return;
    if (this.selectedEmployeeId === employee.employeeId) {
      this.selectedEmployeeId = null;
      this.assignForm.patchValue({ employeeId: '' });
    } else {
      this.selectedEmployeeId = employee.employeeId;
      this.assignForm.patchValue({ employeeId: employee.employeeId });
    }
  }

  isEmployeeSelected(employeeId: string): boolean {
    return this.selectedEmployeeId === employeeId;
  }

  displaySelectedEmployee(): string {
    if (!this.selectedEmployeeId) return '';
    const employee = this.employees.find(emp => emp.employeeId === this.selectedEmployeeId);
    if (!employee) return '';
    return `${employee.firstName} ${employee.lastName} — ${employee.email}`;
  }

  displayEmployeeInAutocomplete(employee: any): string {
    if (!employee) return '';
    return `${employee.firstName} ${employee.lastName} — ${employee.email}`;
  }

  onEmployeeSelected(employee: any): void {
    if (employee && employee.employeeId) {
      this.assignForm.patchValue({
        employeeId: employee.employeeId
      });
      console.log('Selected employee ID:', employee.employeeId);
    }
  }

  openHistoryDialog(asset: any): void {
    if (!asset) return;
    this.selectedAsset = asset;
    // load assignment history from server
    if (asset.id) {
      this.assetsService.getAssignmentHistory(asset.id).subscribe(history => {
        this.selectedAsset.assignmentHistory = history || [];
        this.historyDialogRef = this.dialog.open(this.historyDialogTemplate, { width: '600px' });
      }, err => {
        console.error('Failed to load history', err);
        this.selectedAsset.assignmentHistory = [];
        this.historyDialogRef = this.dialog.open(this.historyDialogTemplate, { width: '600px' });
      });
    } else {
      this.selectedAsset.assignmentHistory = [];
      this.historyDialogRef = this.dialog.open(this.historyDialogTemplate, { width: '600px' });
    }
  }

  openViewDialog(asset: any): void {
    if (!asset) return;
    this.selectedAsset = asset;
    this.viewDialogRef = this.dialog.open(this.viewDialogTemplate, { width: '600px' });
  }

  openReturnDialog(asset: any): void {
    if (!asset) return;
    this.selectedAsset = asset;
    this.returnForm.reset({ condition: 'Good' });
    this.selectedAssignment = null;
    if (asset.id) {
      this.assetsService.getAssignmentHistory(asset.id).subscribe(history => {
        this.selectedAsset.assignmentHistory = history || [];
        // find active assignment (not returned)
        const active = (history || []).find((h: any) => !h.returnedAt && (h.status === 'Active' || h.status === 'Assigned' || h.status === 'Overdue'))
                    || (history || [])[0];
        this.selectedAssignment = active || null;
        this.returnDialogRef = this.dialog.open(this.returnDialogTemplate, { width: '480px' });
      }, err => {
        console.error('Failed to load assignment history for return', err);
        this.returnDialogRef = this.dialog.open(this.returnDialogTemplate, { width: '480px' });
      });
    } else {
      this.returnDialogRef = this.dialog.open(this.returnDialogTemplate, { width: '480px' });
    }
  }

  onReturnDialogSubmit(): void {
    if (!this.selectedAsset?.id) {
      this.notification.error('Asset information is missing');
      return;
    }
    if (!this.returnForm.valid) {
      this.notification.error('Please select an asset condition');
      return;
    }
    const condition = this.returnForm.value.condition;
    // Determine assignment id
    const assignmentId = this.selectedAssignment?.assignmentId || this.selectedAssignment?.AssignmentId || this.selectedAssignment?.AssignmentId || this.selectedAssignment?.assignmentId || this.selectedAssignment?.AssignmentId;
    if (!assignmentId) {
      this.notification.error('No active assignment found for this asset');
      return;
    }

    this.loading.show();
    const returnedDate = new Date().toISOString();
    const notes = this.selectedAsset.notes || ''; // Keep original notes, don't modify

    this.assetsService.returnAsset(assignmentId, returnedDate, notes, condition).subscribe({
      next: (resp) => {
        this.notification.success('Asset returned successfully');
        this.returnDialogRef.close();
        this.loading.hide();
        this.loadAssets();
      },
      error: (err) => {
        this.notification.error(err?.message || 'Failed to return asset');
        this.loading.hide();
      }
    });
  }

  onAssignDialogSubmit(): void {
    console.log('====== ASSIGN ASSET DIALOG SUBMIT ======');
    console.log('Form valid:', this.assignForm.valid);

    if (!this.assignForm.valid) {
      this.notification.error('Please fill in all required fields');
      return;
    }

    const formData = this.assignForm.value;

    // Validate asset
    if (!this.selectedAsset?.id) {
      this.notification.error('Asset information is missing');
      return;
    }

    // Validate employee
    if (!formData.employeeId) {
      this.notification.error('Please select an employee');
      return;
    }

    // Format dates
    const assignDate = formData.assignDate instanceof Date 
      ? formData.assignDate.toISOString() 
      : formData.assignDate;
    
    const returnDate = formData.returnDate 
      ? (formData.returnDate instanceof Date 
          ? formData.returnDate.toISOString() 
          : formData.returnDate)
      : null;

    console.log('✅ Validation passed');
    console.log('Asset ID:', this.selectedAsset.id);
    console.log('Employee ID:', formData.employeeId);
    console.log('Assign Date:', assignDate);
    console.log('Return Date:', returnDate);
    console.log('====== END VALIDATION ======');

    this.loading.show();

    const condition = formData.condition;
    this.assetsService.assignAsset(
      this.selectedAsset.id,
      formData.employeeId,
      assignDate,
      returnDate,
      condition
    ).subscribe({
      next: (response) => {
        console.log('✅ BACKEND RESPONSE SUCCESS:', response);
        this.notification.success('Asset assigned successfully');
        this.assignDialogRef.close();
        this.assignForm.reset();
        this.loading.hide();
        // Optional: reload assets to show updated status
        this.loadAssets();
      },
      error: (err) => {
        console.error('❌ BACKEND RESPONSE ERROR:', err);
        this.notification.error(err?.message || 'Failed to assign asset');
        this.loading.hide();
      }
    });
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
    this.allFilteredAssets = [...this.assets];
    this.totalCount = this.allFilteredAssets.length;
    this.pageIndex = 0;
    this.applyPagination();
  }

  applyFilters(): void {
    this.allFilteredAssets = this.assets.filter(asset => {
      if (this.searchQuery) {
        const q = this.searchQuery;
        if (!(
          asset.name.toLowerCase().includes(q) ||
          asset.code?.toLowerCase().includes(q) ||
          asset.typeName?.toLowerCase().includes(q) ||
          asset.status?.toLowerCase().includes(q)
        )) return false;
      }
      // Fixed: Compare assetTypeId with typeFilter, not asset.id
      if (this.typeFilter && asset.assetTypeId !== this.typeFilter) return false;
      if (this.statusFilter && asset.status !== this.statusFilter) return false;
      if (this.dateFromFilter && asset.purchaseDate && new Date(asset.purchaseDate) < this.dateFromFilter) return false;
      if (this.dateToFilter && asset.purchaseDate && new Date(asset.purchaseDate) > this.dateToFilter) return false;
      return true;
    });
    this.totalCount = this.allFilteredAssets.length;
    this.pageIndex = 0;
    this.applyPagination();
  }
  
}
