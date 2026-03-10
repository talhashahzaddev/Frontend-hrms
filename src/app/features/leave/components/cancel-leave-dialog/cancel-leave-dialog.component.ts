import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface CancelLeaveDialogData {
  leaveTypeName: string;
  leaveTypeColor: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason?: string;
}

@Component({
  selector: 'app-cancel-leave-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './cancel-leave-dialog.component.html',
  styleUrls: ['./cancel-leave-dialog.component.scss']
})
export class CancelLeaveDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<CancelLeaveDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CancelLeaveDialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onClose(): void {
    this.dialogRef.close(false);
  }
}
