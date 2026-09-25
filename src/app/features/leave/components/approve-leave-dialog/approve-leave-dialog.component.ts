import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface ApproveLeaveDialogData {
  employeeName: string;
  leaveTypeName: string;
  startDate: Date | string;
  endDate: Date | string;
  daysRequested: number;
  reason?: string;
}


@Component({
  selector: 'app-approve-leave-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './approve-leave-dialog.component.html',
  styleUrls: ['./approve-leave-dialog.component.scss']
})
export class ApproveLeaveDialogComponent {

  isSubmitting = false;

  constructor(
    public dialogRef: MatDialogRef<ApproveLeaveDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ApproveLeaveDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close({ approved: false });
  }

  onApprove(): void {
    this.isSubmitting = true;
    this.dialogRef.close({ approved: true });
  }
}
