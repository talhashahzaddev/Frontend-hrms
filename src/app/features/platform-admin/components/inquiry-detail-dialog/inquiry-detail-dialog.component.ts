import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DemoInquiryService } from '../../services/demo-inquiry.service';
import { DemoInquiry } from '../../models/super-admin.models';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-inquiry-detail-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './inquiry-detail-dialog.component.html',
  styleUrls: ['./inquiry-detail-dialog.component.scss']
})
export class InquiryDetailDialogComponent implements OnDestroy {
  newStatus: string;
  notes = '';
  isUpdating = false;
  errorMessage = '';

  statusOptions = ['new', 'contacted', 'demo_scheduled', 'converted', 'closed'];

  private destroy$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public inquiry: DemoInquiry,
    private dialogRef: MatDialogRef<InquiryDetailDialogComponent>,
    private inquiryService: DemoInquiryService
  ) {
    this.newStatus = inquiry.status;
  }

  updateStatus(): void {
    if (this.newStatus === this.inquiry.status || this.isUpdating) return;

    this.isUpdating = true;
    this.errorMessage = '';

    this.inquiryService.updateInquiryStatus(this.inquiry.inquiryId, {
      status: this.newStatus,
      notes: this.notes || undefined
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.dialogRef.close('updated');
          } else {
            this.errorMessage = res.message || 'Update failed.';
            this.isUpdating = false;
          }
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'An error occurred.';
          this.isUpdating = false;
        }
      });
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      new: '#2196f3',
      contacted: '#ff9800',
      demo_scheduled: '#9c27b0',
      converted: '#4caf50',
      closed: '#757575'
    };
    return colors[status?.toLowerCase()] || '#bdbdbd';
  }

  formatStatus(status: string): string {
    return status?.replace(/_/g, ' ') || '';
  }

  close(): void {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
