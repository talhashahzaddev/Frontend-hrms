import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ExpenseDto } from '../../../../core/models/expense.models';
import { ExpenseService } from '../../services/expense.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { Subject, takeUntil } from 'rxjs';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface ClaimDetailsDialogData {
  expenseId: string;
}


@Component({
  selector: 'app-claim-details-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './claim-details-dialog.component.html',
  styleUrls: ['./claim-details-dialog.component.scss']
})
export class ClaimDetailsDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  claim: ExpenseDto | null = null;
  loading = true;
  error: string | null = null;
  organizationCurrency = 'USD';

  constructor(
    private dialogRef: MatDialogRef<ClaimDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ClaimDetailsDialogData,
    private expenseService: ExpenseService,
    private notificationService: NotificationService,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (currency) => (this.organizationCurrency = currency || 'USD'),
        error: () => (this.organizationCurrency = 'USD')
      });
    this.expenseService
      .getExpenseById(this.data.expenseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (expense) => {
          this.claim = expense;
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message || err?.message || 'Failed to load claim details';
          this.notificationService.showError(this.error ?? 'Failed to load claim details');
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'paid') return 'type-approved';
    if (s === 'rejected') return 'type-rejected';
    return 'type-pending';
  }

  openReceipt(): void {
    if (this.claim?.receiptUrl) {
      window.open(this.claim.receiptUrl, '_blank');
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
