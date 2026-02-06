import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Attendance, ManualAttendanceSearchDto, ManualAttendanceUpdateDto } from '../../../../core/models/attendance.models';
import { User } from '../../../../core/models/auth.models';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-manual-attendance',
  templateUrl: './manual-attendance.component.html',
  styleUrls: ['./manual-attendance.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ]
})
export class ManualAttendanceComponent implements OnInit {
  searchForm: FormGroup;
  currentUser: User | null = null;
  attendanceRecords: Attendance[] = [];
  isLoading = false;
  isEditing = false;
  editingRecord: Attendance | null = null;
  editForm: FormGroup;

  displayedColumns: string[] = ['date', 'employeeName', 'checkIn', 'checkOut', 'status', 'actions'];

  constructor(
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.searchForm = this.fb.group({
      startDate: [new Date(), Validators.required],
      endDate: [new Date(), Validators.required],
      employeeId: [''] // Optional, for managers
    });

    this.editForm = this.fb.group({
      checkInTime: ['', Validators.required],
      checkOutTime: ['', Validators.required],
      status: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.search(); // Initial load
  }

  search(): void {
    if (this.searchForm.invalid) return;

    this.isLoading = true;
    const { startDate, endDate, employeeId } = this.searchForm.value;
    
    const searchDto: ManualAttendanceSearchDto = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      employeeId: employeeId || undefined
    };

    this.attendanceService.getManualAttendanceRecords(searchDto).subscribe({
      next: (records) => {
        this.attendanceRecords = records;
        this.isLoading = false;
      },
      error: (err) => {
        this.notificationService.error('Failed to load attendance records');
        this.isLoading = false;
      }
    });
  }

  startEdit(record: Attendance): void {
    this.editingRecord = record;
    this.isEditing = true;
    
    // Format dates for datetime-local input
    // Need to handle nulls and timezone correctly. 
    // Assuming backend returns UTC ISO string. datetime-local expects local time YYYY-MM-DDTHH:mm
    
    const formatForInput = (isoDate: string | undefined | null) => {
        if (!isoDate) return '';
        const d = new Date(isoDate);
        // Adjust to local ISO string for input
        const pad = (n: number) => n < 10 ? '0' + n : n;
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    this.editForm.patchValue({
      checkInTime: formatForInput(record.checkInTime),
      checkOutTime: formatForInput(record.checkOutTime),
      status: record.status,
      notes: record.notes
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingRecord = null;
  }

  saveEdit(): void {
    if (this.editForm.invalid || !this.editingRecord) return;

    const { checkInTime, checkOutTime, status, notes } = this.editForm.value;

    if (new Date(checkInTime) >= new Date(checkOutTime)) {
      this.notificationService.error('Check-out time must be after check-in time');
      return;
    }

    const updateDto: ManualAttendanceUpdateDto = {
      attendanceId: this.editingRecord.attendanceId,
      employeeId: this.editingRecord.employeeId,
      checkInTime: new Date(checkInTime).toISOString(),
      checkOutTime: new Date(checkOutTime).toISOString(),
      status,
      notes
    };

    this.attendanceService.updateManualAttendance(updateDto).subscribe({
      next: (success) => {
        if (success) {
          this.notificationService.success('Attendance updated successfully');
          this.isEditing = false;
          this.editingRecord = null;
          this.search(); // Refresh
        } else {
            this.notificationService.error('Failed to update attendance');
        }
      },
      error: (err) => {
        this.notificationService.error(err.message || 'Failed to update attendance');
      }
    });
  }
  
  get isManagerOrAdmin(): boolean {
    return this.currentUser?.roleName ? ['Super Admin', 'HR Manager', 'Manager'].includes(this.currentUser.roleName) : false;
  }
}
