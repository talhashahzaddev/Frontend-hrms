import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { of, catchError } from 'rxjs';

import { LeaveService } from '../../services/leave.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RejectLeaveDialogComponent } from '../reject-leave-dialog/reject-leave-dialog.component';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import {
  LeaveRequest,
  LeaveType,
  LeaveBalance,
} from '../../../../core/models/leave.models';
import { User } from '../../../../core/models/auth.models';
import { ApplyLeaveComponent } from '../apply-leave/apply-leave.component';

@Component({
  selector: 'app-leave-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
  ],
  templateUrl: './leave-dashboard.component.html',
  styleUrls: ['./leave-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeaveDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  currentUser: User | null = null;
  leaveBalances: LeaveBalance[] = [];
  leaveTypes: LeaveType[] = [];
  myLeaveRequests: LeaveRequest[] = [];

  isLoading = false;
  currentYear = new Date().getFullYear();

  displayedColumns: string[] = ['leaveType', 'dates', 'status', 'submitted', 'actions'];

  constructor(
    public leaveService: LeaveService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUserValue();
  }

  private loadInitialData(): void {
    this.isLoading = true;

    forkJoin({
      leaveBalance: this.leaveService.getMyLeaveBalance().pipe(catchError(() => of([]))),
      leaveTypes:   this.leaveService.getLeaveTypes().pipe(catchError(() => of([]))),
      myRequests:   this.leaveService.getMyLeaveRequestsByToken().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.leaveBalances    = Array.isArray(data.leaveBalance) ? data.leaveBalance : [];
          this.leaveTypes       = data.leaveTypes || [];
          this.myLeaveRequests  = Array.isArray(data.myRequests)  ? data.myRequests  : [];
          this.isLoading        = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading leave data:', error);
          const errorMessage = error?.error?.message || error?.message || 'Failed to load leave data';
          this.notificationService.showError(errorMessage);
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  openLeaveRequestDialog(): void {
    const dialogRef = this.dialog.open(ApplyLeaveComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) { this.loadInitialData(); }
    });
  }

  editRequest(request: LeaveRequest): void {
    const dialogRef = this.dialog.open(ApplyLeaveComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      panelClass: 'custom-dialog-container',
      data: { requestId: request.requestId }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) { this.loadInitialData(); }
    });
  }

  cancelRequest(request: LeaveRequest): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Cancel Leave Request',
      message: 'Are you sure you want to cancel this leave request?',
      itemName: `${request.leaveTypeName} - ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()}`
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result === true) {
        this.leaveService.cancelLeaveRequest(request.requestId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Leave request cancelled successfully');
              this.loadInitialData();
            },
            error: (error) => {
              const errorMessage = error?.error?.message || error?.message || 'Failed to cancel leave request';
              this.notificationService.showError(errorMessage);
            }
          });
      }
    });
  }

  isPending(status: string): boolean {
    return status?.toLowerCase() === 'pending';
  }

  // ── Balance card helpers ─────────────────────────────────────────────────────

  getBalanceCardColor(balance: LeaveBalance): string {
    const leaveType = this.leaveTypes.find(lt => lt.typeName === balance.leaveTypeName);
    return leaveType?.color || '#2196F3';
  }

  getLeaveTypeColor(leaveTypeId: string): string {
    const leaveType = this.leaveTypes.find(lt => lt.leaveTypeId === leaveTypeId);
    return leaveType?.color || '#2196F3';
  }

  getUsagePercentage(balance: LeaveBalance): number {
    return balance.totalDays > 0 ? (balance.usedDays / balance.totalDays) * 100 : 0;
  }

  getBalanceIcon(balance: LeaveBalance): string {
    const pct = this.getUsagePercentage(balance);
    if (pct >= 80) return 'trending_down';
    if (pct >= 50) return 'remove';
    return 'trending_up';
  }
}
