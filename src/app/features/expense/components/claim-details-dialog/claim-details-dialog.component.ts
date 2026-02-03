import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ExpenseDto } from '../../../../core/models/expense.models';
import { ExpenseService } from '../../services/expense.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Subject, takeUntil } from 'rxjs';

export interface ClaimDetailsDialogData {
  expenseId: string;
}

@Component({
  selector: 'app-claim-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './claim-details-dialog.component.html',
  styleUrls: ['./claim-details-dialog.component.scss']
})
export class ClaimDetailsDialogComponent implements OnInit {
  private destroy$ = new Subject<void>();

  claim: ExpenseDto | null = null;
  loading = true;
  error: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<ClaimDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ClaimDetailsDialogData,
    private expenseService: ExpenseService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
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

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'paid') return 'status-success';
    if (s === 'rejected') return 'status-warn';
    return 'status-pending';
  }

  close(): void {
    this.dialogRef.close();
  }
}
