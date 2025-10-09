import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '@/app/core/services/auth.service';
import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CreateAppraisal,AppraisalCycle } from '../../../../core/models/performance.models';
import { User } from '@/app/core/models/auth.models';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { Employee } from '@/app/core/models/employee.models';


@Component({
  selector: 'app-appraisals',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './appraisals.component.html',
  styleUrls: ['./appraisals.component.scss']
})
export class AppraisalsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  appraisalForm!: FormGroup;
  isSubmitting = false;
  // appraisalCycles: any[] = []; // store cycles from backend
employees: Employee[] = [];
public appraisalCycles: AppraisalCycle[] = [];

  private destroy$ = new Subject<void>();

  reviewTypes = [
    { value: 'self', label: 'Self Review' },
    { value: 'manager', label: 'Manager Review' },
    { value: 'peer', label: 'Peer Review' }
  ];

  constructor(
    private fb: FormBuilder,
    private performanceService: PerformanceService,
     private authService: AuthService,
    private notificationService: NotificationService,
    private employeeService: EmployeeService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadAppraisalCycles();
     this.getCurrentUser();
     this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getCurrentUser(): void {
    this.authService.currentUser$
    .pipe(takeUntil(this.destroy$))
    .subscribe(user=>
      this.currentUser=user,
     error=>console.error('Error while getting current user in Appraise',error)
    )

  }


  private loadEmployees(): void {
  this.employeeService.getEmployees()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        this.employees = res.employees || [];
      },
      error: () => {
        this.notificationService.showError('Failed to load employees');
      }
    });
}

  private initializeForm(): void {
    this.appraisalForm = this.fb.group({
      cycleId: ['', Validators.required], // make cycle required
      employeeId: ['', Validators.required],
      reviewType: ['', Validators.required],
      overallRating: [null],
      feedback: [''],
      improvementAreas: [''],
      developmentPlan: ['']
    });
  }


  private loadAppraisalCycles(): void {
  this.performanceService.getAppraisalCycles(1, 50)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.appraisalCycles = response.data || []; // now it's an array
        console.log('Loaded cycles:', this.appraisalCycles);
      },
      error: (err) => {
        console.error('Failed to load cycles', err);
        this.notificationService.showError('Failed to load appraisal cycles');
      }
    });
}

  onSubmit(): void {
    if (!this.currentUser) {
    this.notificationService.showError('Current user not found.');
    return;
  }


    if (this.appraisalForm.valid) {
      this.isSubmitting = true;
      const formValue = this.appraisalForm.value;

      const request: CreateAppraisal = {
        cycleId: formValue.cycleId,
        employeeId: formValue.employeeId,
        reviewType: formValue.reviewType,
        overallRating: formValue.overallRating,
        kraRatings: {}, // map dynamic fields later if needed
        skillRatings: {},
        feedback: formValue.feedback,
        improvementAreas: formValue.improvementAreas,
        developmentPlan: formValue.developmentPlan
      };

      this.performanceService.createAppraisal(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.notificationService.showSuccess('Appraisal created successfully');
            this.appraisalForm.reset();
            this.isSubmitting = false;
          },
          error: (error) => {
            console.error('Error creating appraisal:', error);
            this.notificationService.showError('Failed to create appraisal');
            this.isSubmitting = false;
          }
        });
    } else {
      this.markFormGroupTouched(this.appraisalForm);
      this.notificationService.showError('Please fill in required fields');
    }
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
