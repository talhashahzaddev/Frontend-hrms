import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';

import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '@/app/core/services/auth.service';
import { PerformanceService } from '../../services/performance.service';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { NotificationService } from '../../../../core/services/notification.service';

import { CreateGoalRequest, GoalStatus, Goal } from '../../../../core/models/performance.models';
import { User } from '@/app/core/models/auth.models';
import { Employee } from '@/app/core/models/employee.models';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatOptionModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule
  ],
  templateUrl: './goals-kras.component.html',
  styleUrls: ['./goals-kras.component.scss'],
  
})
export class GoalsKRAsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  goalForm!: FormGroup;
  isSubmitting = false;
  employees: Employee[] = [];
  allGoals: Goal[] = [];
  isLoadingGoals = false;

  private destroy$ = new Subject<void>();

  statusOptions = [
    { value: GoalStatus.NOT_STARTED, label: 'Not Started' },
    { value: GoalStatus.IN_PROGRESS, label: 'In Progress' },
    { value: GoalStatus.COMPLETED, label: 'Completed' },
    { value: GoalStatus.CANCELLED, label: 'Cancelled' }
  ];

  constructor(
    private fb: FormBuilder,
    private performanceService: PerformanceService,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.getCurrentUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.goalForm = this.fb.group({
      employeeId: [null, Validators.required],
      title: ['', Validators.required],
      description: [''],
      startDate: [''],
      endDate: [''],
      status: [GoalStatus.NOT_STARTED, Validators.required]
    });
  }

  private getCurrentUser(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          console.log('current user;',this.currentUser)
          if (!user) return;

          // Load employees and all goals for everyone
          this.loadEmployees();
          this.loadAllGoals();

          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error fetching current user:', err)
      });
  }

hasManagerRole(): boolean {
  return this.authService.hasAnyRole(['Super Admin', 'HR Manager', 'Manager']);
}

hasHRRole(): boolean {
  return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
}

  private loadEmployees(): void {
    this.employeeService.getEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.employees = res.employees || [],
        error: (err) => this.notificationService.showError('Failed to load employees')
      });
  }


  
private loadAllGoals(): void {
  this.isLoadingGoals = true;

  if (this.hasManagerRole()) {
    // Managers / HR / Super Admin -> load all goals
    this.performanceService.getAllGoals()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.allGoals = res.success && res.data ? res.data : [];
          this.isLoadingGoals = false;
        },
        error: () => {
          this.isLoadingGoals = false;
          this.notificationService.showError('Failed to load goals');
        }
      });
  } else if (this.currentUser) {
    // Employee -> load only their own goals
    this.performanceService.getGoalsByEmployeeId(this.currentUser.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.allGoals = res.success && res.data ? res.data : [];
          this.isLoadingGoals = false;
        },
        error: () => {
          this.isLoadingGoals = false;
          this.notificationService.showError('Failed to load your goals');
        }
      });
  }
}

//Complete Goal status

onSubmitStatus(goal: Goal, status: 'IN_PROGRESS' | 'COMPLETED'): void {
  if (status === 'COMPLETED') {
    // Call backend API to mark goal complete
    this.performanceService.completeGoal(goal.goalId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.notificationService.showSuccess('Goal marked as completed!');
          this.loadAllGoals(); // refresh the list
        },
        error: (err) => {
          console.error(err);
          this.notificationService.showError('Failed to mark goal as completed');
        }
      });
  } else {
    // If you later add IN_PROGRESS API, you can handle here
    this.notificationService.showInfo('In-progress status coming soon!');
  }
}





  onSubmit(): void {
    if (!this.goalForm.valid) {
      this.markFormGroupTouched(this.goalForm);
      this.notificationService.showError('Please fill in required fields');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.goalForm.value;

    const request: CreateGoalRequest = {
      employeeId: formValue.employeeId,
      title: formValue.title,
      description: formValue.description,
      startDate: formValue.startDate,
      endDate: formValue.endDate
    };

    this.performanceService.createGoal(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Goal created successfully!');
          this.goalForm.reset({ status: GoalStatus.NOT_STARTED });
          this.isSubmitting = false;
          this.loadAllGoals(); // Reload goals for everyone
        },
        error: () => {
          this.notificationService.showError('Failed to create goal');
          this.isSubmitting = false;
        }
      });
  }




  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) this.markFormGroupTouched(control);
    });
  }
}




















