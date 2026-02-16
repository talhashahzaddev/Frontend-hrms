import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
    MatCardModule
  ],
  template: `
    <div class="apply-leave-container">
      <mat-card class="apply-leave-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>{{ isEditMode ? 'edit' : 'event_available' }}</mat-icon>
            {{ isEditMode ? 'Edit Leave Request' : 'Apply for Leave' }}
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
        <form [formGroup]="leaveForm" class="leave-form">
          
          <!-- Leave Selection Section -->
          <div class="form-section">
            <h3 class="section-title">
              <mat-icon>category</mat-icon>
              Leave Type Selection
            </h3>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Leave Type *</mat-label>
                <mat-select formControlName="leaveTypeId" (selectionChange)="onLeaveTypeChange()">
                  <mat-option *ngFor="let type of leaveTypes" [value]="type.leaveTypeId">
                    <div class="leave-type-option">
                      <div class="type-indicator" [style.background-color]="type.color"></div>
                      <span>{{ type.typeName }}</span>
                      <span class="available-days" *ngIf="getAvailableDays(type.leaveTypeId) !== null">
                        {{ getAvailableDays(type.leaveTypeId) }} days left
                      </span>
                    </div>
                  </mat-option>
                </mat-select>
                <mat-hint>Select the type of leave you want to apply for</mat-hint>
                <mat-error *ngIf="leaveForm.get('leaveTypeId')?.hasError('required')">
                  Please select a leave type
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- Leave Duration Section -->
          <div class="form-section">
            <h3 class="section-title">
              <mat-icon>date_range</mat-icon>
              Leave Duration
            </h3>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Start Date *</mat-label>
                <input matInput 
                       [matDatepicker]="startPicker" 
                       formControlName="startDate"
                       [min]="minDate"
                       (dateChange)="onDateChange()"
                       placeholder="Select start date">
                <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
                <mat-datepicker #startPicker></mat-datepicker>
                <mat-error *ngIf="leaveForm.get('startDate')?.hasError('required')">
                  Start date is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>End Date *</mat-label>
                <input matInput 
                       [matDatepicker]="endPicker" 
                       formControlName="endDate"
                       [min]="leaveForm.get('startDate')?.value || minDate"
                       (dateChange)="onDateChange()"
                       placeholder="Select end date">
                <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
                <mat-datepicker #endPicker></mat-datepicker>
                <mat-error *ngIf="leaveForm.get('endDate')?.hasError('required')">
                  End date is required
                </mat-error>
              </mat-form-field>
            </div>

            <!-- Days Count Display -->
            <div class="days-info" *ngIf="calculatedDays > 0">
              <mat-icon>info</mat-icon>
              <div class="info-content">
                <span class="info-label">Total Duration</span>
                <span class="info-value">{{ calculatedDays }} {{ calculatedDays === 1 ? 'day' : 'days' }}</span>
              </div>
            </div>

            <!-- Balance Warning -->
            <div class="balance-warning" *ngIf="showBalanceWarning">
              <mat-icon>warning</mat-icon>
              <div class="warning-content">
                <span class="warning-label">Insufficient Balance!</span>
                <span class="warning-text">You only have {{ selectedLeaveBalance }} days available for this leave type.</span>
              </div>
            </div>

            <!-- Overlap Warning -->
            <div class="balance-warning" *ngIf="showOverlapWarning">
              <mat-icon>warning</mat-icon>
              <div class="warning-content">
                <span class="warning-label">Leave Overlap Detected!</span>
                <span class="warning-text">You have already applied for leave during this period. Please select different dates.</span>
              </div>
            </div>

            <!-- Checking Overlap Indicator -->
            <div class="days-info" *ngIf="isCheckingOverlap">
              <mat-icon>sync</mat-icon>
              <div class="info-content">
                <span class="info-label">Checking for overlaps...</span>
              </div>
            </div>
          </div>

          <!-- Additional Information Section -->
          <div class="form-section">
            <h3 class="section-title">
              <mat-icon>description</mat-icon>
              Additional Information
            </h3>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Reason (Optional)</mat-label>
                <textarea matInput 
                          formControlName="reason" 
                          rows="4"
                          placeholder="Provide a reason for your leave request"
                          maxlength="500"></textarea>
                <mat-hint align="end">{{ leaveForm.get('reason')?.value?.length || 0 }}/500</mat-hint>
                <mat-error *ngIf="leaveForm.get('reason')?.hasError('maxlength')">
                  Reason cannot exceed 500 characters
                </mat-error>
              </mat-form-field>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button mat-button type="button" (click)="onCancel()" [disabled]="isSubmitting">
              <mat-icon>cancel</mat-icon>
              Cancel
            </button>
            
            <button mat-raised-button 
                    color="primary" 
                    type="submit"
                    (click)="onSubmit()"
                    [disabled]="!leaveForm.valid || isSubmitting || showBalanceWarning || showOverlapWarning || isCheckingOverlap">
              <mat-icon *ngIf="!isSubmitting">{{ isEditMode ? 'save' : 'send' }}</mat-icon>
              <span *ngIf="!isSubmitting">{{ isEditMode ? 'Update' : 'Submit' }} Request</span>
              <span *ngIf="isSubmitting">{{ isEditMode ? 'Updating...' : 'Submitting...' }}</span>
            </button>
          </div>

        </form>
        </mat-card-content>
      </mat-card>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="60"></mat-spinner>
        <p>Loading leave application form...</p>
      </div>
    </div>
  `,
  styleUrls: ['./apply-leave.component.scss']
})
export class ApplyLeaveComponent implements OnInit, OnDestroy {
  @Input() requestId?: string;

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

  constructor(
    private fb: FormBuilder,
    private leaveService: LeaveService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Get request ID from route params if not provided as input
    if (!this.requestId) {
      this.requestId = this.route.snapshot.paramMap.get('id') || undefined;
    }

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

    const requests: any = {
      leaveTypes: this.leaveService.getLeaveTypes(),
      leaveBalances: this.leaveService.getMyLeaveBalance()
    };

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

          // If editing, populate form with request data
          if (this.isEditMode && data.leaveRequest) {
            this.populateFormForEdit(data.leaveRequest);
          } else {
            // Check for query params from calendar navigation
            this.route.queryParams
              .pipe(takeUntil(this.destroy$))
              .subscribe(params => {
                if (params['startDate'] && params['endDate']) {
                  this.leaveForm.patchValue({
                    startDate: new Date(params['startDate']),
                    endDate: new Date(params['endDate'])
                  });
                  // Trigger date change to calculate days
                  setTimeout(() => {
                    this.onDateChange();
                  }, 100);
                }
              });
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
    this.router.navigate(['/leave/dashboard']);
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
            this.router.navigate(['/leave/dashboard']);
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
            this.router.navigate(['/leave/dashboard']);
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
}
