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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, startWith } from 'rxjs';

import { ExpenseCategoryDto } from '../../../../core/models/expense.models';
import { ExpenseService } from '../../services/expense.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CategoryFormDialogComponent } from '../category-form-dialog/category-form-dialog.component';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-category-list',
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
    MatProgressSpinnerModule
  ],
  templateUrl: './category-list.component.html',
  styleUrls: ['./category-list.component.scss']
})
export class CategoryListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  categories: ExpenseCategoryDto[] = [];
  filteredCategories: ExpenseCategoryDto[] = [];
  displayedColumns: string[] = ['name', 'createdAt', 'actions'];
  isLoading = false;
  searchControl = new FormControl('');

  constructor(
    private expenseService: ExpenseService,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
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
    this.isLoading = true;
    this.expenseService
      .getExpenseCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.categories = list || [];
          this.applyFilter();
          this.isLoading = false;
        },
        error: (err) => {
          this.notificationService.showError(
            err?.error?.message || err?.message || 'Failed to load expense categories'
          );
          this.isLoading = false;
        }
      });
  }

  private applyFilter(): void {
    const q = (this.searchControl.value || '').trim().toLowerCase();
    if (!q) {
      this.filteredCategories = [...this.categories];
      return;
    }
    this.filteredCategories = this.categories.filter((c) =>
      (c.name || '').toLowerCase().includes(q)
    );
  }

  clearFilters(): void {
    this.searchControl.setValue('');
  }

  hasFiltersApplied(): boolean {
    return !!this.searchControl.value?.trim();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CategoryFormDialogComponent, {
      width: '500px',
      data: { mode: 'create' }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadCategories();
    });
  }

  editCategory(category: ExpenseCategoryDto): void {
    const dialogRef = this.dialog.open(CategoryFormDialogComponent, {
      width: '500px',
      data: { mode: 'edit', category }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadCategories();
    });
  }

  deleteCategory(category: ExpenseCategoryDto): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Expense Category',
      message: `Are you sure you want to delete "${category.name}"?`,
      itemName: category.name,
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
          .deleteExpenseCategory(category.categoryId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.loadCategories();
              this.notificationService.showSuccess('Expense category deleted successfully');
            },
            error: (err) => {
              this.notificationService.showError(
                err?.error?.message || err?.message || 'Failed to delete category'
              );
            }
          });
      }
    });
  }
}
