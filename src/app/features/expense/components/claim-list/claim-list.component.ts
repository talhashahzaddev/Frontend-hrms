import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, startWith, merge } from 'rxjs';

import { ExpenseDto, ExpenseCategoryDto } from '../../../../core/models/expense.models';
import { ExpenseService } from '../../services/expense.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { ClaimFormDialogComponent } from '../claim-form-dialog/claim-form-dialog.component';
import { ClaimDetailsDialogComponent } from '../claim-details-dialog/claim-details-dialog.component';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

export type ClaimListView = 'my-claims' | 'all-claims';

@Component({
  selector: 'app-claim-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule
  ],
  templateUrl: './claim-list.component.html',
  styleUrls: ['./claim-list.component.scss']
})
export class ClaimListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  claims: ExpenseDto[] = [];
  filteredClaims: ExpenseDto[] = [];
  categories: ExpenseCategoryDto[] = [];
  displayedColumns: string[] = ['title', 'category', 'amount', 'billDate', 'status', 'actions'];
  isLoading = false;
  myClaimsPage = 1;
  myClaimsPageSize = 10;
  myClaimsTotalCount = 0;
  myClaimsTotalPages = 0;
  searchControl = new FormControl('');
  myClaimsStartDate = new FormControl<Date | null>(null);
  myClaimsEndDate = new FormControl<Date | null>(null);
  myClaimsStatus = new FormControl<string | null>(null);
  myClaimsCategoryId = new FormControl<string | null>(null);

  statusOptions: { value: string; label: string }[] = [
    { value: '', label: 'All statuses' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' }
  ];

  allClaims: ExpenseDto[] = [];
  filteredAllClaims: ExpenseDto[] = [];
  displayedColumnsAllClaims: string[] = ['title', 'category', 'amount', 'billDate', 'status', 'details'];
  isLoadingAllClaims = false;
  allClaimsPage = 1;
  allClaimsPageSize = 10;
  allClaimsTotalCount = 0;
  allClaimsTotalPages = 0;
  allClaimsSearchControl = new FormControl('');
  allClaimsStartDate = new FormControl<Date | null>(null);
  allClaimsEndDate = new FormControl<Date | null>(null);
  allClaimsStatus = new FormControl<string | null>(null);
  allClaimsCategoryId = new FormControl<string | null>(null);

  activeView: ClaimListView = 'my-claims';

  pendingClaims: ExpenseDto[] = [];
  isLoadingPending = false;

  organizationCurrency = 'USD';

  constructor(
    private expenseService: ExpenseService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private authService: AuthService,
    private settingsService: SettingsService
  ) {}

  get isSuperAdmin(): boolean {
    return this.authService.hasRole('Super Admin');
  }

  ngOnInit(): void {
    this.loadOrganizationCurrency();
    this.loadCategories();
    this.loadClaims();
    if (this.isSuperAdmin) {
      this.loadAllClaims();
      this.loadPendingClaims();
    }
    merge(
      this.searchControl.valueChanges.pipe(startWith('')),
      this.myClaimsStartDate.valueChanges.pipe(startWith(this.myClaimsStartDate.value)),
      this.myClaimsEndDate.valueChanges.pipe(startWith(this.myClaimsEndDate.value)),
      this.myClaimsStatus.valueChanges.pipe(startWith(this.myClaimsStatus.value)),
      this.myClaimsCategoryId.valueChanges.pipe(startWith(this.myClaimsCategoryId.value))
    )
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilter());
    merge(
      this.allClaimsSearchControl.valueChanges.pipe(startWith('')),
      this.allClaimsStartDate.valueChanges.pipe(startWith(this.allClaimsStartDate.value)),
      this.allClaimsEndDate.valueChanges.pipe(startWith(this.allClaimsEndDate.value)),
      this.allClaimsStatus.valueChanges.pipe(startWith(this.allClaimsStatus.value)),
      this.allClaimsCategoryId.valueChanges.pipe(startWith(this.allClaimsCategoryId.value))
    )
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(() => this.applyAllClaimsFilter());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOrganizationCurrency(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (currency: string) => (this.organizationCurrency = currency || 'USD'),
        error: () => (this.organizationCurrency = 'USD')
      });
  }

  private loadCategories(): void {
    this.expenseService
      .getExpenseCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => (this.categories = list || []),
        error: () => (this.categories = [])
      });
  }

  loadClaims(page: number = 1): void {
    this.myClaimsPage = page;
    this.isLoading = true;
    this.expenseService
      .getMyExpenses(this.myClaimsPage, this.myClaimsPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paged) => {
          this.claims = paged.data || [];
          this.myClaimsTotalCount = paged.totalCount ?? 0;
          this.myClaimsTotalPages = paged.totalPages ?? 0;
          this.applyFilter();
          this.isLoading = false;
        },
        error: (err) => {
          this.notificationService.showError(
            err?.error?.message || err?.message || 'Failed to load claims'
          );
          this.isLoading = false;
        }
      });
  }

  onMyClaimsPageChange(event: PageEvent): void {
    this.myClaimsPageSize = event.pageSize;
    this.loadClaims(event.pageIndex + 1);
  }

  private applyFilter(): void {
    const q = (this.searchControl.value || '').trim().toLowerCase();
    const start = this.myClaimsStartDate.value;
    const end = this.myClaimsEndDate.value;
    const status = (this.myClaimsStatus.value || '').trim();
    const categoryId = (this.myClaimsCategoryId.value || '').trim();

    this.filteredClaims = this.claims.filter((c) => {
      if (q && !(c.title || '').toLowerCase().includes(q) &&
          !(c.categoryName || '').toLowerCase().includes(q) &&
          !(c.description || '').toLowerCase().includes(q)) {
        return false;
      }
      if (start) {
        const billDate = c.billDate ? new Date(c.billDate).setHours(0, 0, 0, 0) : 0;
        const startTs = new Date(start).setHours(0, 0, 0, 0);
        if (billDate < startTs) return false;
      }
      if (end) {
        const billDate = c.billDate ? new Date(c.billDate).setHours(0, 0, 0, 0) : 0;
        const endTs = new Date(end).setHours(23, 59, 59, 999);
        if (billDate > endTs) return false;
      }
      if (status && (c.status || '').toLowerCase() !== status.toLowerCase()) return false;
      if (categoryId && (c.categoryId || '') !== categoryId && (c.categoryName || '') !== categoryId) return false;
      return true;
    });
  }

  loadAllClaims(page: number = 1): void {
    this.allClaimsPage = page;
    this.isLoadingAllClaims = true;
    this.expenseService
      .getExpenses(null, null, this.allClaimsPage, this.allClaimsPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paged) => {
          this.allClaims = paged.data || [];
          this.allClaimsTotalCount = paged.totalCount ?? 0;
          this.allClaimsTotalPages = paged.totalPages ?? 0;
          this.applyAllClaimsFilter();
          this.isLoadingAllClaims = false;
        },
        error: (err) => {
          this.notificationService.showError(
            err?.error?.message || err?.message || 'Failed to load all claims'
          );
          this.isLoadingAllClaims = false;
        }
      });
  }

  onAllClaimsPageChange(event: PageEvent): void {
    this.allClaimsPageSize = event.pageSize;
    this.loadAllClaims(event.pageIndex + 1);
  }

  private applyAllClaimsFilter(): void {
    const q = (this.allClaimsSearchControl.value || '').trim().toLowerCase();
    const start = this.allClaimsStartDate.value;
    const end = this.allClaimsEndDate.value;
    const status = (this.allClaimsStatus.value || '').trim();
    const categoryId = (this.allClaimsCategoryId.value || '').trim();

    this.filteredAllClaims = this.allClaims.filter((c) => {
      if (q && !(c.title || '').toLowerCase().includes(q) &&
          !(c.categoryName || '').toLowerCase().includes(q) &&
          !(c.description || '').toLowerCase().includes(q) &&
          !(c.employeeName || '').toLowerCase().includes(q)) {
        return false;
      }
      if (start) {
        const billDate = c.billDate ? new Date(c.billDate).setHours(0, 0, 0, 0) : 0;
        const startTs = new Date(start).setHours(0, 0, 0, 0);
        if (billDate < startTs) return false;
      }
      if (end) {
        const billDate = c.billDate ? new Date(c.billDate).setHours(0, 0, 0, 0) : 0;
        const endTs = new Date(end).setHours(23, 59, 59, 999);
        if (billDate > endTs) return false;
      }
      if (status && (c.status || '').toLowerCase() !== status.toLowerCase()) return false;
      if (categoryId && (c.categoryId || '') !== categoryId && (c.categoryName || '') !== categoryId) return false;
      return true;
    });
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.myClaimsStartDate.setValue(null);
    this.myClaimsEndDate.setValue(null);
    this.myClaimsStatus.setValue(null);
    this.myClaimsCategoryId.setValue(null);
  }

  hasFiltersApplied(): boolean {
    return (
      !!this.searchControl.value?.trim() ||
      this.myClaimsStartDate.value != null ||
      this.myClaimsEndDate.value != null ||
      !!this.myClaimsStatus.value?.trim() ||
      !!this.myClaimsCategoryId.value?.trim()
    );
  }

  hasAllClaimsFiltersApplied(): boolean {
    return (
      !!this.allClaimsSearchControl.value?.trim() ||
      this.allClaimsStartDate.value != null ||
      this.allClaimsEndDate.value != null ||
      !!this.allClaimsStatus.value?.trim() ||
      !!this.allClaimsCategoryId.value?.trim()
    );
  }

  clearAllClaimsFilters(): void {
    this.allClaimsSearchControl.setValue('');
    this.allClaimsStartDate.setValue(null);
    this.allClaimsEndDate.setValue(null);
    this.allClaimsStatus.setValue(null);
    this.allClaimsCategoryId.setValue(null);
  }

  private loadPendingClaims(): void {
    this.isLoadingPending = true;
    this.expenseService
      .getExpenses(null, 'Pending', 1, 500)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paged) => {
          this.pendingClaims = paged?.data ?? [];
          this.isLoadingPending = false;
        },
        error: (err) => {
          this.notificationService.showError(
            err?.error?.message || err?.message || 'Failed to load pending claims'
          );
          this.isLoadingPending = false;
        }
      });
  }

  acceptClaim(claim: ExpenseDto): void {
    this.expenseService
      .requestAction(claim.expenseId, 'approve')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Claim approved successfully');
          this.loadPendingClaims();
          this.loadAllClaims();
        },
        error: (err) => {
          this.notificationService.showError(
            err?.error?.message || err?.message || 'Failed to approve claim'
          );
        }
      });
  }

  rejectClaim(claim: ExpenseDto): void {
    this.expenseService
      .requestAction(claim.expenseId, 'reject')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Claim rejected');
          this.loadPendingClaims();
          this.loadAllClaims();
        },
        error: (err) => {
          this.notificationService.showError(
            err?.error?.message || err?.message || 'Failed to reject claim'
          );
        }
      });
  }

  setActiveView(view: ClaimListView): void {
    this.activeView = view;
  }

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'paid') return 'status-success';
    if (s === 'rejected') return 'status-warn';
    return 'status-pending';
  }

  getInitials(name: string | null | undefined): string {
    if (name == null || !String(name).trim()) return '?';
    const s = String(name).trim();
    const parts = s.split(/\s+/);
    if (parts.length >= 2) {
      return ((parts[0][0] || '') + (parts[parts.length - 1][0] || '')).toUpperCase();
    }
    return (s[0] || '?').toUpperCase();
  }

  /** True when claim status is Pending (Edit/Delete allowed only for Pending). */
  isClaimPending(claim: ExpenseDto): boolean {
    return (claim?.status || '').toString().toLowerCase() === 'pending';
  }

  viewClaimDetails(claim: ExpenseDto): void {
    this.dialog.open(ClaimDetailsDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      data: { expenseId: claim.expenseId }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ClaimFormDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      data: { mode: 'create', categories: this.categories }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadClaims();
    });
  }

  editClaim(claim: ExpenseDto): void {
    const dialogRef = this.dialog.open(ClaimFormDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      data: { mode: 'edit', expense: claim, categories: this.categories }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadClaims();
    });
  }

  deleteClaim(claim: ExpenseDto): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Claim',
      message: `Are you sure you want to delete "${claim.title}"?`,
      itemName: claim.title,
      confirmButtonText: 'Yes, Delete'
    };
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-action-dialog-panel'
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.expenseService
          .deleteExpense(claim.expenseId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.loadClaims();
              this.notificationService.showSuccess('Claim deleted successfully');
            },
            error: (err) => {
              this.notificationService.showError(
                err?.error?.message || err?.message || 'Failed to delete claim'
              );
            }
          });
      }
    });
  }
}
