import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

import { ExpenseCategoryDto, CreateExpenseCategoryRequest, UpdateExpenseCategoryRequest } from '../../../../core/models/expense.models';
import { ExpenseService } from '../../services/expense.service';
import { NotificationService } from '../../../../core/services/notification.service';

export interface CategoryDialogData {
  mode: 'create' | 'edit';
  category?: ExpenseCategoryDto;
}

@Component({
  selector: 'app-category-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './category-form-dialog.component.html',
  styleUrls: ['./category-form-dialog.component.scss']
})
export class CategoryFormDialogComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  categoryForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private expenseService: ExpenseService,
    private dialogRef: MatDialogRef<CategoryFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CategoryDialogData,
    private notificationService: NotificationService
  ) {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]]
    });

    if (data.mode === 'edit' && data.category) {
      this.categoryForm.patchValue({ name: data.category.name });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const name = (this.categoryForm.get('name')?.value as string).trim();

    const createReq: CreateExpenseCategoryRequest = { name };
    const updateReq: UpdateExpenseCategoryRequest = { name };

    const operation =
      this.data.mode === 'edit' && this.data.category
        ? this.expenseService.updateExpenseCategory(this.data.category.categoryId, updateReq)
        : this.expenseService.createExpenseCategory(createReq);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: (category) => {
        this.notificationService.showSuccess(
          `Expense category ${this.data.mode === 'edit' ? 'updated' : 'created'} successfully`
        );
        this.dialogRef.close(category);
      },
      error: (error) => {
        const msg = error?.error?.message || error?.message || `Failed to ${this.data.mode === 'edit' ? 'update' : 'create'} category`;
        this.notificationService.showError(msg);
        this.isSubmitting = false;
      }
    });
  }
}
