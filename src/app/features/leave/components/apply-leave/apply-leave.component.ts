import { Component, OnInit, OnDestroy, Optional, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { LeaveService } from '../../services/leave.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LeaveType, LeaveBalance, CreateLeaveRequest, LeaveRequest } from '../../../../core/models/leave.models';

@Component({
  selector: 'app-apply-leave',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDialogModule
  ],
  templateUrl: './apply-leave.component.html',
  styleUrls: ['./apply-leave.component.scss']
})
export class ApplyLeaveComponent implements OnInit, OnDestroy {
  requestId?: string;

  private destroy$ = new Subject<void>();

  leaveForm!: FormGroup;
  leaveTypes: LeaveType[] = [];
  leaveBalances: LeaveBalance[] = [];

  isLoading = true;
  isSubmitting = false;
  isEditMode = false;
  calculatedDays = 0;
  selectedLeaveBalance = 0;
  showBalanceWarning = false;
  showOverlapWarning = false;
  isCheckingOverlap = false;
  minDate = new Date();
  workingDaysOfWeek: number[] = [1, 2, 3, 4, 5];

  constructor(
    private fb: FormBuilder,
    private leaveService: LeaveService,
    private notificationService: NotificationService,
    public dialogRef: MatDialogRef<ApplyLeaveComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.initializeForm();
    if (this.data?.requestId) {
      this.requestId = this.data.requestId;
    }
  }

  ngOnInit(): void {
    this.isEditMode = !!this.requestId;
    this.loadLeaveData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.leaveForm = this.fb.group({
      leaveTypeId: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      reason: ['', Validators.maxLength(500)]
    });
  }

  private loadLeaveData(): void {
    this.isLoading = true;
    const userId = this.data?.userId;

    const requests: any = {
      leaveTypes: this.leaveService.getLeaveTypes(),
      leaveBalances: this.leaveService.getMyLeaveBalance()
    };

    // Fetch the employee's current shift to determine working days
    if (userId) {
      requests.shift = this.leaveService.getCurrentShift(userId);
    }

    // If edit mode, load the request data
    if (this.isEditMode && this.requestId) {
      requests.leaveRequest = this.leaveService.getLeaveRequest(this.requestId);
    }

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.leaveTypes = data.leaveTypes || [];
          this.leaveBalances = Array.isArray(data.leaveBalances) ? data.leaveBalances : [];

          // Extract working days from shift response
          // API daysOfWeek uses ISO weekday format: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
          if (data.shift?.data?.daysOfWeek?.length) {
            this.workingDaysOfWeek = data.shift.data.daysOfWeek;
          }

          if (this.isEditMode && data.leaveRequest) {
            this.populateFormForEdit(data.leaveRequest);
          } else if (this.data?.startDate && this.data?.endDate) {
            this.leaveForm.patchValue({
              startDate: new Date(this.data.startDate),
              endDate: new Date(this.data.endDate)
            });
            setTimeout(() => {
              this.onDateChange();
            }, 100);
          }

          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading leave data:', error);
          const errorMessage = error?.error?.message || error?.message || 'Failed to load leave data';
          this.notificationService.showError(errorMessage);
          this.isLoading = false;
        }
      });
  }

  private populateFormForEdit(request: LeaveRequest): void {
    this.leaveForm.patchValue({
      leaveTypeId: request.leaveTypeId,
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
      reason: request.reason
    });
    // Delay the overlap check slightly to ensure form is fully populated
    setTimeout(() => {
      this.onDateChange();
    }, 100);
  }


  private calculateWorkingDays(startIso: string, endIso: string): number {
    const start = new Date(startIso);
    const end = new Date(endIso);
    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const jsDay = current.getDay();
      // Convert JS day to ISO weekday: Sunday(0) → 7, rest stay the same
      const isoDay = jsDay === 0 ? 7 : jsDay;

      if (this.workingDaysOfWeek.includes(isoDay)) {
        count++;
      }

      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  onLeaveTypeChange(): void {
    const leaveTypeId = this.leaveForm.get('leaveTypeId')?.value;

    // Find balance by matching leaveTypeId with the type's name
    // Since LeaveBalance uses leaveTypeName, we need to find the type first
    const selectedType = this.leaveTypes.find(t => t.leaveTypeId === leaveTypeId);
    if (selectedType) {
      const balance = this.leaveBalances.find(b => b.leaveTypeName === selectedType.typeName);
      this.selectedLeaveBalance = balance?.remainingDays || 0;
    } else {
      this.selectedLeaveBalance = 0;
    }

    this.validateBalance();
  }

  onDateChange(): void {
    const startDate = this.leaveForm.get('startDate')?.value;
    const endDate = this.leaveForm.get('endDate')?.value;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end >= start) {
        this.calculatedDays = this.calculateWorkingDays(
          start.toISOString(),
          end.toISOString()
        );
        this.validateBalance();
        this.checkForOverlap();
      } else {
        this.showOverlapWarning = false;
      }
    } else {
      this.showOverlapWarning = false;
    }
  }

  private checkForOverlap(): void {
    const startDate = this.leaveForm.get('startDate')?.value;
    const endDate = this.leaveForm.get('endDate')?.value;

    if (!startDate || !endDate) {
      this.showOverlapWarning = false;
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      this.showOverlapWarning = false;
      return;
    }

    this.isCheckingOverlap = true;
    const excludeRequestId = this.isEditMode && this.requestId ? this.requestId : undefined;

    // Format dates as YYYY-MM-DD for date-only comparison (database stores DATE type)
    const formatDateOnly = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    this.leaveService.checkLeaveOverlap(
      formatDateOnly(start),
      formatDateOnly(end),
      excludeRequestId
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (hasOverlap) => {
          console.log('Overlap check result:', hasOverlap, 'for dates:', formatDateOnly(start), 'to', formatDateOnly(end));
          this.showOverlapWarning = hasOverlap;
          this.isCheckingOverlap = false;
        },
        error: (error) => {
          console.error('Error checking leave overlap:', error);
          this.isCheckingOverlap = false;
          // Don't show warning on error, let backend handle it
          this.showOverlapWarning = false;
        }
      });
  }

  private validateBalance(): void {
    const leaveTypeId = this.leaveForm.get('leaveTypeId')?.value;

    if (leaveTypeId && this.calculatedDays > 0) {
      // Find the selected type and then match with balance
      const selectedType = this.leaveTypes.find(t => t.leaveTypeId === leaveTypeId);
      if (selectedType) {
        const balance = this.leaveBalances.find(b => b.leaveTypeName === selectedType.typeName);
        this.selectedLeaveBalance = balance?.remainingDays || 0;
        this.showBalanceWarning = this.calculatedDays > this.selectedLeaveBalance;
      } else {
        this.showBalanceWarning = false;
      }
    } else {
      this.showBalanceWarning = false;
    }
  }

  getAvailableDays(leaveTypeId: string): number | null {
    // Find type name first, then match with balance
    const selectedType = this.leaveTypes.find(t => t.leaveTypeId === leaveTypeId);
    if (!selectedType) return null;

    const balance = this.leaveBalances.find(b => b.leaveTypeName === selectedType.typeName);
    return balance ? balance.remainingDays : null;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.leaveForm.valid && !this.showBalanceWarning && !this.showOverlapWarning && !this.isCheckingOverlap) {
      this.isSubmitting = true;
      const formValue = this.leaveForm.value;

      const startDate = new Date(formValue.startDate);
      const endDate = new Date(formValue.endDate);

      // Format dates as YYYY-MM-DD for date-only comparison
      const formatDateOnly = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const request: CreateLeaveRequest = {
        leaveTypeId: formValue.leaveTypeId,
        // startDate: startDate.toISOString(),
        // endDate: endDate.toISOString(),
        startDate: formatDateOnly(startDate), // ✅ use formatDateOnly
        endDate: formatDateOnly(endDate),
        reason: formValue.reason || ''
      };

      // Final overlap check before submission as safeguard
      const excludeRequestId = this.isEditMode && this.requestId ? this.requestId : undefined;
      this.leaveService.checkLeaveOverlap(
        formatDateOnly(startDate),
        formatDateOnly(endDate),
        excludeRequestId
      ).pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (hasOverlap) => {
            if (hasOverlap) {
              this.showOverlapWarning = true;
              this.isSubmitting = false;
              this.notificationService.showError('You have already applied for leave during this period. Please select different dates.');
              return;
            }

            // Validate before submission
            const validationErrors = this.leaveService.validateLeaveRequest(request, this.leaveBalances, this.leaveTypes);

            if (validationErrors.length > 0) {
              this.notificationService.showError(validationErrors[0]);
              this.isSubmitting = false;
              return;
            }

            this.submitLeaveRequest(request);
          },
          error: (error) => {
            console.error('Error in final overlap check:', error);
            // Continue with submission, backend will catch it
            const validationErrors = this.leaveService.validateLeaveRequest(request, this.leaveBalances, this.leaveTypes);

            if (validationErrors.length > 0) {
              this.notificationService.showError(validationErrors[0]);
              this.isSubmitting = false;
              return;
            }

            this.submitLeaveRequest(request);
          }
        });
    }
  }

  private submitLeaveRequest(request: CreateLeaveRequest): void {

    if (this.isEditMode && this.requestId) {
      // Update existing request
      this.leaveService.updateLeaveRequest(this.requestId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            this.notificationService.showSuccess('Leave request updated successfully');
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error('Error updating leave request:', error);
            this.isSubmitting = false;
            const errorMessage = error?.error?.message || error?.message || 'Failed to update leave request';
            // Check if it's an overlap error
            if (errorMessage.toLowerCase().includes('overlap')) {
              this.showOverlapWarning = true;
            }
            this.notificationService.showError(errorMessage);
          }
        });
    } else {
      // Create new request
      this.leaveService.createLeaveRequest(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSubmitting = false;
            this.notificationService.showSuccess('Leave request submitted successfully');
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error('Error submitting leave request:', error);
            this.isSubmitting = false;
            const errorMessage = error?.error?.message || error?.message || 'Failed to submit leave request';
            // Check if it's an overlap error
            if (errorMessage.toLowerCase().includes('overlap')) {
              this.showOverlapWarning = true;
            }
            this.notificationService.showError(errorMessage);
          }
        });
    }
  }

  formInvalidOrChecking(): boolean {
    return !this.leaveForm.valid || this.isSubmitting || this.showBalanceWarning || this.showOverlapWarning || this.isCheckingOverlap;
  }
}
