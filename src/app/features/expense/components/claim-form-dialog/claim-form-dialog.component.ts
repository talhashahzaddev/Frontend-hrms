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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';

import {
  ExpenseDto,
  ExpenseCategoryDto,
  CreateExpenseRequest,
  UpdateExpenseRequest
} from '../../../../core/models/expense.models';
import { ExpenseService } from '../../services/expense.service';
import { NotificationService } from '../../../../core/services/notification.service';

export interface ClaimDialogData {
  mode: 'create' | 'edit';
  expense?: ExpenseDto;
  categories: ExpenseCategoryDto[];
}

@Component({
  selector: 'app-claim-form-dialog',
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
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule
  ],
  templateUrl: './claim-form-dialog.component.html',
  styleUrls: ['./claim-form-dialog.component.scss']
})
export class ClaimFormDialogComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  claimForm: FormGroup;
  isSubmitting = false;
  receiptFileName: string | null = null;
  isUploadingReceipt = false;

  readonly acceptedReceiptTypes = '.pdf,.jpg,.jpeg,.png,.gif';
  readonly maxReceiptSizeMb = 5;

  private static readonly MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
  private static readonly ALLOWED_RECEIPT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif'];
  private static readonly ALLOWED_RECEIPT_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

  constructor(
    private fb: FormBuilder,
    private expenseService: ExpenseService,
    private dialogRef: MatDialogRef<ClaimFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ClaimDialogData,
    private notificationService: NotificationService
  ) {
    this.claimForm = this.fb.group({
      categoryId: [null as string | null, Validators.required],
      title: ['', [Validators.required, Validators.maxLength(150)]],
      description: ['', Validators.maxLength(500)],
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
      billDate: [null as string | null, Validators.required],
      paymentMethod: ['', Validators.maxLength(50)],
      merchant: ['', Validators.maxLength(150)],
      receiptUrl: ['']
    });

    if (data.mode === 'edit' && data.expense) {
      const e = data.expense;
      const billDate = e.billDate ? e.billDate.split('T')[0] : '';
      this.claimForm.patchValue({
        categoryId: e.categoryId || null,
        title: e.title,
        description: e.description || '',
        amount: e.amount,
        billDate: billDate || null,
        paymentMethod: e.paymentMethod || '',
        merchant: e.merchant || '',
        receiptUrl: e.receiptUrl || ''
      });
      if (e.receiptUrl) {
        try {
          const u = new URL(e.receiptUrl);
          this.receiptFileName = u.pathname.split('/').pop() || 'Receipt file';
        } catch {
          this.receiptFileName = 'Receipt file';
        }
      }
    }
  }

  triggerReceiptInput(receiptInput: HTMLInputElement): void {
    if (this.isUploadingReceipt) return;
    receiptInput.value = '';
    receiptInput.click();
  }

  private validateReceiptFile(file: File): { valid: boolean; error?: string } {
    if (!file?.name) return { valid: false, error: 'No file selected' };
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!ClaimFormDialogComponent.ALLOWED_RECEIPT_EXTENSIONS.includes(ext)) {
      return { valid: false, error: 'Allowed formats: PDF, JPG, JPEG, PNG, GIF' };
    }
    if (!ClaimFormDialogComponent.ALLOWED_RECEIPT_TYPES.includes(file.type) && file.type !== 'image/jpg') {
      return { valid: false, error: 'Invalid file type' };
    }
    if (file.size > ClaimFormDialogComponent.MAX_RECEIPT_BYTES) {
      return { valid: false, error: 'File size must be 5 MB or less' };
    }
    return { valid: true };
  }

  onReceiptFileSelected(event: Event, input: HTMLInputElement): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const validation = this.validateReceiptFile(file);
    if (!validation.valid) {
      this.notificationService.showError(validation.error ?? 'Invalid file');
      return;
    }

    this.isUploadingReceipt = true;
    this.receiptFileName = file.name;

    this.expenseService
      .uploadReceipt(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (url) => {
          this.claimForm.patchValue({ receiptUrl: url });
          this.notificationService.showSuccess('Receipt uploaded');
          this.isUploadingReceipt = false;
        },
        error: (err) => {
          this.notificationService.showError(err?.message || 'Upload failed');
          this.receiptFileName = null;
          this.isUploadingReceipt = false;
        }
      });

    input.value = '';
  }

  clearReceipt(): void {
    this.claimForm.patchValue({ receiptUrl: '' });
    this.receiptFileName = null;
  }

  get currentReceiptUrl(): string | null {
    const url = this.claimForm.get('receiptUrl')?.value;
    return url && typeof url === 'string' && url.trim() ? url.trim() : null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.claimForm.invalid) {
      this.claimForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const v = this.claimForm.value;
    const billDateStr = v.billDate ? new Date(v.billDate).toISOString() : '';

    if (this.data.mode === 'edit' && this.data.expense) {
      const request: UpdateExpenseRequest = {
        categoryId: v.categoryId || undefined,
        title: v.title?.trim() || undefined,
        description: v.description?.trim() || undefined,
        amount: v.amount,
        billDate: billDateStr || undefined,
        paymentMethod: v.paymentMethod?.trim() || undefined,
        merchant: v.merchant?.trim() || undefined,
        receiptUrl: v.receiptUrl?.trim() || undefined
      };
      this.expenseService
        .updateExpense(this.data.expense.expenseId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (expense) => {
            this.notificationService.showSuccess('Claim updated successfully');
            this.dialogRef.close(expense);
          },
          error: (err) => {
            this.notificationService.showError(
              err?.error?.message || err?.message || 'Failed to update claim'
            );
            this.isSubmitting = false;
          }
        });
    } else {
      const request: CreateExpenseRequest = {
        categoryId: v.categoryId || null,
        title: v.title.trim(),
        description: v.description?.trim() || undefined,
        amount: v.amount,
        billDate: billDateStr,
        paymentMethod: v.paymentMethod?.trim() || undefined,
        merchant: v.merchant?.trim() || undefined,
        receiptUrl: v.receiptUrl?.trim() || undefined
      };
      this.expenseService
        .createExpense(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (expense) => {
            this.notificationService.showSuccess('Claim created successfully');
            this.dialogRef.close(expense);
          },
          error: (err) => {
            this.notificationService.showError(
              err?.error?.message || err?.message || 'Failed to create claim'
            );
            this.isSubmitting = false;
          }
        });
    }
  }
}
