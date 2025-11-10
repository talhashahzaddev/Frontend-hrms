
import { Component, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { AttendanceService } from '../../services/attendance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MatDialogRef } from '@angular/material/dialog';
import { Employee } from '@/app/core/models/employee.models';

export interface ShiftDto {
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  daysOfWeek: number[];
  timezone: string;
  isActive: boolean;
}

@Component({
  selector: 'app-assign-shift',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  templateUrl: './assign-shift.component.html',
  styleUrls: ['./assign-shift.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssignShiftComponent implements OnInit, OnDestroy {
  assignShiftForm: FormGroup;
  employees: Employee[] = [];
  shifts: ShiftDto[] = [];
  isSubmitting = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private attendanceService: AttendanceService,
    private notification: NotificationService,
    private dialogRef:MatDialogRef<AssignShiftComponent>
  ) {
    this.assignShiftForm = this.fb.group({
      employeeId: ['', Validators.required],
      shiftId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadEmployees();
    this.loadShifts();
  }

  private loadEmployees(): void {
    this.employeeService.getEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.employees = res.employees || [];
        },
        error: () => this.notification.showError('Failed to load employees')
      });
  }

  private loadShifts(): void {
    this.attendanceService.getShifts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.shifts= res || [],
        error: () => this.notification.showError('Failed to load shifts')
      });
  }

  onSubmit(): void {
    if (this.assignShiftForm.invalid) return;

    this.isSubmitting = true;
    const payload = this.assignShiftForm.value;

    this.attendanceService.assignShift(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notification.showSuccess('Shift assigned successfully');
          this.assignShiftForm.reset();
          this.isSubmitting = false;
           // ✅ Close the dialog and pass optional result
        this.dialogRef.close('assigned');
          
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to assign shift');
          this.isSubmitting = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
