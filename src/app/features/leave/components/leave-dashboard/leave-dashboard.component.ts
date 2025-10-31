import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { of, catchError } from 'rxjs';

import { LeaveService } from '../../services/leave.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ApplyLeaveComponent } from '../apply-leave/apply-leave.component';
import { 
  LeaveRequest, 
  LeaveType, 
  LeaveBalance,
  LeaveStatus
} from '../../../../core/models/leave.models';
import { User } from '../../../../core/models/auth.models';

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
    MatTabsModule,
    MatProgressBarModule,
    MatDialogModule
  ],
  template: `
    <div class="leave-dashboard-container">
      
      <!-- Header -->
      <div class="dashboard-header">
        <div class="header-content">
          <h1 class="page-title">
            <mat-icon>event_busy</mat-icon>
            Leave Management
          </h1>
          <p class="page-subtitle">Manage your time off requests and balances</p>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="openLeaveRequestDialog()">
            <mat-icon>add</mat-icon>
            Request Leave
          </button>
        </div>
      </div>

      <!-- Quick Navigation Cards -->
      <div class="quick-nav-grid">
        <mat-card class="nav-card" routerLink="/leave/apply">
          <mat-icon class="nav-icon" style="color: var(--primary-600)">add_circle</mat-icon>
          <h3>Apply for Leave</h3>
          <p>Submit a new leave request</p>
        </mat-card>

        <mat-card class="nav-card" routerLink="/leave/calendar">
          <mat-icon class="nav-icon" style="color: var(--success-600)">calendar_month</mat-icon>
          <h3>Leave Calendar</h3>
          <p>View team leave schedule</p>
        </mat-card>

        <mat-card class="nav-card" routerLink="/leave/team" *ngIf="hasManagerRole()">
          <mat-icon class="nav-icon" style="color: var(--warning-600)">pending_actions</mat-icon>
          <h3>Team Requests</h3>
          <p>Approve/reject team leaves</p>
          <mat-chip *ngIf="pendingCount > 0" color="warn" class="count-badge">
            {{ pendingCount }}
          </mat-chip>
        </mat-card>

        <mat-card class="nav-card" routerLink="/leave/types" *ngIf="hasAdminRole()">
          <mat-icon class="nav-icon" style="color: var(--purple-600)">category</mat-icon>
          <h3>Leave Types</h3>
          <p>Configure leave policies</p>
        </mat-card>
      </div>

      <!-- Leave Balance Section -->
      <div class="balance-section" *ngIf="leaveBalances.length > 0">
        <div class="section-header">
          <h2 class="section-title">Your Leave Balance</h2>
          <span class="year-badge">{{ currentYear }}</span>
        </div>
        
        <div class="balance-grid">
          <mat-card *ngFor="let balance of leaveBalances" class="balance-card">
            <div class="balance-header">
              <div class="type-info">
                <div class="type-indicator" [style.background-color]="balance.color"></div>
                <h3>{{ balance.leaveTypeName }}</h3>
              </div>
              <div class="balance-count">
                <span class="available">{{ balance.remainingDays }}</span>
                <span class="total">/ {{ balance.totalDays }}</span>
              </div>
            </div>
            
            <div class="balance-progress">
              <mat-progress-bar 
                mode="determinate" 
                [value]="getUsagePercentage(balance)"
                [color]="getProgressColor(balance)">
              </mat-progress-bar>
              <div class="progress-details">
                <span class="used">Used: {{ balance.usedDays }}</span>
                <span class="remaining">{{ balance.remainingDays }} days left</span>
              </div>
            </div>
          </mat-card>
        </div>
      </div>

      <!-- Main Content Tabs -->
      <mat-card class="main-content-card">
        <mat-tab-group [(selectedIndex)]="selectedTab">
          
          <!-- My Requests Tab -->
          <mat-tab label="My Requests">
            <div class="tab-content">
              
              <div class="table-container" *ngIf="!isLoading">
                <mat-table [dataSource]="myLeaveRequests" class="leave-requests-table">
                  
                  <ng-container matColumnDef="leaveType">
                    <mat-header-cell *matHeaderCellDef>Leave Type</mat-header-cell>
                    <mat-cell *matCellDef="let request">
                      <div class="leave-type-cell">
                        <div class="type-indicator" [style.background-color]="getLeaveTypeColor(request.leaveTypeId)"></div>
                        {{ request.leaveTypeName }}
                      </div>
                    </mat-cell>
                  </ng-container>

                  <ng-container matColumnDef="dates">
                    <mat-header-cell *matHeaderCellDef>Duration</mat-header-cell>
                    <mat-cell *matCellDef="let request">
                      <div class="dates-cell">
                        <div>{{ request.startDate | date:'mediumDate' }}</div>
                        <div class="date-separator">to</div>
                        <div>{{ request.endDate | date:'mediumDate' }}</div>
                        <div class="days-count">({{ request.daysRequested }} days)</div>
                      </div>
                    </mat-cell>
                  </ng-container>

                  <ng-container matColumnDef="status">
                    <mat-header-cell *matHeaderCellDef>Status</mat-header-cell>
                    <mat-cell *matCellDef="let request">
                      <mat-chip [color]="leaveService.getStatusColor(request.status)">
                        <mat-icon>{{ leaveService.getStatusIcon(request.status) }}</mat-icon>
                        {{ leaveService.getStatusLabel(request.status) }}
                      </mat-chip>
                    </mat-cell>
                  </ng-container>

                  <ng-container matColumnDef="submitted">
                    <mat-header-cell *matHeaderCellDef>Submitted</mat-header-cell>
                    <mat-cell *matCellDef="let request">
                      {{ request.submittedAt | date:'short' }}
                    </mat-cell>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <mat-header-cell *matHeaderCellDef>Actions</mat-header-cell>
                    <mat-cell *matCellDef="let request">
                      <button mat-icon-button [matMenuTriggerFor]="requestMenu">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #requestMenu="matMenu">
                        <button mat-menu-item (click)="viewRequest(request)">
                          <mat-icon>visibility</mat-icon>
                          View Details
                        </button>
                        <button mat-menu-item 
                                (click)="editRequest(request)"
                                [disabled]="!leaveService.isLeaveRequestEditable(request)">
                          <mat-icon>edit</mat-icon>
                          Edit Request
                        </button>
                        <!-- <button mat-menu-item 
                                (click)="cancelRequest(request)"
                                [disabled]="!leaveService.isLeaveRequestCancellable(request)"
                                class="delete-action">
                          <mat-icon>cancel</mat-icon>
                          Cancel Request
                        </button> -->
                      </mat-menu>
                    </mat-cell>
                  </ng-container>

                  <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
                  <mat-row *matRowDef="let row; columns: displayedColumns;"></mat-row>
                </mat-table>

                <div *ngIf="myLeaveRequests.length === 0" class="empty-state">
                  <mat-icon>event_busy</mat-icon>
                  <h3>No Leave Requests</h3>
                  <p>You haven't submitted any leave requests yet.</p>
                  <button mat-raised-button color="primary" (click)="openLeaveRequestDialog()">
                    <mat-icon>add</mat-icon>
                    Request Leave
                  </button>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Team Requests Tab (for managers) -->
          <mat-tab label="Team Requests" *ngIf="hasManagerRole()">
            <div class="tab-content">
              <div class="pending-approvals-section">
                <h3>Pending Approvals ({{ pendingApprovals.length }})</h3>
                
                <div *ngFor="let request of pendingApprovals" class="approval-card">
                  <div class="approval-header">
                    <div class="employee-info">
                      <div class="employee-avatar">
                        {{ getInitials(request.employeeName) }}
                      </div>
                      <div class="employee-details">
                        <h4>{{ request.employeeName }}</h4>
                        <p>{{ request.leaveTypeName }}</p>
                      </div>
                    </div>
                    <div class="leave-dates">
                      <span>{{ request.startDate | date:'mediumDate' }}</span>
                      <span class="separator">to</span>
                      <span>{{ request.endDate | date:'mediumDate' }}</span>
                      <span class="days-badge">({{ request.daysRequested }} days)</span>
                    </div>
                  </div>
                  
                  <div class="leave-reason" *ngIf="request.reason">
                    <strong>Reason:</strong> {{ request.reason }}
                  </div>
                  
                  <div class="approval-actions">
                    <button mat-stroked-button color="warn" (click)="rejectRequest(request)">
                      <mat-icon>close</mat-icon>
                      Reject
                    </button>
                    <button mat-raised-button color="primary" (click)="approveRequest(request)">
                      <mat-icon>check</mat-icon>
                      Approve
                    </button>
                  </div>
                </div>

                <div *ngIf="pendingApprovals.length === 0" class="empty-state">
                  <mat-icon>check_circle</mat-icon>
                  <h3>No Pending Approvals</h3>
                  <p>All leave requests have been processed.</p>
                </div>
              </div>
            </div>
          </mat-tab>

        </mat-tab-group>
      </mat-card>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="60"></mat-spinner>
        <p>Loading leave data...</p>
      </div>

    </div>
  `,
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
  pendingApprovals: LeaveRequest[] = [];

  isLoading = false;
  selectedTab = 0;
  currentYear = new Date().getFullYear();
  pendingCount = 0;

  displayedColumns: string[] = ['leaveType', 'dates', 'status', 'submitted', 'actions'];

  constructor(
    public leaveService: LeaveService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

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

  const requests: any = {
    leaveBalance: this.leaveService.getMyLeaveBalance().pipe(
      catchError(() => of([]))
    ),
    leaveTypes: this.leaveService.getLeaveTypes().pipe(
      catchError(() => of([]))
    ),
    myRequests: this.leaveService.getMyLeaveRequestsByToken().pipe(
      catchError(() => of([]))
    )
  };

  if (this.hasManagerRole()) {
    requests.pendingApprovals = this.leaveService.getPendingApprovals().pipe(
      catchError(() => of([]))
    );
  }

  forkJoin(requests)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data: any) => {
        this.leaveBalances = Array.isArray(data.leaveBalance) ? data.leaveBalance : [];
        this.leaveTypes = data.leaveTypes || [];
        this.myLeaveRequests = Array.isArray(data.myRequests) ? data.myRequests : [];
        this.pendingApprovals = Array.isArray(data.pendingApprovals) ? data.pendingApprovals : [];
        this.pendingCount = this.pendingApprovals.length;

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading leave data:', error);
        this.notificationService.showError('Failed to load leave data');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
}

  openLeaveRequestDialog(): void {
    const dialogRef = this.dialog.open(ApplyLeaveComponent, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: false,
      data: { 
        leaveTypes: this.leaveTypes,
        leaveBalances: this.leaveBalances 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInitialData();
      }
    });
  }

  viewRequest(request: LeaveRequest): void {
    this.notificationService.showInfo('View request details will be implemented');
  }

  editRequest(request: LeaveRequest): void {
    const dialogRef = this.dialog.open(ApplyLeaveComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { 
        request,
        leaveTypes: this.leaveTypes,
        leaveBalances: this.leaveBalances
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInitialData();
      }
    });
  }

  // cancelRequest(request: LeaveRequest): void {
  //   if (confirm('Are you sure you want to cancel this leave request?')) {
  //     this.leaveService.cancelLeaveRequest(request.requestId)
  //       .pipe(takeUntil(this.destroy$))
  //       .subscribe({
  //         next: () => {
  //           this.notificationService.showSuccess('Leave request cancelled successfully');
  //           this.loadInitialData();
  //         },
  //         error: (error) => {
  //           console.error('Error cancelling request:', error);
  //           this.notificationService.showError('Failed to cancel leave request');
  //         }
  //       });
  //   }
  // }

  approveRequest(request: LeaveRequest): void {
    this.leaveService.approveLeaveRequest(request.requestId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Leave request approved successfully');
          this.loadInitialData();
        },
        error: (error) => {
          console.error('Error approving request:', error);
          this.notificationService.showError('Failed to approve leave request');
        }
      });
  }

  rejectRequest(request: LeaveRequest): void {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      this.leaveService.rejectLeaveRequest(request.requestId, reason)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Leave request rejected');
            this.loadInitialData();
          },
          error: (error) => {
            console.error('Error rejecting request:', error);
            this.notificationService.showError('Failed to reject leave request');
          }
        });
    }
  }

  hasManagerRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager', 'Manager']);
  }

  hasAdminRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  getLeaveTypeColor(leaveTypeId: string): string {
    const leaveType = this.leaveTypes.find(lt => lt.leaveTypeId === leaveTypeId);
    return leaveType?.color || '#2196F3';
  }

  getUsagePercentage(balance: LeaveBalance): number {
    return balance.totalDays > 0 ? (balance.usedDays / balance.totalDays) * 100 : 0;
  }

  getProgressColor(balance: LeaveBalance): 'primary' | 'accent' | 'warn' {
    const percentage = this.getUsagePercentage(balance);
    if (percentage >= 90) return 'warn';
    if (percentage >= 70) return 'accent';
    return 'primary';
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}