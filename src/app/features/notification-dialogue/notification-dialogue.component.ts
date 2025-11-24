import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil } from 'rxjs';

import { ServerNotificationService } from '@core/services/server-notification';
import { AuthService } from '@core/services/auth.service';
import { ServerNotification } from '../../core/models/common.models';
import { LeaveService } from '../leave/services/leave.service';


@Component({
  selector: 'app-notification-dialogue',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDividerModule],
  templateUrl: './notification-dialogue.component.html',
  styleUrls: ['./notification-dialogue.component.scss']
})
export class NotificationDialogueComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false; // Control from parent (header)

  notification: ServerNotification[] = [];
  currentUser: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    private serverNotificationService: ServerNotificationService,
     public leaveService: LeaveService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUserValue();
    if (this.isOpen) {
      this.loadNotifications();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue) {
      this.loadNotifications();
    }
  }

  // Count of unread notifications
  get unreadCount(): number {
    return this.notification.filter(n => !n.isRead).length;
  }

  // Fetch notifications from backend
  loadNotifications(): void {
    if (!this.currentUser?.userId) return;

    this.serverNotificationService.getNotifications(this.currentUser.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: ServerNotification[]) => this.notification = res || [],
        error: (err) => console.error('Failed to load notifications', err)
      });
  }

  // Click on single notification
  onNotificationClick(notification: ServerNotification): void {
    if (!notification.isRead) {
      this.serverNotificationService.markAsRead(notification.notificationid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => notification.isRead = true,
          error: (err) => console.error('Failed to mark notification as read', err)
        });
    }

    if (notification.redirectUrl) {
      window.open(notification.redirectUrl, '_blank');
    }
  }

  // Mark all as read
  markAllAsRead(): void {
    this.notification.forEach(notification => {
      if (!notification.isRead) {
        this.serverNotificationService.markAsRead(notification.notificationid)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => notification.isRead = true,
            error: (err) => console.error('Failed to mark notification as read', err)
          });
      }
    });
  }

approveLeave(requestId?: string): void {
  if (!requestId) return;

  this.leaveService.approveLeaveRequest(requestId)
    .subscribe({
      next: () => {
        alert('Leave Approved');
        // Optional: mark notification as read
        const n = this.notification.find(x => x.requestid === requestId);
        if (n) n.isRead = true;
      },
      error: (err) => console.error('Approve failed', err)
    });
}

rejectLeave(requestId?: string): void {
  if (!requestId) return;

  // Optional: ask for reason
  const reason = prompt('Please enter reason for rejection:');
  if (reason === null) return; // user canceled

  this.leaveService.rejectLeaveRequest(requestId, reason)
    .subscribe({
      next: () => {
        alert('Leave Rejected');
        // Optional: mark notification as read
        const n = this.notification.find(x => x.requestid === requestId);
        if (n) n.isRead = true;
      },
      error: (err) => console.error('Reject failed', err)
    });
}



  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
