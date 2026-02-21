import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

import {
  ExpenseCategoryDto,
  RecurringExpenseDto,
  CreateRecurringExpenseRequest,
  UpdateRecurringExpenseRequest
} from '../../../../core/models/expense.models';
import { ExpenseService } from '../../services/expense.service';
import { NotificationService } from '../../../../core/services/notification.service';

export interface RecurringFormDialogData {
  mode: 'create' | 'edit';
  recurring?: RecurringExpenseDto;
  categories: ExpenseCategoryDto[];
}

const ROTATION_OPTIONS = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Biweekly', label: 'Biweekly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Yearly', label: 'Yearly' }
];

@Component({
  selector: 'app-recurring-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './recurring-form-dialog.component.html',
  styleUrls: ['./recurring-form-dialog.component.scss']
})
export class RecurringFormDialogComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  form: FormGroup;
  isSubmitting = false;
  readonly rotationOptions = ROTATION_OPTIONS;

  constructor(
    private fb: FormBuilder,
    private expenseService: ExpenseService,
    private dialogRef: MatDialogRef<RecurringFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RecurringFormDialogData,
    private notificationService: NotificationService
  ) {
    this.form = this.fb.group({
      categoryId: [null as string | null, Validators.required],
      title: ['', [Validators.required, Validators.maxLength(150)]],
      description: ['', Validators.maxLength(500)],
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
      rotation: ['', [Validators.required, Validators.maxLength(20)]],
      dayOfMonth: ['', Validators.maxLength(20)],
      paymentMethod: ['', Validators.maxLength(50)],
      merchant: ['', Validators.maxLength(150)],
      receiptUrl: ['']
    });

    if (data.mode === 'edit' && data.recurring) {
      const r = data.recurring;
      this.form.patchValue({
        categoryId: r.categoryId || null,
        title: r.title,
        description: r.description || '',
        amount: r.amount,
        rotation: r.rotation || '',
        dayOfMonth: r.dayOfMonth || '',
        paymentMethod: r.paymentMethod || '',
        merchant: r.merchant || '',
        receiptUrl: r.receiptUrl || ''
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const v = this.form.value;

    if (this.data.mode === 'edit' && this.data.recurring) {
      const request: UpdateRecurringExpenseRequest = {
        categoryId: v.categoryId || undefined,
        title: v.title?.trim() || undefined,
        description: v.description?.trim() || undefined,
        amount: v.amount,
        rotation: (v.rotation || '').trim() || undefined,
        dayOfMonth: v.dayOfMonth?.trim() || undefined,
        paymentMethod: v.paymentMethod?.trim() || undefined,
        merchant: v.merchant?.trim() || undefined,
        receiptUrl: v.receiptUrl?.trim() || undefined
      };
      this.expenseService
        .updateRecurringExpense(this.data.recurring.recurringExpenseId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Recurring expense updated successfully');
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.notificationService.showError(
              err?.error?.message || err?.message || 'Failed to update recurring expense'
            );
            this.isSubmitting = false;
          }
        });
    } else {
      const request: CreateRecurringExpenseRequest = {
        categoryId: v.categoryId,
        title: v.title.trim(),
        description: v.description?.trim() || undefined,
        amount: v.amount,
        rotation: (v.rotation || '').trim(),
        dayOfMonth: v.dayOfMonth?.trim() || undefined,
        paymentMethod: v.paymentMethod?.trim() || undefined,
        merchant: v.merchant?.trim() || undefined,
        receiptUrl: v.receiptUrl?.trim() || undefined
      };
      this.expenseService
        .createRecurringExpense(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Recurring expense created successfully');
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.notificationService.showError(
              err?.error?.message || err?.message || 'Failed to create recurring expense'
            );
            this.isSubmitting = false;
          }
        });
    }
  }
}
