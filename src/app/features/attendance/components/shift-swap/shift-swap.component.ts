

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '../../../../core/services/notification.service';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service'; // ✅ added import
import { ShiftSwap } from '../../../../core/models/attendance.models';

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
  selector: 'app-shift-swap',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './shift-swap.component.html',
  styleUrls: ['./shift-swap.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShiftSwapComponent implements OnInit, OnDestroy {
  swapForm: FormGroup;
  shifts: ShiftDto[] = [];
  currentShift: ShiftDto | null = null;

  isSubmitting = false;
  private destroy$ = new Subject<void>();

  currentUser: any = null; // ✅ store current user

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ShiftSwapComponent>,
    private attendanceService: AttendanceService,
    private notification: NotificationService,
    private authService: AuthService // ✅ inject AuthService
  ) {
    this.swapForm = this.fb.group({
      currentShiftId: null,
      requestedShiftId: ['', Validators.required],
      reason: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadShifts();
     this.loadCurrentShift();
  }

  // ✅ Load current user from AuthService
  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUserValue();
    console.log('Current user:', this.currentUser);
  }

  private loadShifts(): void {
    this.attendanceService.getShifts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: ShiftDto[]) => this.shifts = res || [],
        error: () => this.notification.showError('Failed to load shifts')
      });
  }

  onSubmit(): void {
    if (this.swapForm.invalid || !this.currentUser) return;

    this.isSubmitting = true;

    // ✅ Add employeeId from currentUser before sending
    const shiftSwap: ShiftSwap = {
      employeeId: this.currentUser.userId, // assuming userId is field name in user model
      ...this.swapForm.value
    };

    this.attendanceService.createShiftSwap(shiftSwap)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notification.showSuccess('Shift swap request submitted successfully!');
          this.isSubmitting = false;
          this.dialogRef.close('swapped');
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to submit shift swap request');
          this.isSubmitting = false;
        }
      });
  }
private loadCurrentShift(): void {
  if (!this.currentUser?.userId) return;

  this.attendanceService.getCurrentShift(this.currentUser.userId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res: any) => {
        if (!res?.data) return;

        this.currentShift = res.data;

        // Patch the form with current shift
        this.swapForm.patchValue({
          currentShiftId: this.currentShift?.shiftId
        });

        console.log('Current shift loaded:', this.currentShift);
      },
      error: (err) => console.error(err)
    });
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
