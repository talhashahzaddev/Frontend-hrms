import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

import { RecurringExpenseDto } from '../../../../core/models/expense.models';
import { ExpenseService } from '../../services/expense.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SettingsService } from '../../../settings/services/settings.service';

export interface RecurringDetailsDialogData {
  recurringExpenseId: string;
}

@Component({
  selector: 'app-recurring-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './recurring-details-dialog.component.html',
  styleUrls: ['./recurring-details-dialog.component.scss']
})
export class RecurringDetailsDialogComponent implements OnInit {
  private destroy$ = new Subject<void>();

  item: RecurringExpenseDto | null = null;
  loading = true;
  error: string | null = null;
  organizationCurrency = 'USD';

  constructor(
    private dialogRef: MatDialogRef<RecurringDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RecurringDetailsDialogData,
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
      .getRecurringExpenseById(this.data.recurringExpenseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (recurring) => {
          this.item = recurring;
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message || err?.message || 'Failed to load recurring expense details';
          this.notificationService.showError(this.error ?? 'Failed to load details');
          this.loading = false;
        }
      });
  }

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'approved') return 'status-success';
    if (s === 'rejected') return 'status-warn';
    return 'status-pending';
  }

  close(): void {
    this.dialogRef.close();
  }
}
