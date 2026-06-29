import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { take } from 'rxjs/operators';
import { CreateManagerOvertimeDialogComponent } from './create-manager-overtime-dialog';
import { CreateEmployeeOvertimeDialogComponent } from './create-employee-overtime-dialog';
import { AttendanceService } from '../../services/attendance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmployeeOverTimeDto } from '../../../../core/models/attendance.models';
import { AuthService } from '@/app/core/services/auth.service';


import { SharedCommonModule } from '@shared/shared-common.module';
import { LocalizedTimePipe } from '@shared/pipes/localized-time.pipe';
@Component({
  selector: 'app-overtime',
  standalone: true,
  imports: [
    SharedCommonModule, LocalizedTimePipe, CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatTableModule, MatMenuModule, MatTooltipModule],
  templateUrl: './overtime.component.html',
  styleUrls: ['./overtime.component.scss']
})
export class OvertimeComponent implements OnInit {
  pendingRequests: EmployeeOverTimeDto[] = [];
  employeeAssignedRequests: EmployeeOverTimeDto[] = [];
  employeeCreatedRequests: EmployeeOverTimeDto[] = [];
  todayOvertime: EmployeeOverTimeDto | null = null;
  selectedTab = 0;
  displayedColumns = ['requestedByName', 'overtimeType', 'overtimeDate', 'requestedHours', 'reason', 'createdAt', 'status', 'actions'];

  displayedEmployeeColumns = ['requestedByName', 'overtimeStart', 'overtimeEnd', 'overtimeDate', 'overtimeType', 'status', 'actions'];
  // Show requested columns for created requests (includes type, status, requested at)
  displayedCreatedColumns = ['overtimeStart', 'overtimeEnd', 'overtimeDate', 'overtimeType', 'requestedHours', 'status', 'createdAt'];

  constructor(
    private dialog: MatDialog,
    private attendanceService: AttendanceService,
    private notification: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadPendingRequests();
    this.loadEmployeeAssignedRequests();
    this.loadEmployeeCreatedRequests();
    this.loadTodayOvertime();
  }

  private loadTodayOvertime(): void {
    if (!this.attendanceService.getEmployeeTodayOvertime) {
      return;
    }

    this.attendanceService.getEmployeeTodayOvertime().pipe(take(1)).subscribe({
      next: (res) => {
        this.todayOvertime = res || null;
      },
      error: (err) => {
        console.error('Failed to load today overtime', err);
        this.todayOvertime = null;
      }
    });
  }

  openManagerOvertime(): void {
    const ref = this.dialog.open(CreateManagerOvertimeDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      panelClass: 'attendance-dialog-panel'
    });
    ref.afterClosed().pipe(take(1)).subscribe(result => {
      if (result) {
        // manager overtime created — refresh list or show notification as needed
      }
    });
  }

  openEmployeeOvertime(): void {
    const ref = this.dialog.open(CreateEmployeeOvertimeDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      panelClass: 'attendance-dialog-panel'
    });
    ref.afterClosed().pipe(take(1)).subscribe(result => {
      if (result) {
        // employee overtime created — refresh list or show notification as needed
      }
    });
  }

  // Debug helper to verify trigger buttons receive clicks
  onDebug(event?: Event): void {
    // prevent default in case button is inside a form
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    // eslint-disable-next-line no-console
    console.log('overtime menu trigger clicked');
  }

  private loadPendingRequests(): void {
    this.attendanceService.getManagerPendingOvertime().pipe(take(1)).subscribe({
      next: (res) => {
        this.pendingRequests = res || [];
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load pending overtime requests');
      }
    });
  }

  private loadEmployeeAssignedRequests(): void {
    // Load overtime requests assigned to this manager (employee-assigned requests)
    if (!this.attendanceService.getEmployeeAssignedOvertime) {
      console.warn('attendanceService.getEmployeeAssignedOvertime() not implemented');
      return;
    }

    this.attendanceService.getEmployeeAssignedOvertime().pipe(take(1)).subscribe({
      next: (res) => {
        this.employeeAssignedRequests = res || [];
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load employee-assigned overtime requests');
      }
    });
  }

  private loadEmployeeCreatedRequests(): void {
    if (!this.attendanceService.getAllEmployeeCreatedOvertime) {
      console.warn('attendanceService.getAllEmployeeCreatedOvertime() not implemented');
      return;
    }

    this.attendanceService.getAllEmployeeCreatedOvertime().pipe(take(1)).subscribe({
      next: (res) => {
        this.employeeCreatedRequests = res || [];
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load created overtime requests');
      }
    });
  }

  acceptRequest(requestId: string): void {
    // Use employee overtime endpoint which accepts status via query param
    this.attendanceService.approveEmployeeOvertime(requestId).pipe(take(1)).subscribe({
      next: () => {
        this.notification.showSuccess('Request approved');
        this.loadPendingRequests();
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to approve request');
      }
    });
  }

  acceptEmployeeRequest(requestId: string): void {
    if (!this.attendanceService.respondToAssignedOvertime) {
      console.warn('attendanceService.respondToAssignedOvertime() not implemented');
      return;
    }

    this.attendanceService.respondToAssignedOvertime(requestId, 'accept').pipe(take(1)).subscribe({
      next: () => {
        this.notification.showSuccess('Employee request approved');
        this.loadEmployeeAssignedRequests();
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to approve employee request');
      }
    });
  }

  rejectRequest(requestId: string): void {
    // Use employee overtime endpoint which accepts status via query param
    this.attendanceService.rejectEmployeeOvertime(requestId).pipe(take(1)).subscribe({
      next: () => {
        this.notification.showSuccess('Request rejected');
        this.loadPendingRequests();
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to reject request');
      }
    });
  }

  rejectEmployeeRequest(requestId: string): void {
    if (!this.attendanceService.respondToAssignedOvertime) {
      console.warn('attendanceService.respondToAssignedOvertime() not implemented');
      return;
    }

    this.attendanceService.respondToAssignedOvertime(requestId, 'reject').pipe(take(1)).subscribe({
      next: () => {
        this.notification.showSuccess('Employee request rejected');
        this.loadEmployeeAssignedRequests();
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to reject employee request');
      }
    });
  }

   hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Attendance', 'Overtime', actionKey);
  }

  selectTab(index: number): void {
    this.selectedTab = index;
  }

  getStatusClass(status?: string): string {
    if (!status) {
      return 'status-default';
    }
    switch (String(status).toLowerCase()) {
      case 'pending':
      case 'pending_approval':
        return 'status-pending';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return 'status-default';
    }
  }

}
