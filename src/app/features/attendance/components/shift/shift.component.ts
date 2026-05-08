import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { NotificationService } from '../../../../core/services/notification.service';

import { AssignShiftComponent } from '../assign-shift/assign-shift.component';
import { CreateShiftComponent } from '../create-shift/create-shift.component';
import { AttendanceService } from '../../services/attendance.service';
import { EmployeeShift } from '@/app/core/models/attendance.models';
import { ShiftSwapComponent } from '../shift-swap/shift-swap.component';
import { AuthService } from '@/app/core/services/auth.service';
import { EmployeeService } from '../../../../features/employee/services/employee.service';
import { Subject, takeUntil } from 'rxjs';
import { EmployeeSearchRequest, Employee } from '@/app/core/models/employee.models';
import { PendingShiftSwap, ShiftDto, UpdateShiftDto,ShiftSummary } from '@/app/core/models/attendance.models';
import { PerformanceService } from '@/app/features/performance/services/performance.service';
import {ShiftRejectDialogComponent} from './shiftReject';
import { GeoFenceService } from '../../services/geofence.service';

@Component({
  selector: 'app-shift',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatDividerModule,
    MatTableModule,
    MatMenuModule,
    MatChipsModule,
    MatTabsModule,
    MatDialogModule,
  ],
  templateUrl: './shift.component.html',
  styleUrls: ['./shift.component.scss']
})
export class ShiftComponent implements OnInit, OnDestroy {
  shifts: any[] = [];
  selectedShiftId: string = '';
  employeesByShift: EmployeeShift[] = [];
  superAdminPendingSwaps: PendingShiftSwap[] = [];
  currentShift: ShiftDto | null = null;
  private destroy$ = new Subject<void>();
  selectedTabIndex = 0;
  isLoading = false;
  allEmployees: Employee[] = [];
  shiftSummary: ShiftSummary | null = null;
  shiftFenceSummary: Record<string, string> = {};
  // Pagination for shift details
  currentPage = 1;
  pageSize = 8;

  employeeShiftSwaps: PendingShiftSwap[] = [];
  currentUser: any = null;

  constructor(
    private dialog: MatDialog,
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private performanceService: PerformanceService,
    private employeeService: EmployeeService,
    private geoFenceService: GeoFenceService,
    private notification: NotificationService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadAllShifts();
  this.loadShiftSummary(); 
    this.loadSuperAdminPendingSwaps();
    this.loadEmployeeShiftSwaps();
    this.loadEmployeeCurrentShift();


    this.selectedShiftId = '';
    this.onShiftChange(this.selectedShiftId);

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['action'] === 'swap') {
        setTimeout(() => {
          this.openSwapShift();
        }, 500);
      }
    });
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUserValue();
  }

  loadAllShifts(): void {
    this.attendanceService.getShifts().subscribe({
      next: (data: any[]) => {
        this.shifts = data;
        this.loadShiftFenceSummary();
      },
      error: (error: any) => {
        const errorMessage = error?.error?.message || error?.message || 'Failed to load shifts';
        this.notification.showError(errorMessage);
      }
    });
  }

  private loadShiftFenceSummary(): void {
    this.shiftFenceSummary = {};

    this.geoFenceService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (allFences) => {
          const fenceNameMap = new Map((allFences || []).map(f => [f.geoFenceId, f.name]));

          (this.shifts || []).forEach((shift: any) => {
            this.geoFenceService.getByShift(shift.shiftId)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (linked) => {
                  const names = Array.from(new Set((linked || [])
                    .map(item => item.geoFenceName || fenceNameMap.get(item.geoFenceId) || '')
                    .filter(Boolean) as string[]));
                  this.shiftFenceSummary[shift.shiftId] = names.length ? names.join(', ') : 'Not linked';
                },
                error: () => {
                  this.shiftFenceSummary[shift.shiftId] = 'Not linked';
                }
              });
          });
        },
        error: () => {
          (this.shifts || []).forEach((shift: any) => {
            this.shiftFenceSummary[shift.shiftId] = 'Not linked';
          });
        }
      });
  }


  onShiftChange(shiftId: string): void {
    if (!shiftId) {
      this.loadAllEmployees();
      return;
    }

    this.attendanceService.getEmployeesByShift(shiftId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employees: EmployeeShift[]) => {
          this.employeesByShift = employees;
          this.currentPage = 1;
        },
        error: (error: any) => {
          const errorMessage = error?.error?.message || error?.message || 'Failed to load employees';
          this.notification.showError(errorMessage);
        }
      });
  }

  private loadAllEmployees(): void {
    this.isLoading = true;

    const searchRequest: EmployeeSearchRequest = {
      searchTerm: '',
      isActive: true,
      sortBy: 'firstName',
      sortDirection: 'asc',
      page: 1,
      pageSize: 1000
    };

    this.employeeService.getEmployees(searchRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.allEmployees = response.employees || [];
          this.isLoading = false;
          this.currentPage = 1;
        },
        error: () => {
          this.notification.showError('Failed to load employees');
          this.allEmployees = [];
          this.isLoading = false;
        }
      });
  }

private loadShiftSummary(): void {
  this.attendanceService.getShiftSummary().subscribe({
    next: (summary) => {
      this.shiftSummary = summary;
    },
    error: (error) => {
      const errorMessage =
        error?.error?.message || error?.message || 'Failed to load shift summary';
      this.notification.showError(errorMessage);
    }
  });
}

  private loadSuperAdminPendingSwaps(): void {
    this.attendanceService.getPendingShiftSwapsForAdmin().subscribe({
      next: (response: any) => {
        this.superAdminPendingSwaps = response.data;
        console.log('Super Admin pending swaps:', this.superAdminPendingSwaps);
      },
      error: (error: any) => {
        const errorMessage = error?.error?.message || error?.message || 'Failed to load pending swaps';
        this.notification.showError(errorMessage);
      }
    });
  }

  // Pagination helpers
  get currentList(): any[] {
    return this.selectedShiftId ? this.employeesByShift : this.allEmployees;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil((this.currentList?.length || 0) / this.pageSize));
  }

  get pagedEmployees(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return (this.currentList || []).slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page < 1) page = 1;
    if (page > this.totalPages) page = this.totalPages;
    this.currentPage = page;
  }

  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }
  prevPage(): void { if (this.currentPage > 1) this.currentPage--; }

  // Template helper to avoid using global Math in templates
  min(a: number, b: number): number {
    return Math.min(a, b);
  }


  approveRequest(swap: PendingShiftSwap): void {
    if (!this.currentUser?.userId) return;

    const payload = {
      requestId: swap.requestId,
      approvedBy: this.currentUser.userId,
      isApproved: true,
      rejectionReason: ''
    };

    this.attendanceService.approvedshiftRequest(payload).subscribe({
      next: (res: any) => {
        if (res.success) {
          console.log('Shift swap approved:', res.message);
          this.superAdminPendingSwaps = this.superAdminPendingSwaps.filter(s => s.requestId !== swap.requestId);
          this.loadSuperAdminPendingSwaps();
          this.notification.showSuccess('Shift swap approved');
        } else {
          this.notification.showError(res.message || 'Failed to approve shift swap');
        }
      },
      error: (error) => {
        const errorMessage = error?.error?.message || error?.message || 'Error approving shift swap';
        this.notification.showError(errorMessage);
      }
    });
  }
rejectRequest(swap: PendingShiftSwap): void {
  if (!this.currentUser?.userId) return;

  const dialogRef = this.dialog.open(ShiftRejectDialogComponent, {
    width: '450px',
    disableClose: true,
    data: {
      title: 'Reject Shift Swap',
      message: 'Are you sure you want to reject shift swap request for',
      employeeName: swap.employeeName || 'Employee'
    }
  });

  dialogRef.afterClosed().subscribe(result => {

    if (!result?.rejected) return;

    const payload = {
      requestId: swap.requestId,
      approvedBy: this.currentUser.userId,
      isApproved: false,
      rejectionReason: result.reason || 'Shift swap rejected'
    };

    this.attendanceService.approvedshiftRequest(payload).subscribe({
      next: (res: any) => {
        if (res.success) {

          console.log('Shift swap rejected:', res.message);

          this.superAdminPendingSwaps =
            this.superAdminPendingSwaps.filter(s => s.requestId !== swap.requestId);

          this.loadSuperAdminPendingSwaps();

          this.notification.showSuccess('Shift swap rejected');

        } else {
          this.notification.showError(res.message || 'Failed to reject shift swap');
        }
      },
      error: (error) => {
        const errorMessage =
          error?.error?.message || error?.message || 'Error rejecting shift swap';

        this.notification.showError(errorMessage);
      }
    });

  });
}

  private loadEmployeeShiftSwaps(): void {
    if (!this.currentUser?.userId) return;

    this.attendanceService.getEmployeeShiftSwaps(this.currentUser.userId).subscribe({
      next: (response: any) => {
        this.employeeShiftSwaps = response.data;
        console.log('Employee shift swaps:', this.employeeShiftSwaps);
      },
      error: (error: any) => {
        const errorMessage = error?.error?.message || error?.message || 'Failed to load employee shift swaps';
        this.notification.showError(errorMessage);
      }
    });
  }
  private loadEmployeeCurrentShift(): void {
    if (!this.currentUser?.userId) return;

    this.attendanceService.getCurrentShift(this.currentUser.userId).subscribe({
      next: (res: any) => {
        if (!res?.data) return;
        this.currentShift = res.data;
      },
      error: (error) => {
        const errorMessage = error?.error?.message || error?.message || 'Failed to load current shift';
        this.notification.showError(errorMessage);
      }
    });

  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  onDeleteShift(shift: ShiftDto): void {
    const shiftName = shift.shiftName || 'this shift';

    const dialogData: ConfirmDeleteData = {
      title: 'Delete Shift',
      message: 'Are you sure you want to delete this shift?',
      itemName: shiftName
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.attendanceService.deleteShift(shift.shiftId).subscribe({
          next: (res: any) => {
            this.notification.showSuccess('Shift deleted successfully');
            this.loadAllShifts();
          },
          error: (err) => {
            const errorMessage = err?.error?.message || err?.message || 'Failed to delete shift';
            this.notification.showError(errorMessage);
          }
        });
      }
    });
  }

  onEditShift(shift: ShiftDto): void {
    const dialogRef = this.dialog.open(CreateShiftComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: true,
      autoFocus: false,
      panelClass: 'custom-dialog-container',
      data: {
        shiftId: shift.shiftId,
        shiftName: shift.shiftName,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakDuration: shift.breakDuration,
        daysofWeek: shift.daysOfWeek,
        timezone: shift.timezone,
        marginHours: shift.marginHours ?? 0,
        applyMarginhours: shift.applyMarginhours
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'updated') {
        this.loadAllShifts();
      }
    });
  }


  openCreateShiftDialog(): void {
    const dialogRef = this.dialog.open(CreateShiftComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: true,
      autoFocus: false,
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'created') this.loadAllShifts();
    });
  }

  openAssignShiftDialog(): void {
    const dialogRef = this.dialog.open(AssignShiftComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: 'none',
      disableClose: true,
      autoFocus: false,
      panelClass: 'custom-dialog-container',
      data: {
        isManager: false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'assigned' && this.selectedShiftId)
        this.onShiftChange(this.selectedShiftId);
    });
  }

  openSwapShift(): void {
    const dialogRef = this.dialog.open(ShiftSwapComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: true,
      autoFocus: false,
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'swapped') {
        this.loadEmployeeShiftSwaps();
        this.loadAllShifts();
      }
    });
  }

  formatShiftDays(days?: number[]): string {
    if (!days || days.length === 0) return '—';
    const uniq = Array.from(new Set(days)).sort((a, b) => a - b);
    const usesZero = uniq.includes(0);
    const zeroMap: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
    const oneMap: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
    const map = usesZero ? zeroMap : oneMap;
    const names = uniq.map(n => map[n] || `Day ${n}`);
    const allDays = usesZero ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
    if (names.length === allDays.length) return 'Every day';
    return names.join(', ');
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Attendance', 'Shifts', actionKey);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}




