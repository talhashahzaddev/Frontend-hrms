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
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, startWith } from 'rxjs';

import { ExpenseDto, ExpenseCategoryDto } from '../../../../core/models/expense.models';
import { ExpenseService } from '../../services/expense.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ClaimFormDialogComponent } from '../claim-form-dialog/claim-form-dialog.component';
import { ClaimDetailsDialogComponent } from '../claim-details-dialog/claim-details-dialog.component';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

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
    MatProgressSpinnerModule
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
  searchControl = new FormControl('');

  constructor(
    private expenseService: ExpenseService,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadClaims();
    this.searchControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyFilter());
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
        next: (list) => (this.categories = list || []),
        error: () => (this.categories = [])
      });
  }

  private loadClaims(): void {
    this.isLoading = true;
    this.expenseService
      .getMyExpenses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.claims = list || [];
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

  private applyFilter(): void {
    const q = (this.searchControl.value || '').trim().toLowerCase();
    if (!q) {
      this.filteredClaims = [...this.claims];
      return;
    }
    this.filteredClaims = this.claims.filter(
      (c) =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.categoryName || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
    );
  }

  clearFilters(): void {
    this.searchControl.setValue('');
  }

  hasFiltersApplied(): boolean {
    return !!this.searchControl.value?.trim();
  }

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'paid') return 'status-success';
    if (s === 'rejected') return 'status-warn';
    return 'status-pending';
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
