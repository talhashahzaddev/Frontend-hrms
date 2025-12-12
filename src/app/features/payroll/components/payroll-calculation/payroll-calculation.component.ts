import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  PayrollPeriod, 
  PayrollCalculationResult, 
  PayrollEntry,
  PayrollStatus 
} from '../../../../core/models/payroll.models';

interface CalculationStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  inProgress: boolean;
  error?: string;
}

interface CalculationSummary {
  totalEmployees: number;
  totalGrossAmount: number;
  totalTaxAmount: number;
  totalNetAmount: number;
  averageGrossSalary: number;
  averageNetSalary: number;
  departmentBreakdown: DepartmentSummary[];
}

interface DepartmentSummary {
  departmentName: string;
  employeeCount: number;
  totalAmount: number;
  averageAmount: number;
  percentage: number;
}

@Component({
  selector: 'app-payroll-calculation',
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
    MatDividerModule,
    MatListModule,
    MatExpansionModule
  ],
  template: `
    <div class="payroll-calculation-container">
      
      <!-- Header -->
      <div class="calculation-header">
        <h1 class="page-title">
          <mat-icon>calculate</mat-icon>
          Payroll Calculation
        </h1>
        <p class="page-subtitle">Calculate payroll for selected period</p>
      </div>

      <!-- Period Selection -->
      <mat-card class="period-selection-card" *ngIf="!isCalculating && !calculationComplete">
        <mat-card-header>
          <mat-card-title>Select Payroll Period</mat-card-title>
          <mat-card-subtitle>Choose the period for which you want to calculate payroll</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="periodForm" (ngSubmit)="onPeriodSelected()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Payroll Period</mat-label>
              <mat-select formControlName="periodId" required>
                <mat-option *ngFor="let period of availablePeriods" [value]="period.periodId">
                  {{ period.periodName }} ({{ period.startDate | date:'mediumDate' }} - {{ period.endDate | date:'mediumDate' }})
                  <span class="period-status" [ngClass]="'status-' + period.status">
                    {{ period.status | titlecase }}
                  </span>
                </mat-option>
              </mat-select>
            </mat-form-field>

            <div class="period-details" *ngIf="selectedPeriod">
              <h4>Period Details</h4>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Period Name:</label>
                  <span>{{ selectedPeriod.periodName }}</span>
                </div>
                <div class="detail-item">
                  <label>Start Date:</label>
                  <span>{{ selectedPeriod.startDate | date:'mediumDate' }}</span>
                </div>
                <div class="detail-item">
                  <label>End Date:</label>
                  <span>{{ selectedPeriod.endDate | date:'mediumDate' }}</span>
                </div>
                <div class="detail-item">
                  <label>Pay Date:</label>
                  <span>{{ (selectedPeriod.payDate | date:'mediumDate') || 'Not set' }}</span>
                </div>
                <div class="detail-item">
                  <label>Status:</label>
                  <mat-chip [color]="getStatusColor(selectedPeriod.status)">
                    {{ selectedPeriod.status | titlecase }}
                  </mat-chip>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button mat-raised-button 
                      color="primary" 
                      type="submit"
                      [disabled]="!periodForm.valid || selectedPeriod?.status !== 'draft'">
                <mat-icon>calculate</mat-icon>
                Calculate Payroll
              </button>
              <button mat-stroked-button type="button" (click)="goBack()">
                <mat-icon>arrow_back</mat-icon>
                Back
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Calculation Progress -->
      <mat-card class="calculation-progress-card" *ngIf="isCalculating">
        <mat-card-header>
          <mat-card-title>Calculating Payroll</mat-card-title>
          <mat-card-subtitle>Please wait while we calculate payroll for {{ selectedPeriod?.periodName }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="progress-container">
            <mat-progress-bar 
              mode="determinate" 
              [value]="calculationProgress"
              class="progress-bar">
            </mat-progress-bar>
            <p class="progress-text">{{ calculationProgress }}% Complete</p>
          </div>

          <div class="steps-container">
            <div *ngFor="let step of calculationSteps" 
                 class="step-item"
                 [ngClass]="{
                   'completed': step.completed,
                   'in-progress': step.inProgress,
                   'error': step.error
                 }">
              <div class="step-icon">
                <mat-icon *ngIf="step.completed">check_circle</mat-icon>
                <mat-spinner *ngIf="step.inProgress" diameter="20"></mat-spinner>
                <mat-icon *ngIf="step.error">error</mat-icon>
                <mat-icon *ngIf="!step.completed && !step.inProgress && !step.error">radio_button_unchecked</mat-icon>
              </div>
              <div class="step-content">
                <h4>{{ step.title }}</h4>
                <p>{{ step.description }}</p>
                <p *ngIf="step.error" class="error-message">{{ step.error }}</p>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Calculation Results -->
      <mat-card class="calculation-results-card" *ngIf="calculationComplete && calculationResult">
        <mat-card-header>
          <mat-card-title>Calculation Complete</mat-card-title>
          <mat-card-subtitle>Payroll calculation completed successfully</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          
          <!-- Summary Statistics -->
          <div class="summary-section">
            <h3>Calculation Summary</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-value">{{ calculationResult.entriesCreated }}</div>
                <div class="summary-label">Entries Created</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">{{ calculationResult.totalEmployees }}</div>
                <div class="summary-label">Total Employees</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">{{ calculationResult.totalGrossAmount | currency }}</div>
                <div class="summary-label">Total Gross Amount</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">{{ calculationResult.totalTaxAmount | currency }}</div>
                <div class="summary-label">Total Tax Amount</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">{{ calculationResult.totalNetAmount | currency }}</div>
                <div class="summary-label">Total Net Amount</div>
              </div>
              <div class="summary-item">
                <div class="summary-value">{{ calculationResult.calculatedAt | date:'medium' }}</div>
                <div class="summary-label">Calculated At</div>
              </div>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Detailed Breakdown -->
          <div class="breakdown-section" *ngIf="calculationSummary">
            <h3>Department Breakdown</h3>
            <mat-expansion-panel *ngFor="let dept of calculationSummary.departmentBreakdown" class="department-panel">
              <mat-expansion-panel-header>
                <mat-panel-title>{{ dept.departmentName }}</mat-panel-title>
                <mat-panel-description>
                  {{ dept.employeeCount }} employees • {{ dept.totalAmount | currency }}
                </mat-panel-description>
              </mat-expansion-panel-header>
              
              <div class="department-details">
                <div class="detail-row">
                  <span>Employee Count:</span>
                  <span>{{ dept.employeeCount }}</span>
                </div>
                <div class="detail-row">
                  <span>Total Amount:</span>
                  <span>{{ dept.totalAmount | currency }}</span>
                </div>
                <div class="detail-row">
                  <span>Average Amount:</span>
                  <span>{{ dept.averageAmount | currency }}</span>
                </div>
                <div class="detail-row">
                  <span>Percentage:</span>
                  <span>{{ dept.percentage | number:'1.1-1' }}%</span>
                </div>
              </div>
            </mat-expansion-panel>
          </div>

          <mat-divider></mat-divider>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button mat-raised-button color="primary" (click)="viewPayrollEntries()">
              <mat-icon>list</mat-icon>
              View Payroll Entries
            </button>
            <button mat-stroked-button (click)="exportResults()">
              <mat-icon>download</mat-icon>
              Export Results
            </button>
            <button mat-stroked-button (click)="calculateAnother()">
              <mat-icon>refresh</mat-icon>
              Calculate Another
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="60"></mat-spinner>
        <p>Loading payroll periods...</p>
      </div>

    </div>
  `,
  styleUrls: ['./payroll-calculation.component.scss']
})
export class PayrollCalculationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  // Form
  periodForm: FormGroup;

  // Data
  availablePeriods: PayrollPeriod[] = [];
  selectedPeriod: PayrollPeriod | null = null;
  calculationResult: PayrollCalculationResult | null = null;
  calculationSummary: CalculationSummary | null = null;

  // UI State
  isLoading = false;
  isCalculating = false;
  calculationComplete = false;
  calculationProgress = 0;

  // Calculation Steps
  calculationSteps: CalculationStep[] = [
    {
      step: 1,
      title: 'Validating Period',
      description: 'Checking period status and employee data',
      completed: false,
      inProgress: false
    },
    {
      step: 2,
      title: 'Calculating Basic Salaries',
      description: 'Processing employee basic salary information',
      completed: false,
      inProgress: false
    },
    {
      step: 3,
      title: 'Calculating Overtime',
      description: 'Computing overtime hours and payments',
      completed: false,
      inProgress: false
    },
    {
      step: 4,
      title: 'Applying Deductions',
      description: 'Calculating tax and other deductions',
      completed: false,
      inProgress: false
    },
    {
      step: 5,
      title: 'Generating Entries',
      description: 'Creating payroll entries in database',
      completed: false,
      inProgress: false
    },
    {
      step: 6,
      title: 'Updating Summary',
      description: 'Calculating totals and updating period status',
      completed: false,
      inProgress: false
    }
  ];

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private notificationService: NotificationService
  ) {
    this.periodForm = this.fb.group({
      periodId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadPayrollPeriods();
    this.setupPeriodChangeListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPayrollPeriods(): void {
    this.isLoading = true;
    
    this.payrollService.getPayrollPeriods(1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const periods = response.data.data || [];
            this.availablePeriods = periods.filter((p: PayrollPeriod) => p.status === PayrollStatus.DRAFT);
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading payroll periods:', error);
          this.notificationService.showError('Failed to load payroll periods');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private setupPeriodChangeListener(): void {
    this.periodForm.get('periodId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(periodId => {
        if (periodId) {
          this.selectedPeriod = this.availablePeriods.find(p => p.periodId === periodId) || null;
        } else {
          this.selectedPeriod = null;
        }
        this.cdr.markForCheck();
      });
  }

  onPeriodSelected(): void {
    if (this.periodForm.valid && this.selectedPeriod) {
      this.startCalculation();
    }
  }

  private startCalculation(): void {
    if (!this.selectedPeriod) return;

    this.isCalculating = true;
    this.calculationComplete = false;
    this.calculationProgress = 0;
    this.resetCalculationSteps();

    // Simulate calculation steps
    this.simulateCalculationSteps();

    // Call actual API
    this.payrollService.calculatePayroll(this.selectedPeriod.periodId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.calculationResult = response.data;
            this.completeCalculation();
            this.loadCalculationSummary();
          } else {
            this.handleCalculationError(response.message || 'Calculation failed');
          }
        },
        error: (error) => {
          console.error('Calculation error:', error);
          this.handleCalculationError('Failed to calculate payroll');
        }
      });
  }

  private simulateCalculationSteps(): void {
    let currentStep = 0;
    const totalSteps = this.calculationSteps.length;

    const processStep = () => {
      if (currentStep < totalSteps) {
        // Mark previous step as completed
        if (currentStep > 0) {
          this.calculationSteps[currentStep - 1].completed = true;
          this.calculationSteps[currentStep - 1].inProgress = false;
        }

        // Mark current step as in progress
        this.calculationSteps[currentStep].inProgress = true;
        this.calculationProgress = Math.round(((currentStep + 1) / totalSteps) * 100);

        currentStep++;
        this.cdr.markForCheck();

        // Continue to next step after delay
        setTimeout(processStep, 1000);
      }
    };

    processStep();
  }

  private completeCalculation(): void {
    // Mark all steps as completed
    this.calculationSteps.forEach(step => {
      step.completed = true;
      step.inProgress = false;
    });

    this.calculationProgress = 100;
    this.isCalculating = false;
    this.calculationComplete = true;
    this.cdr.markForCheck();
  }

  private handleCalculationError(message: string): void {
    // Mark current step as error
    const currentStepIndex = this.calculationSteps.findIndex(step => step.inProgress);
    if (currentStepIndex !== -1) {
      this.calculationSteps[currentStepIndex].inProgress = false;
      this.calculationSteps[currentStepIndex].error = message;
    }

    this.isCalculating = false;
    this.notificationService.showError(message);
    this.cdr.markForCheck();
  }

  private resetCalculationSteps(): void {
    this.calculationSteps.forEach(step => {
      step.completed = false;
      step.inProgress = false;
      step.error = undefined;
    });
  }

  private loadCalculationSummary(): void {
    if (!this.calculationResult) return;

    // Load detailed breakdown
    this.payrollService.getPayrollEntries({
      payrollPeriodId: this.calculationResult.periodId
    }, 1, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.calculateDepartmentBreakdown(response.data.data);
          }
        },
        error: (error) => {
          console.error('Error loading calculation summary:', error);
        }
      });
  }

  private calculateDepartmentBreakdown(entries: any[]): void {
    const departmentMap = new Map<string, DepartmentSummary>();

    entries.forEach(entry => {
      const deptName = entry.department || 'Unknown';
      
      if (!departmentMap.has(deptName)) {
        departmentMap.set(deptName, {
          departmentName: deptName,
          employeeCount: 0,
          totalAmount: 0,
          averageAmount: 0,
          percentage: 0
        });
      }

      const dept = departmentMap.get(deptName)!;
      dept.employeeCount++;
      dept.totalAmount += entry.netSalary || 0;
    });

    // Calculate averages and percentages
    const totalAmount = this.calculationResult?.totalNetAmount || 0;
    
    departmentMap.forEach(dept => {
      dept.averageAmount = dept.employeeCount > 0 ? dept.totalAmount / dept.employeeCount : 0;
      dept.percentage = totalAmount > 0 ? (dept.totalAmount / totalAmount) * 100 : 0;
    });

    const totalEmployees = this.calculationResult?.totalEmployees || 0;
    const totalGrossAmount = this.calculationResult?.totalGrossAmount || 0;
    const totalNetAmount = this.calculationResult?.totalNetAmount || 0;

    this.calculationSummary = {
      totalEmployees: totalEmployees,
      totalGrossAmount: totalGrossAmount,
      totalTaxAmount: this.calculationResult?.totalTaxAmount || 0,
      totalNetAmount: totalNetAmount,
      averageGrossSalary: totalEmployees > 0 ? totalGrossAmount / totalEmployees : 0,
      averageNetSalary: totalEmployees > 0 ? totalNetAmount / totalEmployees : 0,
      departmentBreakdown: Array.from(departmentMap.values())
    };

    this.cdr.markForCheck();
  }

  viewPayrollEntries(): void {
    if (this.calculationResult) {
      window.location.href = `/payroll/entries?periodId=${this.calculationResult.periodId}`;
    }
  }

  exportResults(): void {
    this.notificationService.showInfo('Export functionality will be implemented');
  }

  calculateAnother(): void {
    this.calculationComplete = false;
    this.calculationResult = null;
    this.calculationSummary = null;
    this.periodForm.reset();
    this.selectedPeriod = null;
    this.cdr.markForCheck();
  }

  goBack(): void {
    window.history.back();
  }

  getStatusColor(status: PayrollStatus): 'primary' | 'accent' | 'warn' | undefined {
    switch (status) {
      case PayrollStatus.DRAFT:
        return 'warn';
      case PayrollStatus.CALCULATED:
        return 'accent';
      case PayrollStatus.APPROVED:
      case PayrollStatus.PAID:
        return 'primary';
      default:
        return undefined;
    }
  }
}
