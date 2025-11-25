import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { ServerNotificationService } from '@core/services/server-notification';
import { AuthService } from '@core/services/auth.service';
import { ServerNotification } from '../../core/models/common.models';
import { LeaveService } from '../leave/services/leave.service';
import  {AttendanceService} from '../attendance/services/attendance.service' 

@Component({
  selector: 'app-notification-dialogue',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDividerModule],
  templateUrl: './notification-dialogue.component.html',
  styleUrls: ['./notification-dialogue.component.scss']
})
export class NotificationDialogueComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false;

  notification: ServerNotification[] = [];
  currentUser: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    private serverNotificationService: ServerNotificationService,
    private attendanceService:AttendanceService,
    public leaveService: LeaveService,
    private router: Router ,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUserValue();
    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue) {
      this.loadNotifications();
    }
  }

  get unreadCount(): number {
    return this.notification.filter(n => !n.isRead).length;
  }

  loadNotifications(): void {
    if (!this.currentUser?.userId) return;

    this.serverNotificationService.getNotifications(this.currentUser.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: ServerNotification[]) => this.notification = res || [],
        error: (err) => console.error('Failed to load notifications', err)
      });
  }

 
onNotificationClick(notification: ServerNotification): void {
  // Mark as read if unread
  if (!notification.isRead) {
    this.serverNotificationService.markAsRead(notification.notificationid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => notification.isRead = true,
        error: (err) => console.error('Failed to mark as read', err)
      });
  }

  // Navigate inside Angular app if redirectUrl exists
  if (notification.redirectUrl) {
    this.router.navigateByUrl(notification.redirectUrl);
  }
}



  markAllAsRead(): void {
    this.notification.forEach(notification => {
      if (!notification.isRead) {
        this.serverNotificationService.markAsRead(notification.notificationid)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => notification.isRead = true,
            error: (err) => console.error('Failed to mark all as read', err)
          });
      }
    });
  }

  // -------------------------------------------------------
  // 🚀 NEW SWITCH-CASE FUNCTION FOR MODULE TYPE HANDLING
  // -------------------------------------------------------
  handleAction(n: ServerNotification, action: 'accept' | 'reject'): void {
    const moduleType = n.moduletype?.toLowerCase();

    switch (moduleType) {

      // LEAVE MODULE
      case 'leave':
        this.handleLeave(n.notificationid, action);
        break;

      // ATTENDANCE MODULE
      case 'attendance':
        this.handleAttendance(n.notificationid, action);
        break;

      default:
        console.warn("Unknown module type:", moduleType);
        break;
    }
  }

  // -------------------------------------------------------
  // 🚀 LEAVE HANDLING API CALLS
  // -------------------------------------------------------
  private handleLeave(notificationid: string | undefined, action: 'accept' | 'reject'): void {
    if (!notificationid) return;

    if (action === 'accept') {
      this.leaveService.approveLeaveRequest(notificationid)
        .subscribe({
          next: () => {
            alert("Leave Approved");
            const n = this.notification.find(x => x.notificationid === notificationid);
            if (n) n.isRead = true;
          },
          error: (err) => console.error("Approve failed", err)
        });
    } else {
      const reason = prompt("Enter reason for rejection:");
      if (reason === null) return;

      this.leaveService.rejectLeaveRequest(notificationid, reason)
        .subscribe({
          next: () => {
            alert("Leave Rejected");
            const n = this.notification.find(x => x.notificationid === notificationid);
            if (n) n.isRead = true;
          },
          error: (err) => console.error("Reject failed", err)
        });
    }
  }

  // -------------------------------------------------------
  // 🚀 ATTENDANCE MODULE HANDLING
  // -------------------------------------------------------
  private handleAttendance(notificationid: string | undefined, action: 'accept' | 'reject'): void {
    if (!notificationid) return;

    console.log("Attendance module:", action, notificationid);
    // Add attendance approve/reject APIs here
  }

 
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
