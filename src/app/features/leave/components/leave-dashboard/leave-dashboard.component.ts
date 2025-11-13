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
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { of, catchError } from 'rxjs';

import { LeaveService } from '../../services/leave.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RejectLeaveDialogComponent } from '../reject-leave-dialog/reject-leave-dialog.component';
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

      <!-- Quick Navigation Cards - Stat Cards Style -->
      <div class="quick-nav-grid">
        <mat-card class="stat-card stat-card-primary" routerLink="/leave/apply">
          <mat-card-content>
            <div class="stat-item">
              <div class="stat-icon-wrapper">
                <mat-icon class="stat-icon">add_circle</mat-icon>
              </div>
              <div class="stat-details">
                <div class="stat-label">Apply for Leave</div>
                <div class="stat-value">New</div>
                <div class="stat-footer">
                  <mat-icon class="stat-indicator">edit</mat-icon>
                  <span>Submit a new request</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card stat-card-success" routerLink="/leave/calendar">
          <mat-card-content>
            <div class="stat-item">
              <div class="stat-icon-wrapper">
                <mat-icon class="stat-icon">calendar_month</mat-icon>
              </div>
              <div class="stat-details">
                <div class="stat-label">Leave Calendar</div>
                <div class="stat-value">View</div>
                <div class="stat-footer">
                  <mat-icon class="stat-indicator">visibility</mat-icon>
                  <span>Team leave schedule</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card stat-card-warning" routerLink="/leave/team" *ngIf="hasManagerRole()">
          <mat-card-content>
            <div class="stat-item">
              <div class="stat-icon-wrapper">
                <mat-icon class="stat-icon">pending_actions</mat-icon>
              </div>
              <div class="stat-details">
                <div class="stat-label">Team Requests</div>
                <div class="stat-value">{{ pendingCount }}</div>
                <div class="stat-footer">
                  <mat-icon class="stat-indicator">notifications_active</mat-icon>
                  <span>Pending approvals</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card stat-card-info" routerLink="/leave/types" *ngIf="hasAdminRole()">
          <mat-card-content>
            <div class="stat-item">
              <div class="stat-icon-wrapper">
                <mat-icon class="stat-icon">category</mat-icon>
              </div>
              <div class="stat-details">
                <div class="stat-label">Leave Types</div>
                <div class="stat-value">{{ leaveTypes.length }}</div>
                <div class="stat-footer">
                  <mat-icon class="stat-indicator">settings</mat-icon>
                  <span>Configure policies</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Leave Balance Section - Stat Cards Style -->
      <div class="balance-section" *ngIf="leaveBalances.length > 0">
        <div class="section-header">
          <h2 class="section-title">Your Leave Balance</h2>
          <span class="year-badge">{{ currentYear }}</span>
        </div>
        
        <div class="statistics-cards">
          <mat-card *ngFor="let balance of leaveBalances; let i = index" 
                    class="stat-card stat-card-dynamic-color" 
                    [style.background]="getBalanceCardColor(balance)">
            <mat-card-content>
              <div class="stat-item">
                <div class="stat-icon-wrapper">
                  <mat-icon class="stat-icon">event_available</mat-icon>
                </div>
                <div class="stat-details">
                  <div class="stat-label">{{ balance.leaveTypeName }}</div>
                  <div class="stat-value">{{ balance.remainingDays }}</div>
                  <div class="stat-footer">
                    <mat-icon class="stat-indicator">{{getBalanceIcon(balance)}}</mat-icon>
                    <span>{{ balance.usedDays }} used of {{ balance.totalDays }} total</span>
                  </div>
                </div>
              </div>
            </mat-card-content>
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
    private router: Router,
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
    this.router.navigate(['/leave/apply']);
  }

  viewRequest(request: LeaveRequest): void {
    this.notificationService.showInfo('View request details will be implemented');
  }

  editRequest(request: LeaveRequest): void {
    // Navigate to edit page - will be implemented when edit route is added
    this.notificationService.showInfo('Edit functionality will be available soon');
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
    const dialogRef = this.dialog.open(RejectLeaveDialogComponent, {
      width: '650px',
      data: {
        employeeName: request.employeeName,
        leaveTypeName: request.leaveTypeName,
        startDate: request.startDate,
        endDate: request.endDate,
        daysRequested: request.daysRequested
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.rejected) {
        this.leaveService.rejectLeaveRequest(request.requestId, result.reason)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Leave request rejected successfully');
              this.loadInitialData();
            },
            error: (error) => {
              console.error('Error rejecting request:', error);
              this.notificationService.showError('Failed to reject leave request');
            }
          });
      }
    });
  }

  hasManagerRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager', 'Manager']);
  }

  hasAdminRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

getBalanceCardColor(balance: LeaveBalance): string {
    const leaveType = this.leaveTypes.find(lt => lt.typeName === balance.leaveTypeName);
    return leaveType?.color || '#2196F3'; // Default to blue if not found
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

  getCardColorClass(index: number): string {
    const colors = ['primary', 'success', 'warning', 'info'];
    return colors[index % colors.length];
  }

  getBalanceIcon(balance: LeaveBalance): string {
    const percentage = this.getUsagePercentage(balance);
    if (percentage >= 80) return 'trending_down';
    if (percentage >= 50) return 'remove';
    return 'trending_up';
  }
}