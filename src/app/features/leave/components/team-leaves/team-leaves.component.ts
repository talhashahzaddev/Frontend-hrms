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
import { RejectLeaveDialogComponent } from '../reject-leave-dialog/reject-leave-dialog.component';
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
  templateUrl: './team-leaves.component.html',
  styleUrls: ['./team-leaves.component.scss']
})
export class TeamLeavesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  filterForm!: FormGroup;

  pendingApprovals: LeaveRequest[] = [];
  teamRequests: LeaveRequest[] = [];
  leaveTypes: LeaveType[] = [];
  profilePreviewUrl: string | null = null;
  private backendBaseUrl = 'https://localhost:60485';


  isLoading = false;
  isProcessing = false;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;

  displayedColumns: string[] = ['employee', 'leaveType', 'dates', 'status', 'submitted', 'actions'];
  isHRManager = false;

  constructor(
    private fb: FormBuilder,
    public leaveService: LeaveService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.initializeFilterForm();
    this.checkUserRole();
  }

  private checkUserRole(): void {
    this.isHRManager = this.authService.hasAnyRole(['HR Manager', 'Super Admin']);
    // Update displayed columns based on role
    if (this.isHRManager) {
      this.displayedColumns = ['employee', 'leaveType', 'dates', 'status', 'submitted', 'actions'];
    }
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
    // Load leave types
    this.leaveService.getLeaveTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (leaveTypes) => {
          this.leaveTypes = leaveTypes || [];
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading leave types:', error);
        }
      });

    // Load pending approvals only for Managers (not HR Manager)
    if (!this.isHRManager) {
      this.leaveService.getPendingApprovals()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (pendingApprovals) => {
            // Handle both camelCase and PascalCase from API
            this.pendingApprovals = Array.isArray(pendingApprovals)
              ? pendingApprovals.map((employee: any) => {
                const mappedRequest: LeaveRequest = {
                  requestId: employee.requestId || employee.RequestId || '',
                  employeeId: employee.employeeId || employee.EmployeeId || '',
                  employeeName: employee.employeeName || employee.EmployeeName || '',
                  leaveTypeId: employee.leaveTypeId || employee.LeaveTypeId || '',
                  leaveTypeName: employee.leaveTypeName || employee.LeaveTypeName || '',
                  startDate: employee.startDate || employee.StartDate || '',
                  endDate: employee.endDate || employee.EndDate || '',
                  daysRequested: employee.daysRequested || employee.DaysRequested || 0,
                  reason: employee.reason || employee.Reason,
                  status: employee.status || employee.Status || 'pending',
                  submittedAt: employee.submittedAt || employee.SubmittedAt || '',
                  approverName: employee.approverName || employee.ApproverName,
                  approvedAt: employee.approvedAt || employee.ApprovedAt,
                  rejectionReason: employee.rejectionReason || employee.RejectionReason,
                  profilePictureUrl: employee.profilePictureUrl || employee.ProfilePictureUrl,
                  profilePreviewUrl: null
                };

                // Set profile preview URL
                if (mappedRequest.profilePictureUrl) {
                  mappedRequest.profilePreviewUrl = mappedRequest.profilePictureUrl.startsWith('http')
                    ? mappedRequest.profilePictureUrl
                    : `${this.backendBaseUrl}${mappedRequest.profilePictureUrl}`;
                }

                return mappedRequest;
              })
              : [];
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error loading pending approvals:', error);
          }
        });
    }

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

    // Use different API based on user role
    const requestObservable = this.isHRManager
      ? this.leaveService.getLeaveRequestsForHR(searchRequest)
      : this.leaveService.getLeaveRequests(searchRequest);

    requestObservable
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: LeaveListResponse) => {
          // API returns data in response.data, not response.leaveRequests
          // Map the response and ensure requestId is properly set
          this.teamRequests = (response.data || []).map((employee: any) => {
            // Handle both camelCase and PascalCase from API
            const mappedRequest: LeaveRequest = {
              requestId: employee.requestId || employee.RequestId || '',
              employeeId: employee.employeeId || employee.EmployeeId || '',
              employeeName: employee.employeeName || employee.EmployeeName || '',
              leaveTypeId: employee.leaveTypeId || employee.LeaveTypeId || '',
              leaveTypeName: employee.leaveTypeName || employee.LeaveTypeName || '',
              startDate: employee.startDate || employee.StartDate || '',
              endDate: employee.endDate || employee.EndDate || '',
              daysRequested: employee.daysRequested || employee.DaysRequested || 0,
              reason: employee.reason || employee.Reason,
              status: employee.status || employee.Status || 'pending',
              submittedAt: employee.submittedAt || employee.SubmittedAt || '',
              approverName: employee.approverName || employee.ApproverName,
              approvedAt: employee.approvedAt || employee.ApprovedAt,
              rejectionReason: employee.rejectionReason || employee.RejectionReason,
              profilePictureUrl: employee.profilePictureUrl || employee.ProfilePictureUrl,
              profilePreviewUrl: null
            };

            // Set profile preview URL
            if (mappedRequest.profilePictureUrl) {
              mappedRequest.profilePreviewUrl = mappedRequest.profilePictureUrl.startsWith('http')
                ? mappedRequest.profilePictureUrl
                : `${this.backendBaseUrl}${mappedRequest.profilePictureUrl}`;
            }

            return mappedRequest;
          });
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
    // Validate request ID
    if (!request.requestId) {
      console.error('Request ID is missing:', request);
      this.notificationService.showError('Leave request ID is missing. Cannot approve.');
      return;
    }

    this.isProcessing = true;

    console.log('Approving leave request with ID:', request.requestId);

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
          const errorMessage = error?.error?.message || error?.message || 'Failed to approve leave request';
          this.notificationService.showError(errorMessage);
          this.isProcessing = false;
        }
      });
  }

  openRejectDialog(request: LeaveRequest): void {
    // Validate request ID
    if (!request.requestId) {
      console.error('Request ID is missing:', request);
      this.notificationService.showError('Leave request ID is missing. Cannot reject.');
      return;
    }

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

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result && result.rejected) {
          this.isProcessing = true;

          console.log('Rejecting leave request with ID:', request.requestId, 'Reason:', result.reason);

          this.leaveService.rejectLeaveRequest(request.requestId, result.reason)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.notificationService.showSuccess('Leave request rejected successfully');
                this.isProcessing = false;
                this.loadInitialData();
              },
              error: (error) => {
                console.error('Error rejecting request:', error);
                const errorMessage = error?.error?.message || error?.message || 'Failed to reject leave request';
                this.notificationService.showError(errorMessage);
                this.isProcessing = false;
              }
            });
        }
      });
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

  // Helper method to check if filters are applied
  hasFiltersApplied(): boolean {
    if (!this.filterForm) return false;
    const values = this.filterForm.value;
    return !!(values.search?.trim() || values.status);
  }
}
