import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { Subject, takeUntil, interval, takeWhile } from 'rxjs';

import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  PayrollPeriod, 
  PayrollStatus,
  PayrollProcessingHistory
} from '../../../../core/models/payroll.models';

@Component({
  selector: 'app-payroll-processing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatStepperModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './payroll-processing.component.html',
  styleUrls: ['./payroll-processing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayrollProcessingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  // Forms
  selectionForm: FormGroup;
  settingsForm: FormGroup;

  // Data
  availablePeriods: PayrollPeriod[] = [];
  selectedPeriodDetails: PayrollPeriod | null = null;
  recentProcessing: PayrollProcessingHistory[] = [];

  // Processing state
  isProcessing = false;
  processingComplete = false;
  processingMessage = '';
  currentStep = 1;
  processingResults: any = null;

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private notificationService: NotificationService
  ) {
    this.selectionForm = this.fb.group({
      selectedPeriod: ['', Validators.required]
    });

    this.settingsForm = this.fb.group({
      includeOvertime: [true],
      includeAllowances: [true],
      includeDeductions: [true]
    });
  }

  ngOnInit(): void {
    this.loadAvailablePeriods();
    this.setupFormSubscriptions();
    this.loadRecentProcessing();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAvailablePeriods(): void {
    this.payrollService.getPayrollPeriods()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Filter periods that can be processed (draft or calculated status)
            this.availablePeriods = response.data.filter(p => 
              p.status === 'draft' || p.status === 'calculated'
            );
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error loading periods:', error);
          this.notificationService.showError('Failed to load payroll periods');
        }
      });
  }

  private setupFormSubscriptions(): void {
    this.selectionForm.get('selectedPeriod')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(periodId => {
        if (periodId) {
          this.selectedPeriodDetails = this.availablePeriods.find(p => p.periodId === periodId) || null;
          this.cdr.markForCheck();
        }
      });
  }

  private loadRecentProcessing(): void {
    this.payrollService.getProcessingHistory(5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.recentProcessing = response.data;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error loading processing history:', error);
          this.notificationService.showError('Failed to load processing history');
        }
      });
  }

  startProcessing(): void {
    if (!this.selectedPeriodDetails) return;

    this.isProcessing = true;
    this.processingComplete = false;
    this.currentStep = 1;
    this.processingMessage = 'Initializing payroll processing...';
    this.cdr.markForCheck();

    // Simulate processing steps
    this.simulateProcessingSteps();
  }

  private simulateProcessingSteps(): void {
    const steps = [
      { step: 1, message: 'Calculating basic salaries...', delay: 2000 },
      { step: 2, message: 'Applying overtime and bonuses...', delay: 1500 },
      { step: 3, message: 'Calculating deductions and taxes...', delay: 2000 },
      { step: 4, message: 'Generating payroll entries...', delay: 1500 },
      { step: 5, message: 'Finalizing payroll...', delay: 1000 }
    ];

    let currentIndex = 0;

    const processStep = () => {
      if (currentIndex < steps.length) {
        const step = steps[currentIndex];
        this.currentStep = step.step;
        this.processingMessage = step.message;
        this.cdr.markForCheck();

        setTimeout(() => {
          currentIndex++;
          processStep();
        }, step.delay);
      } else {
        this.completeProcessing();
      }
    };

    processStep();
  }

  private completeProcessing(): void {
    if (!this.selectedPeriodDetails) return;

    // Call actual API
    this.payrollService.calculatePayroll(this.selectedPeriodDetails.periodId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isProcessing = false;
          this.processingComplete = true;
          if (response.success && response.data) {
            this.processingResults = {
              entriesCreated: response.data.entriesCreated,
              totalGross: response.data.totalGrossAmount,
              totalNet: response.data.totalNetAmount
            };
            this.notificationService.showSuccess('Payroll calculated successfully!');
          } else {
            this.notificationService.showError(response.message || 'Failed to calculate payroll');
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Processing error:', error);
          this.isProcessing = false;
          this.notificationService.showError('Failed to calculate payroll');
          this.cdr.markForCheck();
        }
      });
  }

  viewPayrollEntries(): void {
    // Navigate to payroll entries with filter
    window.location.href = '/payroll/entries';
  }

  resetProcessing(): void {
    this.isProcessing = false;
    this.processingComplete = false;
    this.currentStep = 1;
    this.processingMessage = '';
    this.processingResults = null;
    this.selectionForm.reset();
    this.settingsForm.reset({
      includeOvertime: true,
      includeAllowances: true,
      includeDeductions: true
    });
    this.cdr.markForCheck();
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (status) {
      case 'completed':
      case 'paid':
        return 'primary';
      case 'calculated':
      case 'processing':
        return 'accent';
      case 'draft':
        return 'warn';
      default:
        return undefined;
    }
  }
}
