import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';

import { LeaveService } from '../../services/leave.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { 
  LeaveRequest, 
  LeaveStatus,
  LeaveSearchRequest,
  LeaveListResponse,
  LeaveType
} from '../../../../core/models/leave.models';

@Component({
  selector: 'app-team-leaves',
  standalone: true,
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
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatTabsModule,
    MatDialogModule,
    MatExpansionModule
  ],
  template: `
    <div class="team-leaves-container">
      
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">
            <mat-icon>groups</mat-icon>
            Team Leave Management
          </h1>
          <p class="page-subtitle">Review and manage your team's leave requests</p>
        </div>
      </div>

      <!-- Filters Section -->
      <mat-card class="filters-card">
        <mat-card-content>
          <form [formGroup]="filterForm" class="filters-form">
            
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Search</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput formControlName="search" placeholder="Search by employee name...">
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Status</mat-label>
              <mat-icon matPrefix>filter_list</mat-icon>
              <mat-select formControlName="status">
                <mat-option value="">All Status</mat-option>
                <mat-option value="pending">Pending</mat-option>
                <mat-option value="approved">Approved</mat-option>
                <mat-option value="rejected">Rejected</mat-option>
                <mat-option value="cancelled">Cancelled</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-stroked-button 
                    type="button" 
                    (click)="clearFilters()"
                    class="clear-button">
              <mat-icon>clear</mat-icon>
              Clear Filters
            </button>

          </form>
        </mat-card-content>
      </mat-card>

      <!-- Pending Approvals Section -->
      <mat-card class="pending-card" *ngIf="pendingApprovals.length > 0">
        <mat-card-header>
          <mat-card-title>
            <mat-icon class="pending-icon">pending_actions</mat-icon>
            Pending Approvals ({{ pendingApprovals.length }})
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="pending-list">
            <div *ngFor="let request of pendingApprovals" class="pending-item">
              <div class="item-header">
                <div class="employee-info">
                  <div class="employee-avatar">
                    {{ getInitials(request.employeeName) }}
                  </div>
                  <div class="employee-details">
                    <h4 class="employee-name">{{ request.employeeName }}</h4>
                    <p class="leave-type">
                      <span class="type-indicator" [style.background-color]="getLeaveTypeColor(request.leaveTypeId)"></span>
                      {{ request.leaveTypeName }}
                    </p>
                  </div>
                </div>
                <div class="request-dates">
                  <div class="date-badge">
                    <mat-icon>event</mat-icon>
                    <span>{{ request.startDate | date:'MMM d' }} - {{ request.endDate | date:'MMM d, y' }}</span>
                  </div>
                  <div class="days-badge">
                    {{ request.daysRequested }} {{ request.daysRequested === 1 ? 'day' : 'days' }}
                  </div>
                </div>
              </div>

              <div class="item-content" *ngIf="request.reason">
                <p class="reason-label">Reason:</p>
                <p class="reason-text">{{ request.reason }}</p>
              </div>

              <div class="item-footer">
                <div class="submitted-info">
                  <mat-icon>schedule</mat-icon>
                  <span>Submitted {{ request.submittedAt | date:'short' }}</span>
                </div>
                <div class="action-buttons">
                  <button mat-stroked-button 
                          color="warn" 
                          (click)="openRejectDialog(request)"
                          [disabled]="isProcessing">
                    <mat-icon>close</mat-icon>
                    Reject
                  </button>
                  <button mat-raised-button 
                          color="primary" 
                          (click)="approveRequest(request)"
                          [disabled]="isProcessing">
                    <mat-icon>check</mat-icon>
                    Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- All Requests Table -->
      <mat-card class="requests-table-card">
        <mat-card-header>
          <mat-card-title>All Team Requests</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          
          <div class="table-container" *ngIf="!isLoading">
            <mat-table [dataSource]="teamRequests" class="team-requests-table">
              
              <ng-container matColumnDef="employee">
                <mat-header-cell *matHeaderCellDef>Employee</mat-header-cell>
                <mat-cell *matCellDef="let request">
                  <div class="employee-cell">
                    <div class="employee-avatar-small">
                      {{ getInitials(request.employeeName) }}
                    </div>
                    <span>{{ request.employeeName }}</span>
                  </div>
                </mat-cell>
              </ng-container>

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
                  <button mat-icon-button [matMenuTriggerFor]="menu">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item (click)="viewRequestDetails(request)">
                      <mat-icon>visibility</mat-icon>
                      View Details
                    </button>
                    <button mat-menu-item 
                            *ngIf="isPending(request.status)"
                            (click)="approveRequest(request)">
                      <mat-icon>check_circle</mat-icon>
                      Approve
                    </button>
                    <button mat-menu-item 
                            *ngIf="isPending(request.status)"
                            (click)="openRejectDialog(request)">
                      <mat-icon>cancel</mat-icon>
                      Reject
                    </button>
                  </mat-menu>
                </mat-cell>
              </ng-container>

              <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
              <mat-row *matRowDef="let row; columns: displayedColumns;"></mat-row>
            </mat-table>

            <!-- Empty State -->
            <div *ngIf="teamRequests.length === 0" class="empty-state">
              <mat-icon>inbox</mat-icon>
              <h3>No Team Requests</h3>
              <p>There are no leave requests to display.</p>
            </div>
          </div>

          <!-- Loading State -->
          <div *ngIf="isLoading" class="loading-container">
            <mat-spinner diameter="50"></mat-spinner>
            <p>Loading team requests...</p>
          </div>

          <!-- Pagination -->
          <mat-paginator 
            *ngIf="totalCount > 0"
            [length]="totalCount"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 25, 50, 100]"
            [pageIndex]="currentPage - 1"
            (page)="onPageChange($event)"
            showFirstLastButtons>
          </mat-paginator>

        </mat-card-content>
      </mat-card>

    </div>
  `,
  styles: [`
    .team-leaves-container {
      padding: var(--spacing-lg);
      min-height: calc(100vh - 64px);
      background: var(--gray-50);
    }

    .page-header {
      margin-bottom: var(--spacing-2xl);

      .header-content {
        .page-title {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 2rem;
          font-weight: 700;
          color: var(--gray-900);
          margin: 0 0 var(--spacing-sm);

          mat-icon {
            color: var(--primary-600);
            font-size: 2rem;
            width: 2rem;
            height: 2rem;
          }
        }

        .page-subtitle {
          font-size: 1.125rem;
          color: var(--gray-600);
          margin: 0;
        }
      }
    }

    .filters-card {
      margin-bottom: var(--spacing-xl);
      border-radius: var(--radius-xl);

      ::ng-deep .mat-mdc-card-content {
        padding: var(--spacing-lg);
      }
    }

    .filters-form {
      display: flex;
      gap: var(--spacing-lg);
      align-items: center;
      flex-wrap: wrap;

      .filter-field {
        flex: 1;
        min-width: 200px;
      }

      .clear-button {
        height: 48px;
        border-radius: var(--radius-lg);
      }
    }

    .pending-card {
      margin-bottom: var(--spacing-xl);
      border-radius: var(--radius-xl);
      border: 2px solid var(--warning-300);

      ::ng-deep {
        .mat-mdc-card-header {
          padding: var(--spacing-lg);
          background: var(--warning-50);
          border-bottom: 1px solid var(--warning-200);

          .mat-mdc-card-title {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--warning-900);
            margin: 0;

            .pending-icon {
              color: var(--warning-600);
            }
          }
        }

        .mat-mdc-card-content {
          padding: var(--spacing-lg);
        }
      }
    }

    .pending-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .pending-item {
      padding: var(--spacing-lg);
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-lg);
      background: white;
      transition: all 0.2s ease;

      &:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--primary-300);
      }

      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-md);
        flex-wrap: wrap;
        gap: var(--spacing-md);
      }

      .employee-info {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);

        .employee-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--primary-100);
          color: var(--primary-700);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1.125rem;
        }

        .employee-details {
          .employee-name {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--gray-900);
            margin: 0 0 var(--spacing-xs);
          }

          .leave-type {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
            font-size: 0.875rem;
            color: var(--gray-600);
            margin: 0;

            .type-indicator {
              width: 10px;
              height: 10px;
              border-radius: 50%;
            }
          }
        }
      }

      .request-dates {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--spacing-xs);

        .date-badge {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--gray-100);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          color: var(--gray-700);

          mat-icon {
            font-size: 1rem;
            width: 1rem;
            height: 1rem;
          }
        }

        .days-badge {
          padding: var(--spacing-xs) var(--spacing-md);
          background: var(--primary-100);
          color: var(--primary-800);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }
      }

      .item-content {
        padding: var(--spacing-md);
        background: var(--gray-50);
        border-radius: var(--radius-md);
        margin-bottom: var(--spacing-md);

        .reason-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--gray-600);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 var(--spacing-xs);
        }

        .reason-text {
          font-size: 0.875rem;
          color: var(--gray-800);
          line-height: 1.5;
          margin: 0;
        }
      }

      .item-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--spacing-md);

        .submitted-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          font-size: 0.875rem;
          color: var(--gray-600);

          mat-icon {
            font-size: 1rem;
            width: 1rem;
            height: 1rem;
          }
        }

        .action-buttons {
          display: flex;
          gap: var(--spacing-sm);

          button {
            font-weight: 600;
            border-radius: var(--radius-lg);
          }
        }
      }
    }

    .requests-table-card {
      border-radius: var(--radius-xl);

      ::ng-deep {
        .mat-mdc-card-header {
          padding: var(--spacing-lg);
          border-bottom: 1px solid var(--gray-200);

          .mat-mdc-card-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--gray-900);
            margin: 0;
          }
        }

        .mat-mdc-card-content {
          padding: 0;
        }
      }
    }

    .table-container {
      overflow-x: auto;
    }

    .team-requests-table {
      width: 100%;

      .employee-cell {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);

        .employee-avatar-small {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary-100);
          color: var(--primary-700);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
        }
      }

      .leave-type-cell {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);

        .type-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
      }

      .dates-cell {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 0.875rem;

        .date-separator {
          color: var(--gray-500);
          font-size: 0.75rem;
        }

        .days-count {
          color: var(--gray-600);
          font-size: 0.75rem;
        }
      }
    }

    .empty-state {
      text-align: center;
      padding: var(--spacing-4xl);

      mat-icon {
        font-size: 4rem;
        width: 4rem;
        height: 4rem;
        color: var(--gray-400);
        margin-bottom: var(--spacing-lg);
      }

      h3 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--gray-900);
        margin: 0 0 var(--spacing-md);
      }

      p {
        font-size: 1rem;
        color: var(--gray-600);
        margin: 0;
      }
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-4xl);
      gap: var(--spacing-lg);

      p {
        color: var(--gray-600);
      }
    }

    @media (max-width: 768px) {
      .team-leaves-container {
        padding: var(--spacing-md);
      }

      .filters-form {
        flex-direction: column;
        align-items: stretch;

        .filter-field,
        .clear-button {
          width: 100%;
        }
      }

      .pending-item {
        .item-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .request-dates {
          align-items: flex-start;
        }

        .item-footer {
          flex-direction: column;
          align-items: stretch;

          .action-buttons {
            width: 100%;

            button {
              flex: 1;
            }
          }
        }
      }
    }
  `]
})
export class TeamLeavesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  filterForm!: FormGroup;
  
  pendingApprovals: LeaveRequest[] = [];
  teamRequests: LeaveRequest[] = [];
  leaveTypes: LeaveType[] = [];
  
  isLoading = false;
  isProcessing = false;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  
  displayedColumns: string[] = ['employee', 'leaveType', 'dates', 'status', 'submitted', 'actions'];

  constructor(
    private fb: FormBuilder,
    public leaveService: LeaveService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.initializeFilterForm();
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFilterListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFilterForm(): void {
    this.filterForm = this.fb.group({
      search: [''],
      status: ['']
    });
  }

  private setupFilterListeners(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadTeamRequests();
      });
  }

  private loadInitialData(): void {
    // Load leave types and pending approvals
    forkJoin({
      leaveTypes: this.leaveService.getLeaveTypes(),
      pendingApprovals: this.leaveService.getPendingApprovals()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.leaveTypes = data.leaveTypes || [];
          this.pendingApprovals = Array.isArray(data.pendingApprovals) ? data.pendingApprovals : [];
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading initial data:', error);
        }
      });

    this.loadTeamRequests();
  }

  private loadTeamRequests(): void {
    this.isLoading = true;

    const searchRequest: LeaveSearchRequest = {
      status: this.filterForm.get('status')?.value || undefined,
      page: this.currentPage,
      pageSize: this.pageSize,
      sortBy: 'submittedAt',
      sortDirection: 'desc'
    };

    this.leaveService.getLeaveRequests(searchRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: LeaveListResponse) => {
          // API returns data in response.data, not response.leaveRequests
          this.teamRequests = response.data || [];
          this.totalCount = response.totalCount;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading team requests:', error);
          this.notificationService.showError('Failed to load team requests');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  approveRequest(request: LeaveRequest): void {
    if (confirm(`Approve leave request for ${request.employeeName}?`)) {
      this.isProcessing = true;
      
      this.leaveService.approveLeaveRequest(request.requestId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Leave request approved successfully');
            this.isProcessing = false;
            this.loadInitialData();
          },
          error: (error) => {
            console.error('Error approving request:', error);
            this.notificationService.showError('Failed to approve leave request');
            this.isProcessing = false;
          }
        });
    }
  }

  openRejectDialog(request: LeaveRequest): void {
    const reason = prompt(`Provide reason for rejecting ${request.employeeName}'s leave request:`);
    
    if (reason && reason.trim()) {
      this.isProcessing = true;
      
      this.leaveService.rejectLeaveRequest(request.requestId, reason)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Leave request rejected');
            this.isProcessing = false;
            this.loadInitialData();
          },
          error: (error) => {
            console.error('Error rejecting request:', error);
            this.notificationService.showError('Failed to reject leave request');
            this.isProcessing = false;
          }
        });
    }
  }

  viewRequestDetails(request: LeaveRequest): void {
    this.notificationService.showInfo('Request details dialog will be implemented');
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      status: ''
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadTeamRequests();
  }

  isPending(status: string): boolean {
    return status.toLowerCase() === 'pending';
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

  getLeaveTypeColor(leaveTypeId: string): string {
    const leaveType = this.leaveTypes.find(lt => lt.leaveTypeId === leaveTypeId);
    return leaveType?.color || '#2196F3';
  }
}