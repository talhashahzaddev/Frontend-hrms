import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subject, takeUntil, interval, takeWhile } from 'rxjs';

import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { Department } from '../../../../core/models/employee.models';
import { 
  PayrollPeriod, 
  PayrollStatus,
  PayrollProcessingHistory,
  SalaryRule
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
    MatChipsModule,
    MatCheckboxModule
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
  salaryRules: SalaryRule[] = [];
  departments: Department[] = [];

  // Processing state
  isProcessing = false;
  processingComplete = false;
  processingMessage = '';
  currentStep = 1;
  processingResults: any = null;
  
  // Currency
  organizationCurrency: string = 'USD';

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private notificationService: NotificationService,
    private employeeService: EmployeeService,
    private settingsService: SettingsService,
    private router: Router
  ) {
    this.selectionForm = this.fb.group({
      selectedPeriod: ['', Validators.required]
    });

    this.settingsForm = this.fb.group({
      selectedRuleId: ['', Validators.required],
      selectedDepartmentIds: [[]],
      includeTax: [false]
    });
  }

  ngOnInit(): void {
    this.loadOrganizationCurrency();
    this.loadAvailablePeriods();
    this.setupFormSubscriptions();
    this.loadRecentProcessing();
    this.loadSalaryRules();
    this.loadDepartments();
    this.setupSettingsFormValidation();
  }

  private loadOrganizationCurrency(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (currency) => {
          this.organizationCurrency = currency;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading organization currency:', error);
          this.organizationCurrency = 'USD';
        }
      });
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
            const periods = response.data.data || [];
            this.availablePeriods = periods.filter((p: PayrollPeriod) => 
              p.status === 'draft' || p.status === 'calculated'
            );
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error loading periods:', error);
          const errorMessage =
            error?.error?.message ||
            error?.message ||
            'Failed to load payroll periods';
          this.notificationService.showError(errorMessage);
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
          const errorMessage =
            error?.error?.message ||
            error?.message ||
            'Failed to load processing history';
          this.notificationService.showError(errorMessage);
        }
      });
  }

  private loadSalaryRules(): void {
    this.payrollService.getSalaryRules()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.salaryRules = response.data;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error loading salary rules:', error);
          const errorMessage =
            error?.error?.message ||
            error?.message ||
            'Failed to load salary rules';
          this.notificationService.showError(errorMessage);
        }
      });
  }

  private loadDepartments(): void {
    this.employeeService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (departments) => {
          this.departments = departments;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading departments:', error);
          const errorMessage =
            error?.error?.message ||
            error?.message ||
            'Failed to load departments';
          this.notificationService.showError(errorMessage);
        }
      });
  }

  private setupSettingsFormValidation(): void {
    // Watch for changes in selectedRuleId and includeTax to validate
    this.settingsForm.get('selectedRuleId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.validateTaxAndRuleConflict();
      });

    this.settingsForm.get('includeTax')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.validateTaxAndRuleConflict();
      });
  }

  private validateTaxAndRuleConflict(): void {
    const selectedRuleId = this.settingsForm.get('selectedRuleId')?.value;
    const includeTax = this.settingsForm.get('includeTax')?.value;
    
    if (selectedRuleId && includeTax) {
      const selectedRule = this.salaryRules.find(r => r.ruleId === selectedRuleId);
      
      if (selectedRule) {
        // Check if the rule's component type is 'deduction'
        // Note: 'earning' in backend means allowance, 'deduction' means deduction
        const componentType = selectedRule.componentType?.toLowerCase();
        
        if (componentType === 'deduction') {
          // Clear tax checkbox and show warning
          this.settingsForm.patchValue({ includeTax: false }, { emitEvent: false });
          this.notificationService.showWarning(
            'Tax cannot be included with a deduction-type salary rule. The rule already includes deductions.'
          );
          this.cdr.markForCheck();
        }
      }
    }
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
    
    const ruleId = this.settingsForm.get('selectedRuleId')?.value as string;
    const departmentIds = this.settingsForm.get('selectedDepartmentIds')?.value as string[];
    const includeTax = this.settingsForm.get('includeTax')?.value as boolean;

    // Validate tax and rule conflict one more time before processing
    if (includeTax && ruleId) {
      const selectedRule = this.salaryRules.find(r => r.ruleId === ruleId);
      const componentType = selectedRule?.componentType?.toLowerCase();
      
      // Check if the selected rule is a deduction type
      if (componentType === 'deduction') {
        this.notificationService.showError(
          'Cannot process payroll: Tax cannot be included with a deduction-type salary rule. Please uncheck "Include Tax" or select an allowance-type rule.'
        );
        this.isProcessing = false;
        this.cdr.markForCheck();
        return;
      }
    }

    // Filter out empty department IDs if any
    const validDepartmentIds = departmentIds && departmentIds.length > 0 
      ? departmentIds.filter(id => id && id.trim() !== '') 
      : undefined;

    // Call actual API
    this.payrollService.calculatePayroll(
      this.selectedPeriodDetails.periodId, 
      ruleId, 
      validDepartmentIds, 
      includeTax
    )
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
          const errorMessage =
            error?.error?.message ||
            error?.message ||
            'Failed to calculate payroll';
          this.notificationService.showError(errorMessage);
          this.cdr.markForCheck();
        }
      });
  }

  viewPayrollEntries(): void {
    // Navigate to payroll reports with period ID in query params
    if (this.selectedPeriodDetails?.periodId) {
      this.router.navigate(['/payroll/reports'], {
        queryParams: { periodId: this.selectedPeriodDetails.periodId, tab: 'detailed' }
      });
    }
  }

  resetProcessing(): void {
    this.isProcessing = false;
    this.processingComplete = false;
    this.currentStep = 1;
    this.processingMessage = '';
    this.processingResults = null;
    this.selectionForm.reset();
    this.settingsForm.reset({
      selectedRuleId: '',
      selectedDepartmentIds: [],
      includeTax: false
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
