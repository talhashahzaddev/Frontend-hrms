import { Component, OnInit, OnDestroy, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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

interface DialogData {
  request?: LeaveRequest;
  leaveTypes?: LeaveType[];
  leaveBalances?: LeaveBalance[];
}

@Component({
  selector: 'app-apply-leave',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule
  ],
  template: `
    <div class="apply-leave-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>
          <mat-icon>event_available</mat-icon>
          {{ isEditMode ? 'Edit Leave Request' : 'Apply for Leave' }}
        </h2>
        <button mat-icon-button mat-dialog-close class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content>
        <form [formGroup]="leaveForm" class="leave-form">
          
          <!-- Leave Type Selection -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Leave Type</mat-label>
            <mat-icon matPrefix>category</mat-icon>
            <mat-select formControlName="leaveTypeId" (selectionChange)="onLeaveTypeChange()">
              <mat-option *ngFor="let type of leaveTypes" [value]="type.leaveTypeId">
                <div class="leave-type-option">
                  <div class="type-indicator" [style.background-color]="type.color"></div>
                  <span>{{ type.typeName }}</span>
                  <span class="available-days" *ngIf="getAvailableDays(type.leaveTypeId) !== null">
                    ({{ getAvailableDays(type.leaveTypeId) }} days available)
                  </span>
                </div>
              </mat-option>
            </mat-select>
            <mat-error *ngIf="leaveForm.get('leaveTypeId')?.hasError('required')">
              Please select a leave type
            </mat-error>
          </mat-form-field>

          <!-- Date Range -->
          <div class="date-range-container">
            <mat-form-field appearance="outline" class="date-field">
              <mat-label>Start Date</mat-label>
              <mat-icon matPrefix>event</mat-icon>
              <input matInput 
                     [matDatepicker]="startPicker" 
                     formControlName="startDate"
                     [min]="minDate"
                     (dateChange)="onDateChange()">
              <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
              <mat-error *ngIf="leaveForm.get('startDate')?.hasError('required')">
                Start date is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="date-field">
              <mat-label>End Date</mat-label>
              <mat-icon matPrefix>event</mat-icon>
              <input matInput 
                     [matDatepicker]="endPicker" 
                     formControlName="endDate"
                     [min]="leaveForm.get('startDate')?.value || minDate"
                     (dateChange)="onDateChange()">
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
              <mat-error *ngIf="leaveForm.get('endDate')?.hasError('required')">
                End date is required
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Days Count Display -->
          <div class="days-info" *ngIf="calculatedDays > 0">
            <mat-icon>info</mat-icon>
            <span>Total days requested: <strong>{{ calculatedDays }}</strong></span>
          </div>

          <!-- Balance Warning -->
          <div class="balance-warning" *ngIf="showBalanceWarning">
            <mat-icon>warning</mat-icon>
            <span>Insufficient leave balance! Available: {{ selectedLeaveBalance }} days</span>
          </div>

          <!-- Reason -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Reason (Optional)</mat-label>
            <mat-icon matPrefix>notes</mat-icon>
            <textarea matInput 
                      formControlName="reason" 
                      rows="4"
                      placeholder="Provide a reason for your leave request"></textarea>
            <mat-hint>Maximum 500 characters</mat-hint>
            <mat-error *ngIf="leaveForm.get('reason')?.hasError('maxlength')">
              Reason cannot exceed 500 characters
            </mat-error>
          </mat-form-field>

        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button mat-dialog-close [disabled]="isLoading">
          Cancel
        </button>
        <button mat-raised-button 
                color="primary" 
                (click)="onSubmit()"
                [disabled]="!leaveForm.valid || isLoading || showBalanceWarning">
          <mat-spinner *ngIf="isLoading" diameter="20" class="button-spinner"></mat-spinner>
          <span *ngIf="!isLoading">{{ isEditMode ? 'Update Request' : 'Submit Request' }}</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .apply-leave-dialog {
      width: 600px;
      max-width: 90vw;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-lg) var(--spacing-xl);
      border-bottom: 1px solid var(--gray-200);

      h2 {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--gray-900);

        mat-icon {
          color: var(--primary-600);
        }
      }

      .close-button {
        mat-icon {
          color: var(--gray-600);
        }
      }
    }

    mat-dialog-content {
      padding: var(--spacing-xl);
      max-height: 70vh;
      overflow-y: auto;
    }

    .leave-form {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);

      .full-width {
        width: 100%;
      }

      .date-range-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-md);

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }
      }

      .date-field {
        width: 100%;
      }
    }

    .leave-type-option {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);

      .type-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }

      .available-days {
        margin-left: auto;
        font-size: 0.75rem;
        color: var(--gray-600);
      }
    }

    .days-info {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: var(--primary-50);
      border-radius: var(--radius-lg);
      border: 1px solid var(--primary-200);

      mat-icon {
        color: var(--primary-600);
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
      }

      span {
        color: var(--primary-900);
        font-size: 0.875rem;
      }
    }

    .balance-warning {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: var(--danger-50);
      border-radius: var(--radius-lg);
      border: 1px solid var(--danger-200);

      mat-icon {
        color: var(--danger-600);
        font-size: 1.25rem;
        width: 1.25rem;
        height: 1.25rem;
      }

      span {
        color: var(--danger-900);
        font-size: 0.875rem;
        font-weight: 600;
      }
    }

    mat-dialog-actions {
      padding: var(--spacing-lg) var(--spacing-xl);
      border-top: 1px solid var(--gray-200);
      gap: var(--spacing-md);

      button {
        min-width: 120px;
        height: 44px;
        font-weight: 600;
      }
    }

    .button-spinner {
      margin-right: var(--spacing-sm);
      
      ::ng-deep circle {
        stroke: white;
      }
    }
  `]
})
export class ApplyLeaveComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  leaveForm!: FormGroup;
  leaveTypes: LeaveType[] = [];
  leaveBalances: LeaveBalance[] = []; // Changed from LeaveEntitlement[] to LeaveBalance[]
  
  isLoading = false;
  isEditMode = false;
  calculatedDays = 0;
  selectedLeaveBalance = 0;
  showBalanceWarning = false;
  minDate = new Date();

  constructor(
    private fb: FormBuilder,
    private leaveService: LeaveService,
    private notificationService: NotificationService,
    @Optional() public dialogRef: MatDialogRef<ApplyLeaveComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Use data passed from parent component if available
    if (this.data?.leaveTypes && this.data?.leaveBalances) {
      this.leaveTypes = this.data.leaveTypes;
      this.leaveBalances = this.data.leaveBalances;
      this.isLoading = false;
    } else {
      this.loadLeaveData();
    }
    
    if (this.data?.request) {
      this.isEditMode = true;
      this.populateFormForEdit(this.data.request);
    }
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

    forkJoin({
      leaveTypes: this.leaveService.getLeaveTypes(),
      leaveBalances: this.leaveService.getMyLeaveBalance()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.leaveTypes = data.leaveTypes || [];
          this.leaveBalances = Array.isArray(data.leaveBalances) ? data.leaveBalances : [];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading leave data:', error);
          this.notificationService.showError('Failed to load leave data');
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
    this.onDateChange();
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
        this.calculatedDays = this.leaveService.calculateLeaveDays(
          start.toISOString(),
          end.toISOString()
        );
        this.validateBalance();
      }
    }
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

  onSubmit(): void {
    if (this.leaveForm.valid && !this.showBalanceWarning) {
      this.isLoading = true;
      const formValue = this.leaveForm.value;

      const request: CreateLeaveRequest = {
        leaveTypeId: formValue.leaveTypeId,
        startDate: new Date(formValue.startDate).toISOString(),
        endDate: new Date(formValue.endDate).toISOString(),
        reason: formValue.reason || ''
      };

      // Validate before submission
      const validationErrors = this.leaveService.validateLeaveRequest(request, this.leaveBalances);
      
      if (validationErrors.length > 0) {
        this.notificationService.showError(validationErrors[0]);
        this.isLoading = false;
        return;
      }

      this.leaveService.createLeaveRequest(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            this.notificationService.showSuccess('Leave request submitted successfully');
            this.dialogRef?.close(true);
          },
          error: (error) => {
            console.error('Error submitting leave request:', error);
            this.isLoading = false;
            const errorMessage = error?.message || 'Failed to submit leave request';
            this.notificationService.showError(errorMessage);
          }
        });
    }
  }
}