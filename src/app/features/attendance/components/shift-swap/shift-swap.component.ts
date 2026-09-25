

import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
import { AuthService } from '../../../../core/services/auth.service';
import { ShiftSwap } from '../../../../core/models/attendance.models';

import { SharedCommonModule } from '@shared/shared-common.module';
import { LocalizedTimePipe } from '@shared/pipes/localized-time.pipe';
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
    SharedCommonModule,
    LocalizedTimePipe,
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
  employees: any[] = [];
  currentShift: ShiftDto | null = null;

  isSubmitting = false;
  private destroy$ = new Subject<void>();

  currentUser: any = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ShiftSwapComponent>,
    private attendanceService: AttendanceService,
    private notification: NotificationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.swapForm = this.fb.group({
      currentShiftId: null,
      requestedShiftId: ['', Validators.required],
      swapWithEmployeeId: [null],
      reason: ['']
    });
  }

  ngOnInit(): void {
    // If a user is already loaded, use it immediately
    const immediateUser = this.authService.getCurrentUserValue();
    if (immediateUser) {
      this.currentUser = immediateUser;
      this.loadShifts();
      this.loadCurrentShift();
    }

    // Subscribe to auth state so we load shifts/current shift as soon as a user becomes available
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (!user) return;
        if (this.currentUser?.userId === user.userId) return;
        this.currentUser = user;
        this.loadShifts();
        this.loadCurrentShift();
      });
  }

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
    if (this.swapForm.invalid || !this.currentUser) {
      this.markFormGroupTouched(this.swapForm);
      this.notification.showError('Please correct the highlighted fields');
      return;
    }

    this.isSubmitting = true;

    const shiftSwap: ShiftSwap = {
      employeeId: this.currentUser.userId,
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
        error: (error) => {
          const errorMessage = error?.error?.message || error?.message || 'Failed to submit shift swap request';
          this.notification.showError(errorMessage);
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
          // Accept either ApiResponse-wrapped { data: ShiftDto } or raw ShiftDto
          const payload = res?.data ?? res;
          if (!payload) return;

          this.currentShift = payload as ShiftDto;

          this.swapForm.patchValue({
            currentShiftId: this.currentShift?.shiftId
          });

          // With OnPush change detection, ensure view updates
          try { this.cdr.markForCheck(); } catch {}

          console.log('Current shift loaded:', this.currentShift);
        },
        error: (error) => {
          const errorMessage = error?.error?.message || error?.message || 'Failed to load current shift';
          this.notification.showError(errorMessage);
        }
      });
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
