import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, inject, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subject, takeUntil, forkJoin, debounceTime, distinctUntilChanged } from 'rxjs';
import { of, catchError } from 'rxjs';

import { LeaveService } from '../../services/leave.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { RejectLeaveDialogComponent } from '../reject-leave-dialog/reject-leave-dialog.component';
import { ApproveLeaveDialogComponent } from '../approve-leave-dialog/approve-leave-dialog.component';
import { LeaveRequestDetailsDialogComponent } from '../leave-request-details-dialog/leave-request-details-dialog.component';
import {
  LeaveRequest,
  LeaveType,
  TeamRemainingLeaves
} from '../../../../core/models/leave.models';

@Component({
  selector: 'app-team-requests',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
  ],
  templateUrl: './team-requests.component.html',
  styleUrls: ['./team-requests.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamRequestsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private backendBaseUrl = 'https://localhost:60485';

  activeTab: 'pending' | 'balance' = 'pending';

  leaveTypes: LeaveType[] = [];
  pendingApprovals: LeaveRequest[] = [];

  teamRemainingLeaves: TeamRemainingLeaves[] = [];
  teamRemainingLeavesColumns: string[] = [];
  teamRemainingLeavesTotalCount = 0;
  teamRemainingLeavesPage = 1;
  teamRemainingLeavesPageSize = 10;
  teamRemainingLeavesPageSizeOptions = [5, 10, 25, 50];

  isLoading = false;
  isLoadingTeamLeaves = false;
  currentYear = new Date().getFullYear();

  employeeNameFilter = new FormControl('');

  constructor(
    public leaveService: LeaveService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.isLoading = true;

    forkJoin({
      leaveTypes:       this.leaveService.getLeaveTypes().pipe(catchError(() => of([]))),
      pendingApprovals: this.leaveService.getPendingApprovals().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.leaveTypes = data.leaveTypes || [];

          this.pendingApprovals = Array.isArray(data.pendingApprovals)
            ? data.pendingApprovals.map((req: any) => {
                req.leaveTypeName = req.leaveTypeName || req.typename || req.TypeName || '';
                if (req.profilePictureUrl) {
                  req.profilePreviewUrl = req.profilePictureUrl.startsWith('http')
                    ? req.profilePictureUrl
                    : `${this.backendBaseUrl}${req.profilePictureUrl}`;
                } else {
                  req.profilePreviewUrl = null;
                }
                return req;
              })
            : [];

          this.isLoading = false;
          this.cdr.markForCheck();
          this.loadTeamRemainingLeaves();
        },
        error: (error) => {
          console.error('Error loading team request data:', error);
          const msg = error?.error?.message || error?.message || 'Failed to load team data';
          this.notificationService.showError(msg);
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadTeamRemainingLeaves(): void {
    this.isLoadingTeamLeaves = true;
    const employeeName = this.employeeNameFilter.value?.trim() || undefined;

    this.leaveService
      .getTeamRemainingLeaves(
        this.currentYear,
        employeeName,
        this.teamRemainingLeavesPage,
        this.teamRemainingLeavesPageSize
      )
      .pipe(takeUntil(this.destroy$), catchError(() => of([])))
      .subscribe({
        next: (data) => {
          this.teamRemainingLeaves = data;

          if ((data as any).__pagination) {
            this.teamRemainingLeavesTotalCount = (data as any).__pagination.totalCount || 0;
          }

          if (this.teamRemainingLeaves.length > 0) {
            const allLeaveTypes = new Set<string>();
            this.teamRemainingLeaves.forEach(emp => {
              if (emp.leaveBalances && Array.isArray(emp.leaveBalances)) {
                emp.leaveBalances.forEach(b => allLeaveTypes.add(b.leaveTypeName));
              }
            });
            this.teamRemainingLeavesColumns = ['employeeName', ...Array.from(allLeaveTypes).sort()];
          } else {
            this.teamRemainingLeavesColumns = ['employeeName'];
          }

          this.isLoadingTeamLeaves = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading team remaining leaves:', error);
          const msg = error?.error?.message || error?.message || 'Failed to load team remaining leaves';
          this.notificationService.showError(msg);
          this.isLoadingTeamLeaves = false;
          this.cdr.markForCheck();
        }
      });
  }

  private setupFilters(): void {
    this.employeeNameFilter.valueChanges
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.teamRemainingLeavesPage = 1;
        this.loadTeamRemainingLeaves();
      });
  }

  clearFilters(): void {
    this.employeeNameFilter.setValue('');
    this.teamRemainingLeavesPage = 1;
    this.loadTeamRemainingLeaves();
  }

  onPageChange(event: PageEvent): void {
    this.teamRemainingLeavesPage = event.pageIndex + 1;
    this.teamRemainingLeavesPageSize = event.pageSize;
    this.loadTeamRemainingLeaves();
  }

  // ✅ Opens ApproveLeaveDialogComponent — API is called only after confirmation
  approveRequest(request: LeaveRequest): void {
    const dialogRef = this.dialog.open(ApproveLeaveDialogComponent, {
      width: '650px',
      data: {
        employeeName:  request.employeeName,
        leaveTypeName: request.leaveTypeName,
        startDate:     request.startDate,
        endDate:       request.endDate,
        daysRequested: request.daysRequested,
        reason:        request.reason
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result?.approved) {
          this.leaveService.approveLeaveRequest(request.requestId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.notificationService.showSuccess('Leave request approved successfully');
                this.loadInitialData();
              },
              error: (error) => {
                const msg = error?.error?.message || error?.message || 'Failed to approve leave request';
                this.notificationService.showError(msg);
              }
            });
        }
      });
  }

  rejectRequest(request: LeaveRequest): void {
    const dialogRef = this.dialog.open(RejectLeaveDialogComponent, {
      width: '650px',
      data: {
        employeeName:  request.employeeName,
        leaveTypeName: request.leaveTypeName,
        startDate:     request.startDate,
        endDate:       request.endDate,
        daysRequested: request.daysRequested
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result?.rejected) {
        this.leaveService.rejectLeaveRequest(request.requestId, result.reason)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Leave request rejected successfully');
              this.loadInitialData();
            },
            error: (error) => {
              const msg = error?.error?.message || error?.message || 'Failed to reject leave request';
              this.notificationService.showError(msg);
            }
          });
      }
    });
  }

  viewRequestDetails(request: LeaveRequest): void {
    this.dialog.open(LeaveRequestDetailsDialogComponent, {
      width: '650px',
      data: {
        employeeName:    request.employeeName,
        leaveTypeName:   request.leaveTypeName,
        leaveTypeColor:  this.getLeaveTypeColor(request.leaveTypeId),
        startDate:       request.startDate,
        endDate:         request.endDate,
        daysRequested:   request.daysRequested,
        reason:          request.reason,
        status:          request.status,
        submittedAt:     request.submittedAt,
        approverName:    request.approverName,
        approvedAt:      request.approvedAt,
        rejectionReason: request.rejectionReason
      }
    });
  }

  // ✅ View Details — always available regardless of status
  openDetailsDialog(request: LeaveRequest): void {
    this.dialog.open(LeaveRequestDetailsDialogComponent, {
      width: '650px',
      data: {
        employeeName:    request.employeeName,
        leaveTypeName:   request.leaveTypeName,
        leaveTypeColor:  this.getLeaveTypeColor(request.leaveTypeId),
        startDate:       request.startDate,
        endDate:         request.endDate,
        daysRequested:   request.daysRequested,
        status:          request.status,
        reason:          request.reason,
        submittedAt:     request.submittedAt,
        approverName:    request.approverName,
        approvedAt:      request.approvedAt,
        rejectionReason: request.rejectionReason,
        isSelfView:      false
      }
    });
  }

  getLeaveTypeColor(leaveTypeId: string): string {
    const lt = this.leaveTypes.find(t => t.leaveTypeId === leaveTypeId);
    return lt?.color || '#2196F3';
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getLeaveTypeColumns(): string[] {
    return this.teamRemainingLeavesColumns.filter(c => c !== 'employeeName');
  }

  getLeaveTypeTotal(leaveTypeName: string): number {
    if (!this.teamRemainingLeaves.length) return 0;
    const balance = this.teamRemainingLeaves[0].leaveBalances?.find(b => b.leaveTypeName === leaveTypeName);
    return balance?.totalDays ?? 0;
  }

  getEmployeeLeaveBalance(employeeId: string, leaveTypeName: string): number {
    const emp = this.teamRemainingLeaves.find(e => e.employeeId === employeeId);
    if (!emp) return 0;
    const balance = emp.leaveBalances?.find(b => b.leaveTypeName === leaveTypeName);
    return balance?.remainingDays ?? 0;
  }
}
