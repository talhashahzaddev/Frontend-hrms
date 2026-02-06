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
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, debounceTime, merge, startWith } from 'rxjs';

import { RecurringExpenseDto, ExpenseCategoryDto } from '../../../../core/models/expense.models';
import { ExpenseService } from '../../services/expense.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { RecurringDetailsDialogComponent } from '../recurring-details-dialog/recurring-details-dialog.component';
import { RecurringFormDialogComponent } from '../recurring-form-dialog/recurring-form-dialog.component';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

export type RecurringListView = 'my-recurring' | 'all-recurring';

@Component({
  selector: 'app-recurring-expense-list',
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
    MatPaginatorModule
  ],
  templateUrl: './recurring-expense-list.component.html',
  styleUrls: ['./recurring-expense-list.component.scss']
})
export class RecurringExpenseListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  list: RecurringExpenseDto[] = [];
  filteredList: RecurringExpenseDto[] = [];
  categories: ExpenseCategoryDto[] = [];
  displayedColumns: string[] = ['title', 'category', 'amount', 'rotation', 'status', 'actions'];
  isLoading = false;
  myPage = 1;
  myPageSize = 10;
  myTotalCount = 0;
  myTotalPages = 0;
  searchControl = new FormControl('');
  myStatus = new FormControl<string | null>(null);
  myCategoryId = new FormControl<string | null>(null);

  statusOptions: { value: string; label: string }[] = [
    { value: '', label: 'All statuses' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' }
  ];

  allList: RecurringExpenseDto[] = [];
  filteredAllList: RecurringExpenseDto[] = [];
  displayedColumnsAll: string[] = ['title', 'category', 'amount', 'rotation', 'status', 'details'];
  isLoadingAll = false;
  allPage = 1;
  allPageSize = 10;
  allTotalCount = 0;
  allTotalPages = 0;
  allSearchControl = new FormControl('');
  allStatus = new FormControl<string | null>(null);
  allCategoryId = new FormControl<string | null>(null);

  activeView: RecurringListView = 'my-recurring';

  pendingRecurring: RecurringExpenseDto[] = [];
  isLoadingPending = false;

  constructor(
    private expenseService: ExpenseService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  get isSuperAdmin(): boolean {
    return this.authService.hasRole('Super Admin');
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadMyRecurring();
    if (this.isSuperAdmin) {
      this.loadAllRecurring();
      this.loadPendingRecurring();
    }
    merge(
      this.searchControl.valueChanges.pipe(startWith('')),
      this.myStatus.valueChanges.pipe(startWith(this.myStatus.value)),
      this.myCategoryId.valueChanges.pipe(startWith(this.myCategoryId.value))
    )
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(() => this.applyFilter());
    merge(
      this.allSearchControl.valueChanges.pipe(startWith('')),
      this.allCategoryId.valueChanges.pipe(startWith(this.allCategoryId.value))
    )
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(() => this.applyAllFilter());
    this.allStatus.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isSuperAdmin) this.loadAllRecurring(1);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCategories(): void {
    this.expenseService
      .getExpenseCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => (this.categories = items || []),
        error: () => (this.categories = [])
      });
  }

  loadMyRecurring(page: number = 1): void {
    this.myPage = page;
    this.isLoading = true;
    this.expenseService
      .getMyRecurringExpenses(this.myPage, this.myPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paged) => {
          this.list = paged.data || [];
          this.myTotalCount = paged.totalCount ?? 0;
          this.myTotalPages = paged.totalPages ?? 0;
          this.applyFilter();
          this.isLoading = false;
        },
        error: (err) => {
          this.notificationService.showError(
            err?.error?.message || err?.message || 'Failed to load recurring expenses'
          );
          this.isLoading = false;
        }
      });
  }

  onMyPageChange(event: PageEvent): void {
    this.myPageSize = event.pageSize;
    this.loadMyRecurring(event.pageIndex + 1);
  }

  private applyFilter(): void {
    const q = (this.searchControl.value || '').trim().toLowerCase();
    const status = (this.myStatus.value || '').trim();
    const categoryId = (this.myCategoryId.value || '').trim();

    this.filteredList = this.list.filter((r) => {
      if (q && !(r.title || '').toLowerCase().includes(q) &&
          !(r.categoryName || '').toLowerCase().includes(q) &&
          !(r.description || '').toLowerCase().includes(q)) {
        return false;
      }
      if (status && (r.status || '').toLowerCase() !== status.toLowerCase()) return false;
      if (categoryId && (r.categoryId || '') !== categoryId) return false;
      return true;
    });
  }

  loadAllRecurring(page: number = 1): void {
    this.allPage = page;
    this.isLoadingAll = true;
    const status = this.allStatus.value || undefined;
    this.expenseService
      .getRecurringExpenses(null, status ?? null, this.allPage, this.allPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paged) => {
          this.allList = paged.data || [];
          this.allTotalCount = paged.totalCount ?? 0;
          this.allTotalPages = paged.totalPages ?? 0;
          this.applyAllFilter();
          this.isLoadingAll = false;
        },
        error: (err) => {
          this.notificationService.showError(
            err?.error?.message || err?.message || 'Failed to load all recurring expenses'
          );
          this.isLoadingAll = false;
        }
      });
  }

  onAllPageChange(event: PageEvent): void {
    this.allPageSize = event.pageSize;
    this.loadAllRecurring(event.pageIndex + 1);
  }

  private applyAllFilter(): void {
    const q = (this.allSearchControl.value || '').trim().toLowerCase();
    const categoryId = (this.allCategoryId.value || '').trim();

    this.filteredAllList = this.allList.filter((r) => {
      if (q && !(r.title || '').toLowerCase().includes(q) &&
          !(r.categoryName || '').toLowerCase().includes(q) &&
          !(r.description || '').toLowerCase().includes(q) &&
          !(r.employeeName || '').toLowerCase().includes(q)) {
        return false;
      }
      if (categoryId && (r.categoryId || '') !== categoryId) return false;
      return true;
    });
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.myStatus.setValue(null);
    this.myCategoryId.setValue(null);
  }

  hasFiltersApplied(): boolean {
    return (
      !!this.searchControl.value?.trim() ||
      !!this.myStatus.value?.trim() ||
      !!this.myCategoryId.value?.trim()
    );
  }

  hasAllFiltersApplied(): boolean {
    return (
      !!this.allSearchControl.value?.trim() ||
      !!this.allCategoryId.value?.trim()
    );
  }

  clearAllFilters(): void {
    this.allSearchControl.setValue('');
    this.allCategoryId.setValue(null);
  }

  private loadPendingRecurring(): void {
    this.isLoadingPending = true;
    this.expenseService
      .getRecurringExpenses(null, 'Pending', 1, 500)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paged) => {
          this.pendingRecurring = paged?.data ?? [];
          this.isLoadingPending = false;
        },
        error: (err) => {
          this.notificationService.showError(
            err?.error?.message || err?.message || 'Failed to load pending recurring expenses'
          );
          this.isLoadingPending = false;
        }
      });
  }

  acceptRecurring(item: RecurringExpenseDto): void {
    this.expenseService
      .recurringRequestAction(item.recurringExpenseId, 'approve')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Recurring expense approved successfully');
          this.loadPendingRecurring();
          this.loadAllRecurring();
        },
        error: (err) => {
          this.notificationService.showError(
            err?.error?.message || err?.message || 'Failed to approve recurring expense'
          );
        }
      });
  }

  rejectRecurring(item: RecurringExpenseDto): void {
    this.expenseService
      .recurringRequestAction(item.recurringExpenseId, 'reject')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Recurring expense rejected');
          this.loadPendingRecurring();
          this.loadAllRecurring();
        },
        error: (err) => {
          this.notificationService.showError(
            err?.error?.message || err?.message || 'Failed to reject recurring expense'
          );
        }
      });
  }

  setActiveView(view: RecurringListView): void {
    this.activeView = view;
  }

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'status-success';
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

  viewRecurringDetails(item: RecurringExpenseDto): void {
    this.dialog.open(RecurringDetailsDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      data: { recurringExpenseId: item.recurringExpenseId }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(RecurringFormDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      data: { mode: 'create', categories: this.categories }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadMyRecurring();
        if (this.isSuperAdmin) {
          this.loadAllRecurring();
          this.loadPendingRecurring();
        }
      }
    });
  }

  editRecurring(item: RecurringExpenseDto): void {
    const dialogRef = this.dialog.open(RecurringFormDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      data: { mode: 'edit', recurring: item, categories: this.categories }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadMyRecurring();
        if (this.isSuperAdmin) {
          this.loadAllRecurring();
          this.loadPendingRecurring();
        }
      }
    });
  }

  deleteRecurring(item: RecurringExpenseDto): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Recurring Expense',
      message: `Are you sure you want to delete "${item.title}"?`,
      itemName: item.title,
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
          .deleteRecurringExpense(item.recurringExpenseId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.loadMyRecurring();
              if (this.isSuperAdmin) {
                this.loadAllRecurring();
                this.loadPendingRecurring();
              }
              this.notificationService.showSuccess('Recurring expense deleted successfully');
            },
            error: (err) => {
              this.notificationService.showError(
                err?.error?.message || err?.message || 'Failed to delete recurring expense'
              );
            }
          });
      }
    });
  }
}
