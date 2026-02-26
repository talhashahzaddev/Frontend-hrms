import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '../../../../core/services/notification.service';

export interface RejectLeaveDialogData {
  employeeName: string;
  leaveTypeName: string;
  startDate: Date | string;
  endDate: Date | string;
  daysRequested: number;
}

@Component({
  selector: 'app-reject-leave-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './reject-leave-dialog.component.html',
  styleUrls: ['./reject-leave-dialog.component.scss']
})
export class RejectLeaveDialogComponent {

  rejectForm: FormGroup;
  isSubmitting = false;

  quickReasons: string[] = [
    'Insufficient team coverage',
    'Peak business period',
    'Prior leave already approved',
    'Insufficient notice period',
    'Project deadline conflict',
    'Leave balance insufficient',
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<RejectLeaveDialogComponent>,
    private notificationService: NotificationService,
    @Inject(MAT_DIALOG_DATA) public data: RejectLeaveDialogData
  ) {
    this.rejectForm = this.fb.group({
      reason: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    });
  }

  selectQuickReason(reason: string): void {
    this.rejectForm.patchValue({ reason });
    this.rejectForm.get('reason')?.markAsTouched();
  }

  onCancel(): void {
    this.dialogRef.close({ rejected: false });
  }

  onReject(): void {
    if (!this.rejectForm.valid) {
      this.rejectForm.markAllAsTouched();
      this.notificationService.showError('Please provide a rejection reason');
      return;
    }
    this.isSubmitting = true;
    const reason = this.rejectForm.get('reason')?.value?.trim();
    this.dialogRef.close({ rejected: true, reason });
  }
}
