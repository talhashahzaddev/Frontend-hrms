import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { LeaveService } from '../../services/leave.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  LeaveRequest, 
  LeaveType, 
  LeaveBalance, 
  LeaveEntitlement,
  CreateLeaveRequest,
  LeaveStatus
} from '../../../../core/models/leave.models';
import { User } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-leave-dashboard',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
    MatTabsModule,
    MatProgressBarModule
  ],
  template: `
    <div class="leave-dashboard-container">
      
      <!-- Header -->
      <div class="dashboard-header">
        <h1 class="page-title">
          <mat-icon>event_busy</mat-icon>
          Leave Management
        </h1>
        <button mat-raised-button color="primary" (click)="openLeaveRequestDialog()">
          <mat-icon>add</mat-icon>
          Request Leave
        </button>
      </div>

      <!-- Leave Balance Section -->
      <div class="balance-section" *ngIf="leaveBalance">
        <h2 class="section-title">Your Leave Balance</h2>
        <div class="balance-grid">
          <mat-card *ngFor="let entitlement of leaveBalance.entitlements" class="balance-card">
            <mat-card-content>
              <div class="balance-header">
                <h3>{{ entitlement.leaveTypeName }}</h3>
                <mat-chip [style.background-color]="getLeaveTypeColor(entitlement.leaveTypeId)">
                  {{ entitlement.remainingDays }} days left
                </mat-chip>
              </div>
              
              <div class="balance-progress">
                <mat-progress-bar 
                  mode="determinate" 
                  [value]="getUsagePercentage(entitlement)"
                  [color]="getProgressColor(entitlement)">
                </mat-progress-bar>
                <div class="progress-labels">
                  <span>Used: {{ entitlement.usedDays }}</span>
                  <span>Total: {{ entitlement.totalDays }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Main Content Tabs -->
      <mat-card class="main-content-card">
        <mat-tab-group>
          
          <!-- My Requests Tab -->
          <mat-tab label="My Requests">
            <div class="tab-content">
              
              <!-- Requests Table -->
              <div class="table-container">
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
                    <mat-header-cell *matHeaderCellDef>Dates</mat-header-cell>
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
                        {{ request.status | titlecase }}
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
                        <button mat-menu-item 
                                (click)="cancelRequest(request)"
                                [disabled]="!leaveService.isLeaveRequestCancellable(request)"
                                class="delete-action">
                          <mat-icon>cancel</mat-icon>
                          Cancel Request
                        </button>
                      </mat-menu>
                    </mat-cell>
                  </ng-container>

                  <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
                  <mat-row *matRowDef="let row; columns: displayedColumns;"></mat-row>
                </mat-table>

                <!-- Empty State -->
                <div *ngIf="!myLeaveRequests.length && !isLoading" class="empty-state">
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
                <h3>Pending Approvals</h3>
                
                <div *ngFor="let request of pendingApprovals" class="approval-card">
                  <mat-card>
                    <mat-card-content>
                      <div class="approval-header">
                        <div class="employee-info">
                          <h4>{{ request.employeeName }}</h4>
                          <p>{{ request.leaveTypeName }}</p>
                        </div>
                        <div class="leave-dates">
                          <span>{{ request.startDate | date:'mediumDate' }}</span>
                          <span>to</span>
                          <span>{{ request.endDate | date:'mediumDate' }}</span>
                          <span class="days-badge">({{ request.daysRequested }} days)</span>
                        </div>
                      </div>
                      
                      <div class="leave-reason" *ngIf="request.reason">
                        <strong>Reason:</strong> {{ request.reason }}
                      </div>
                      
                      <div class="approval-actions">
                        <button mat-raised-button color="primary" (click)="approveRequest(request)">
                          <mat-icon>check</mat-icon>
                          Approve
                        </button>
                        <button mat-stroked-button color="warn" (click)="rejectRequest(request)">
                          <mat-icon>close</mat-icon>
                          Reject
                        </button>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>

                <div *ngIf="!pendingApprovals.length" class="empty-state">
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

  // Data properties
  currentUser: User | null = null;
  leaveBalance: LeaveBalance | null = null;
  leaveTypes: LeaveType[] = [];
  myLeaveRequests: LeaveRequest[] = [];
  pendingApprovals: LeaveRequest[] = [];

  // UI state
  isLoading = false;
  selectedTab = 0;

  // Table configuration
  displayedColumns: string[] = ['leaveType', 'dates', 'status', 'submitted', 'actions'];

  // Forms
  leaveRequestForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public leaveService: LeaveService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.leaveRequestForm = this.fb.group({
      leaveTypeId: ['', [Validators.required]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      reason: ['']
    });
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUserValue();
  }

  private loadInitialData(): void {
    this.isLoading = true;

    forkJoin({
      leaveBalance: this.leaveService.getMyLeaveBalance(),
      leaveTypes: this.leaveService.getLeaveTypes(),
      myRequests: this.leaveService.getMyLeaveRequests(),
      pendingApprovals: this.hasManagerRole() ? this.leaveService.getPendingApprovals() : []
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.leaveBalance = data.leaveBalance;
        this.leaveTypes = data.leaveTypes;
        this.myLeaveRequests = data.myRequests;
        this.pendingApprovals = Array.isArray(data.pendingApprovals) ? data.pendingApprovals : [];
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
    // Open dialog for creating leave request
    this.notificationService.showInfo('Leave request dialog will be implemented');
  }

  viewRequest(request: LeaveRequest): void {
    // Open dialog to view request details
    this.notificationService.showInfo('View request details will be implemented');
  }

  editRequest(request: LeaveRequest): void {
    // Open dialog to edit request
    this.notificationService.showInfo('Edit request will be implemented');
  }

  cancelRequest(request: LeaveRequest): void {
    if (confirm('Are you sure you want to cancel this leave request?')) {
      this.leaveService.cancelLeaveRequest(request.requestId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Leave request cancelled successfully');
            this.loadInitialData();
          },
          error: (error) => {
            console.error('Error cancelling request:', error);
            this.notificationService.showError('Failed to cancel leave request');
          }
        });
    }
  }

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

  getLeaveTypeColor(leaveTypeId: string): string {
    const leaveType = this.leaveTypes.find(lt => lt.leaveTypeId === leaveTypeId);
    return leaveType?.color || '#2196F3';
  }

  getUsagePercentage(entitlement: LeaveEntitlement): number {
    return entitlement.totalDays > 0 ? (entitlement.usedDays / entitlement.totalDays) * 100 : 0;
  }

  getProgressColor(entitlement: LeaveEntitlement): 'primary' | 'accent' | 'warn' {
    const percentage = this.getUsagePercentage(entitlement);
    if (percentage >= 90) return 'warn';
    if (percentage >= 70) return 'accent';
    return 'primary';
  }
}