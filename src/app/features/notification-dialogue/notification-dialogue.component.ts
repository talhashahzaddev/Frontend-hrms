import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { ServerNotificationService } from '@core/services/server-notification';
import { AuthService } from '@core/services/auth.service';
import { ServerNotification } from '../../core/models/common.models';
import { LeaveService } from '../leave/services/leave.service';
import { AttendanceService } from '../attendance/services/attendance.service';
import { Output, EventEmitter } from '@angular/core';
import { RejectLeaveDialogComponent } from '../leave/components/reject-leave-dialog/reject-leave-dialog.component';
import { NotificationService } from '../../core/services/notification.service';
import { LeaveRequest } from '../../core/models/leave.models';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-notification-dialogue',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, MatButtonModule, MatIconModule, MatDividerModule, MatDialogModule],
  templateUrl: './notification-dialogue.component.html',
  styleUrls: ['./notification-dialogue.component.scss']
})
export class NotificationDialogueComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false;
  @Output() unreadCountChange = new EventEmitter<number>();
  @Output() close = new EventEmitter<void>();

  notification: ServerNotification[] = [];
  currentUser: any = null;

  // ✅ REMOVED: actionProcessed Set — no longer needed
  // actionProcessed = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(
    private serverNotificationService: ServerNotificationService,
    private attendanceService: AttendanceService,
    public leaveService: LeaveService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUserValue();

    this.serverNotificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notifications: ServerNotification[]) => {
        this.notification = notifications || [];
        this.unreadCountChange.emit(this.unreadCount);
      });

    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue) {
      this.loadNotifications();
    }
  }

  getSafeHtml(message: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(message);
  }

  get unreadCount(): number {
    const count = this.notification.filter(n => !n.isRead).length;
    this.unreadCountChange.emit(count);
    return count;
  }

  loadNotifications(): void {
    if (!this.currentUser?.userId) return;
    this.serverNotificationService.loadNotifications(this.currentUser.userId);
  }

  onNotificationClick(notification: ServerNotification): void {
    if (!notification.isRead) {
      this.serverNotificationService.markAsRead(notification.notificationid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            notification.isRead = true;
            this.unreadCountChange.emit(this.unreadCount);
            if (notification.redirectUrl) {
              this.router.navigateByUrl(notification.redirectUrl);
            }
          },
          error: (err) => {
            console.error('Failed to mark as read', err);
            if (notification.redirectUrl) {
              this.router.navigateByUrl(notification.redirectUrl);
            }
          }
        });
    } else if (notification.redirectUrl) {
      this.router.navigateByUrl(notification.redirectUrl);
    }
  }

  markAllAsRead(): void {
    this.notification.forEach(notification => {
      if (!notification.isRead) {
        this.serverNotificationService.markAsRead(notification.notificationid)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              notification.isRead = true;
              this.unreadCountChange.emit(this.unreadCount);
            },
            error: (err) => console.error('Failed to mark all as read', err)
          });
      }
    });
  }

  // -------------------------------------------------------
  // SWITCH-CASE FUNCTION FOR MODULE TYPE HANDLING
  // -------------------------------------------------------
  handleAction(n: ServerNotification, action: 'accept' | 'reject'): void {
    // ✅ REMOVED: actionProcessed.add() — no longer needed
    const moduleType = n.moduletype?.toLowerCase();

    switch (moduleType) {
      case 'leave':
        this.handleLeave(n, action);
        break;

      case 'attendance':
        this.handleAttendance(n, action);
        break;

      default:
        console.warn("Unknown module type:", moduleType);
        // ✅ REMOVED: actionProcessed.delete() — no longer needed
        break;
    }
  }

  // -------------------------------------------------------
  // LEAVE HANDLING
  // -------------------------------------------------------
  private handleLeave(notification: ServerNotification, action: 'accept' | 'reject'): void {
    const requestId = notification.requestid;

    if (!requestId) {
      this.notificationService.showError('Leave request ID not found in notification');
      return;
    }

    if (action === 'accept') {
      this.leaveService.approveLeaveRequest(requestId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Leave request approved successfully');
            // ✅ CHANGED: Set requestStatus instead of relying on isRead/actionProcessed
            notification.requestStatus = 'approved';
            notification.isRead = true;
            this.unreadCountChange.emit(this.unreadCount);
            this.loadNotifications();
          },
          error: (err) => {
            console.error("Approve failed", err);
            this.notificationService.showError('Failed to approve leave request');
          }
        });
    } else {
      this.leaveService.getLeaveRequest(requestId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (leaveRequest) => {
            this.openRejectDialog(leaveRequest, notification);
          },
          error: (err) => {
            console.error("Failed to fetch leave request", err);
            this.notificationService.showError('Failed to load leave request details');
          }
        });
    }
  }

  private openRejectDialog(leaveRequest: LeaveRequest, notification: ServerNotification): void {
    const dialogRef = this.dialog.open(RejectLeaveDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'attendance-dialog-panel',
      data: {
        employeeName: leaveRequest.employeeName || 'Employee',
        leaveTypeName: leaveRequest.leaveTypeName || 'Leave',
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        daysRequested: leaveRequest.daysRequested || 0
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result && result.rejected && notification.requestid) {
          this.leaveService.rejectLeaveRequest(notification.requestid, result.reason)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.notificationService.showSuccess('Leave request rejected successfully');
                // ✅ CHANGED: Set requestStatus
                notification.requestStatus = 'rejected';
                notification.isRead = true;
                this.unreadCountChange.emit(this.unreadCount);
                this.loadNotifications();
              },
              error: (err) => {
                console.error("Reject failed", err);
                this.notificationService.showError('Failed to reject leave request');
              }
            });
        }
      });
  }

  // -------------------------------------------------------
  // ATTENDANCE / SHIFT SWAP HANDLING
  // -------------------------------------------------------
  private handleAttendance(
    notification: ServerNotification,
    action: 'accept' | 'reject'
  ): void {
    const requestId = notification.requestid;

    if (!requestId) {
      this.notificationService.showError('Shift swap request ID not found');
      return;
    }

    if (!this.currentUser?.userId) {
      this.notificationService.showError('User not authenticated');
      return;
    }

    if (action === 'accept') {
      const payload = {
        requestId,
        approvedBy: this.currentUser.userId,
        isApproved: true,
        rejectionReason: ''
      };

      this.attendanceService.approvedshiftRequest(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: any) => {
            if (res.success) {
              this.notificationService.showSuccess('Shift swap approved successfully');
              // ✅ CHANGED: Set requestStatus
              notification.requestStatus = 'approved';
              notification.isRead = true;
              this.unreadCountChange.emit(this.unreadCount);
              this.loadNotifications();
            } else {
              this.notificationService.showError(res.message || 'Approval failed');
            }
          },
          error: (err) => {
            console.error('Approve shift swap failed', err);
            this.notificationService.showError('Failed to approve shift swap');
          }
        });

    } else {
      const rejectionReason =
        prompt('Enter rejection reason:', 'Not suitable for schedule') || '';

      const payload = {
        requestId,
        approvedBy: this.currentUser.userId,
        isApproved: false,
        rejectionReason
      };

      this.attendanceService.approvedshiftRequest(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: any) => {
            if (res.success) {
              this.notificationService.showSuccess('Shift swap rejected');
              // ✅ CHANGED: Set requestStatus
              notification.requestStatus = 'rejected';
              notification.isRead = true;
              this.unreadCountChange.emit(this.unreadCount);
              this.loadNotifications();
            } else {
              this.notificationService.showError(res.message || 'Rejection failed');
            }
          },
          error: (err) => {
            console.error('Reject shift swap failed', err);
            this.notificationService.showError('Failed to reject shift swap');
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
