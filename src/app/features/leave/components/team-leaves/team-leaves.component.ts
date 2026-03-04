import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
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
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { LeaveService } from '../../services/leave.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { RejectLeaveDialogComponent } from '../reject-leave-dialog/reject-leave-dialog.component';
import { ApproveLeaveDialogComponent } from '../approve-leave-dialog/approve-leave-dialog.component';
import { LeaveRequestDetailsDialogComponent } from '../leave-request-details-dialog/leave-request-details-dialog.component';
import {
  LeaveRequest,
  LeaveStatus,
  LeaveSearchRequest,
  LeaveListResponse,
  LeaveType
} from '../../../../core/models/leave.models';

// ── Employee model (from GetEmployeebyOrganization) ──────────────
export interface EmployeeOption {
  employeeId: string;
  fullName: string;
  email: string;
  employeeCode: string;
  profilePictureUrl?: string;
  profilePreviewUrl?: string | null;
}

@Component({
  selector: 'app-team-leaves',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,              // ← needed for [(ngModel)] on search input
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
  private backendBaseUrl = 'https://localhost:60485';

  isLoading = false;
  isProcessing = false;

  currentPage = 1;
  pageSize = 10;
  totalCount = 0;

  displayedColumns: string[] = ['employee', 'leaveType', 'dates', 'status', 'submitted', 'actions'];
  isHRManager = false;

  // ── Employee Select2 state ──────────────────────────────────────
  allEmployees: EmployeeOption[] = [];           // full list from API
  filteredEmployees: EmployeeOption[] = [];      // list shown in dropdown
  selectedEmployee: EmployeeOption | null = null;
  employeeSearchQuery = '';
  employeeDropdownOpen = false;
  isLoadingEmployees = false;

  @ViewChild('employeeSearchInput') employeeSearchInputRef!: ElementRef<HTMLInputElement>;

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
    if (this.isHRManager) {
      this.displayedColumns = ['employee', 'leaveType', 'dates', 'status', 'submitted', 'actions'];
    }
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.loadEmployeeList();
    this.setupFilterListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeFilterForm(): void {
    this.filterForm = this.fb.group({
      status: ['']
    });
  }

  private setupFilterListeners(): void {
    this.filterForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.loadTeamRequests();
      });
  }

  // ── Load all employees from API once ─────────────────────────────
  private loadEmployeeList(): void {
    this.isLoadingEmployees = true;
    this.leaveService.getEmployeesByOrganization()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          // API returns ServiceResponse<List<EmployeeNameList>>
          // Each item only has: { EmployeeName: string }
          const list: any[] = response?.data || response?.Data || response || [];
          this.allEmployees = list.map((emp: any) => ({
            employeeId:        '',
            fullName:          emp.employeeName   || emp.EmployeeName   || '',
            email:             emp.email          || emp.Email          || '',
            employeeCode:      emp.employeeCode   || emp.EmployeeCode   || '',
            profilePictureUrl: undefined,
            profilePreviewUrl: null
          } as EmployeeOption));
          this.filteredEmployees = [...this.allEmployees];
          this.isLoadingEmployees = false;
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          console.error('Error loading employees:', err);
          this.isLoadingEmployees = false;
          this.cdr.markForCheck();
        }
      });
  }

  // ── Dropdown open / close ────────────────────────────────────────
  toggleEmployeeDropdown(): void {
    if (this.employeeDropdownOpen) {
      this.closeEmployeeDropdown();
    } else {
      this.openEmployeeDropdown();
    }
  }

  openEmployeeDropdown(): void {
    if (this.employeeDropdownOpen) return;
    this.employeeDropdownOpen = true;
    this.employeeSearchQuery = '';
    this.filteredEmployees = [...this.allEmployees];
    this.cdr.markForCheck();
    // Auto-focus the inline input rendered inside the trigger
    setTimeout(() => {
      this.employeeSearchInputRef?.nativeElement?.focus();
    }, 30);
  }

  closeEmployeeDropdown(): void {
    this.employeeDropdownOpen = false;
    this.employeeSearchQuery = '';
    this.cdr.markForCheck();
  }

  // ── Typing in the search box filters the list client-side ────────
  onEmployeeSearch(): void {
    const q = (this.employeeSearchQuery || '').trim().toLowerCase();
    if (!q) {
      this.filteredEmployees = [...this.allEmployees];
    } else {
      this.filteredEmployees = this.allEmployees.filter(emp =>
        emp.fullName.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q)
      );
    }
    this.cdr.markForCheck();
  }

  // ── Select an employee — filter table client-side ────────────────
  selectEmployee(emp: EmployeeOption): void {
    this.selectedEmployee = emp;
    this.closeEmployeeDropdown();
    this.currentPage = 1;
    this.applyEmployeeFilter();
  }

  clearEmployeeSelection(event: Event): void {
    event.stopPropagation();
    this.selectedEmployee = null;
    this.currentPage = 1;
    this.loadTeamRequests();   // reload without employee filter
  }

  /**
   * After selecting an employee, filter teamRequests client-side by name.
   * No additional API call — uses the already-loaded data.
   */
  private applyEmployeeFilter(): void {
    if (!this.selectedEmployee) {
      this.loadTeamRequests();
      return;
    }
    this.isLoading = true;
    this.cdr.markForCheck();

    // We reload with employee name as a filter passed to the backend
    // OR we filter client-side if the full dataset is already loaded.
    // Per the requirement: filter client-side from the loaded list.
    const selectedName = this.selectedEmployee.fullName.toLowerCase();
    this.teamRequests = this.teamRequests.filter(r =>
      r.employeeName?.toLowerCase().includes(selectedName)
    );
    this.totalCount = this.teamRequests.length;
    this.isLoading = false;
    this.cdr.markForCheck();

    // NOTE: If you want to re-fetch with employee filter from backend,
    // add employeeId to LeaveSearchRequest and pass it here instead.
    // For a full reload with employee filter:
    this.loadTeamRequestsWithEmployeeFilter();
  }

  private loadInitialData(): void {
    this.leaveService.getLeaveTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (leaveTypes) => {
          this.leaveTypes = leaveTypes || [];
          this.cdr.markForCheck();
        },
        error: (error) => console.error('Error loading leave types:', error)
      });

    if (!this.isHRManager) {
      this.leaveService.getPendingApprovals()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (pendingApprovals) => {
            this.pendingApprovals = Array.isArray(pendingApprovals)
              ? pendingApprovals.map((employee: any) => this.mapLeaveRequest(employee))
              : [];
            this.cdr.markForCheck();
          },
          error: (error) => console.error('Error loading pending approvals:', error)
        });
    }

    this.loadTeamRequests();
  }

  private loadTeamRequests(): void {
    this.isLoading = true;

    const searchRequest: LeaveSearchRequest = {
      status:        this.filterForm.get('status')?.value || undefined,
      page:          this.currentPage,
      pageSize:      this.pageSize,
      sortBy:        'submittedAt',
      sortDirection: 'desc'
    };

    const requestObservable = this.isHRManager
      ? this.leaveService.getLeaveRequestsForHR(searchRequest)
      : this.leaveService.getLeaveRequests(searchRequest);

    requestObservable
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: LeaveListResponse) => {
          let requests = (response.data || []).map((emp: any) => this.mapLeaveRequest(emp));

          // Apply client-side employee name filter if an employee is selected
          if (this.selectedEmployee) {
            const name = this.selectedEmployee.fullName.toLowerCase();
            requests = requests.filter(r => r.employeeName?.toLowerCase().includes(name));
          }

          this.teamRequests = requests;
          this.totalCount = this.selectedEmployee ? requests.length : response.totalCount;
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

  /**
   * Reload team requests and apply employee filter after API response.
   * This ensures we always filter from the latest full page of data.
   */
  private loadTeamRequestsWithEmployeeFilter(): void {
    this.loadTeamRequests();
  }

  // ── Shared mapper ────────────────────────────────────────────────
  private mapLeaveRequest(employee: any): LeaveRequest {
    const mappedRequest: LeaveRequest = {
      requestId:       employee.requestId       || employee.RequestId       || '',
      employeeId:      employee.employeeId      || employee.EmployeeId      || '',
      employeeName:    employee.employeeName    || employee.EmployeeName    || '',
      leaveTypeId:     employee.leaveTypeId     || employee.LeaveTypeId     || '',
      leaveTypeName:   employee.leaveTypeName   || employee.LeaveTypeName   || '',
      startDate:       employee.startDate       || employee.StartDate       || '',
      endDate:         employee.endDate         || employee.EndDate         || '',
      daysRequested:   employee.daysRequested   || employee.DaysRequested   || 0,
      reason:          employee.reason          || employee.Reason,
      status:          employee.status          || employee.Status          || 'pending',
      submittedAt:     employee.submittedAt     || employee.SubmittedAt     || '',
      approverName:    employee.approverName    || employee.ApproverName,
      approvedAt:      employee.approvedAt      || employee.ApprovedAt,
      rejectionReason: employee.rejectionReason || employee.RejectionReason,
      profilePictureUrl: employee.profilePictureUrl || employee.ProfilePictureUrl,
      profilePreviewUrl: null
    };
    if (mappedRequest.profilePictureUrl) {
      mappedRequest.profilePreviewUrl = mappedRequest.profilePictureUrl.startsWith('http')
        ? mappedRequest.profilePictureUrl
        : `${this.backendBaseUrl}${mappedRequest.profilePictureUrl}`;
    }
    return mappedRequest;
  }

  // ── Actions ──────────────────────────────────────────────────────
  approveRequest(request: LeaveRequest): void {
    if (!request.requestId) {
      this.notificationService.showError('Leave request ID is missing. Cannot approve.');
      return;
    }

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
                const errorMessage = error?.error?.message || error?.message || 'Failed to approve leave request';
                this.notificationService.showError(errorMessage);
                this.isProcessing = false;
              }
            });
        }
      });
  }

  openRejectDialog(request: LeaveRequest): void {
    if (!request.requestId) {
      this.notificationService.showError('Leave request ID is missing. Cannot reject.');
      return;
    }

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

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result?.rejected) {
          this.isProcessing = true;
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

  clearFilters(): void {
    this.selectedEmployee = null;
    this.filterForm.reset({ status: '' });
    // filterForm change triggers loadTeamRequests automatically
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
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getLeaveTypeColor(leaveTypeId: string): string {
    const leaveType = this.leaveTypes.find(lt => lt.leaveTypeId === leaveTypeId);
    return leaveType?.color || '#2196F3';
  }

  hasFiltersApplied(): boolean {
    if (!this.filterForm) return false;
    const values = this.filterForm.value;
    return !!(this.selectedEmployee || values.status);
  }
}
