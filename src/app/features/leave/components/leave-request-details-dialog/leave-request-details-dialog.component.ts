import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface LeaveRequestDetailsDialogData {
  employeeName:    string;
  employeeEmail?:  string;
  leaveTypeName:   string;
  leaveTypeColor?: string;
  startDate:       Date | string;
  endDate:         Date | string;
  daysRequested:   number;
  status:          string;
  reason?:         string;
  submittedAt?:    Date | string;
  approverName?:   string;
  approvedAt?:     Date | string;
  rejectionReason?: string;
  // For "My Requests" view — hide the employee section
  isSelfView?:     boolean;
}

@Component({
  selector: 'app-leave-request-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './leave-request-details-dialog.component.html',
  styleUrls:  ['./leave-request-details-dialog.component.scss']
})
export class LeaveRequestDetailsDialogComponent {

  constructor(
    public  dialogRef: MatDialogRef<LeaveRequestDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LeaveRequestDetailsDialogData
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  getStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':   return 'check_circle';
      case 'rejected':   return 'cancel';
      case 'pending':    return 'schedule';
      case 'cancelled':  return 'block';
      default:           return 'info';
    }
  }

  getStatusLabel(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':   return 'Approved';
      case 'rejected':   return 'Rejected';
      case 'pending':    return 'Pending Approval';
      case 'cancelled':  return 'Cancelled';
      default:           return status;
    }
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }
}
