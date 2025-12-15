import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

// Material Imports
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
import { MatSnackBarModule } from '@angular/material/snack-bar';

// Components and Services
import { AssignShiftComponent } from '../assign-shift/assign-shift.component';
import { CreateShiftComponent } from '../create-shift/create-shift.component';
import { AttendanceService } from '../../services/attendance.service';
import { EmployeeShift } from '@/app/core/models/attendance.models';
import { ShiftSwapComponent } from '../shift-swap/shift-swap.component';
import { AuthService } from '@/app/core/services/auth.service';
import { EmployeeService } from '../../../../features/employee/services/employee.service';
import { Subject, takeUntil } from 'rxjs';
import { EmployeeSearchRequest,Employee } from '@/app/core/models/employee.models';
import { PendingShiftSwap,ShiftDto,UpdateShiftDto } from '@/app/core/models/attendance.models';
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
    MatSnackBarModule
  ],
  templateUrl: './shift.component.html',
  styleUrls: ['./shift.component.scss']
})
export class ShiftComponent implements OnInit {
  shifts: any[] = [];
  selectedShiftId: string = '';
  employeesByShift: EmployeeShift[] = [];
  superAdminPendingSwaps: PendingShiftSwap[] = [];
  currentShift: ShiftDto | null = null;
  private destroy$ = new Subject<void>();
  selectedTabIndex = 0;
  isLoading = false;
  allEmployees: Employee[] = [];

  employeeShiftSwaps: PendingShiftSwap[] = []; // ✅ store employee's shift swap requests
  currentUser: any = null; // ✅ store current logged-in user

  constructor(
    private dialog: MatDialog,
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private employeeService: EmployeeService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadAllShifts();
    
if (this.isAdminOrHR) {
  this.loadSuperAdminPendingSwaps();
}
if(this.isHRManager){
  this.loadSuperAdminPendingSwaps();
}
if(this.isManager){
  this.loadSuperAdminPendingSwaps();
  this.loadEmployeeShiftSwaps();
      this.loadEmployeeCurrentShift();
}

    // ✅ If Employee, load their shift swap requests
    if (this.isEmployee) {
      this.loadEmployeeShiftSwaps();
      this.loadEmployeeCurrentShift();
    }
    

    this.selectedShiftId = '';            // select "All Shifts" by default
  this.onShiftChange(this.selectedShiftId); 
  }

  // ✅ Load current user
  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUserValue();
  }

  // Role helpers
  get isSuperAdmin(): boolean {
    return this.authService.hasRole('Super Admin');
  }
  get isManager():boolean {
    return this.authService.hasRole('Manager');
  }

  get isHRManager(): boolean {
    return this.authService.hasRole('HR Manager');
  }

  get isAdminOrHR(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  get isEmployee(): boolean {
    return this.authService.hasRole('Employee');
  }

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }

  loadAllShifts(): void {
    this.attendanceService.getShifts().subscribe({
      next: (data: any[]) => (this.shifts = data),
      error: (err: any) => console.error('Error loading shifts:', err)
    });
  }


  onShiftChange(shiftId: string): void {
  if (!shiftId) {
    // ✅ If "All Shifts" selected
    this.loadAllEmployees();
    return;
  }

  // ✅ Otherwise load employees by specific shift
  this.attendanceService.getEmployeesByShift(shiftId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (employees: EmployeeShift[]) => (this.employeesByShift = employees),
      error: (err: any) => console.error('Error loading employees:', err)
    });
}


private loadAllEmployees(): void {
  this.isLoading = true;

  const searchRequest: EmployeeSearchRequest = {
    searchTerm: '', // empty => load all
    departmentId: undefined,
    positionId: undefined,
    managerId: undefined,
    employmentStatus: undefined,
    employmentType: undefined,
    isActive: true,
    sortBy: 'firstName',
    sortDirection: 'asc',
    page: 1,
    pageSize: 1000 // adjust if you want more or fewer results
  };

  this.employeeService.getEmployees(searchRequest)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this. allEmployees = response.employees;  // ✅ matches your property
        this.isLoading = false;
        console.log('✅ Loaded all employees:', this.employeesByShift);
      },
      error: (error) => {
        console.error('❌ Failed to load employees:', error);
        this.isLoading = false;
      }
    });
}



private loadSuperAdminPendingSwaps(): void {
  this.attendanceService.getPendingShiftSwapsForAdmin().subscribe({
    next: (response: any) => {
      this.superAdminPendingSwaps = response.data; // assign data
      console.log('Super Admin pending swaps:', this.superAdminPendingSwaps);
    },
    error: (err: any) => console.error('Error loading admin pending swaps:', err)
  });
}

//Accepted Rejected Methods

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
        this.loadSuperAdminPendingSwaps(); // ✅ reload updated list
      } else {
        console.error('Failed to approve:', res.message);
      }
    },
    error: (err) => console.error('Error approving shift swap:', err)
  });
}

rejectRequest(swap: PendingShiftSwap): void {
  if (!this.currentUser?.userId) return;

  // Optionally open a dialog or prompt to ask reason
  const rejectionReason = prompt('Enter rejection reason:', 'Not suitable for schedule') || '';

  const payload = {
    requestId: swap.requestId,
    approvedBy: this.currentUser.userId,
    isApproved: false,
    rejectionReason
  };

  this.attendanceService.approvedshiftRequest(payload).subscribe({
    next: (res: any) => {
      if (res.success) {
        console.log('Shift swap rejected:', res.message);
        this.superAdminPendingSwaps = this.superAdminPendingSwaps.filter(s => s.requestId !== swap.requestId);
        this.loadSuperAdminPendingSwaps(); // ✅ reload updated list
      } else {
        console.error('Failed to reject:', res.message);
      }
    },
    error: (err) => console.error('Error rejecting shift swap:', err)
  });
}


  private loadEmployeeShiftSwaps(): void {
  if (!this.currentUser?.userId) return;

  this.attendanceService.getEmployeeShiftSwaps(this.currentUser.userId).subscribe({
    next: (response: any) => {
      this.employeeShiftSwaps = response.data; // ✅ assign the data array
      console.log('Employee shift swaps:', this.employeeShiftSwaps);
    },
    error: (err: any) => console.error('Error loading employee shift swaps:', err)
  });
}
private loadEmployeeCurrentShift(): void {
    if (!this.currentUser?.userId) return;

this.attendanceService.getCurrentShift(this.currentUser.userId).subscribe({
  next: (res: any) => {
    if (!res?.data) return;
    this.currentShift = res.data; // ✅ assign the nested object
  },
  error: (err) => console.error(err)
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
          this.snackBar.open('Shift deleted successfully', 'Close', { 
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadAllShifts(); // refresh table
        },
        error: (err) => {
          console.error('Error deleting shift:', err);
          this.snackBar.open('Failed to delete shift', 'Close', { 
            duration: 5000,
            panelClass: ['error-snackbar']
          });
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
    data: {        // pass full shift data to the dialog
      shiftId: shift.shiftId,
      shiftName: shift.shiftName,
      startTime: shift.startTime,  // must be "HH:mm:ss" or "HH:mm"
      endTime: shift.endTime,
      breakDuration: shift.breakDuration,
      daysofWeek: shift.daysOfWeek,
      timezone: shift.timezone
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result === 'updated') {
      this.loadAllShifts();  // refresh table after update
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
      disableClose: true,
      autoFocus: false,
      panelClass: 'custom-dialog-container'
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
      if (result === 'swapped' && this.isEmployee) {
        // reload employee requests after swap
        this.loadEmployeeShiftSwaps();
      } else if (result === 'swapped' && this.isAdminOrHR) {
        this.loadAllShifts();
      }
    });
  }
}




