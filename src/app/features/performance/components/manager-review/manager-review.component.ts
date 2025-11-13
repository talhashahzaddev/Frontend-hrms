import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSliderModule } from '@angular/material/slider';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { 
  ManagerReviewRequest,
  SelfAssessment,
  AppraisalCycle,
  KRA,
  SkillSet,
  ConsolidateAppraisalRequest
} from '../../../../core/models/performance.models';
import { Employee } from '../../../../core/models/employee.models';
import { User } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-manager-review',
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
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatSliderModule,
    MatDividerModule,
    MatExpansionModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule
  ],
  templateUrl: './manager-review.component.html',
  styleUrls: ['./manager-review.component.scss']
})
export class ManagerReviewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isLoading = false;
  isSubmitting = false;
  currentUser: User | null = null;
  activeCycle: AppraisalCycle | null = null;
  employees: Employee[] = [];
  selectedEmployee: Employee | null = null;
  employeeSelfAssessments: SelfAssessment[] = [];
  kras: KRA[] = [];
  skills: SkillSet[] = [];
  
  reviewForm: FormGroup;
  displayedColumns: string[] = ['employee', 'cycle', 'status', 'actions'];
  pageSize = 10;
  pageIndex = 0;

  constructor(
    private performanceService: PerformanceService,
    private employeeService: EmployeeService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.reviewForm = this.fb.group({
      employeeId: ['', Validators.required],
      overallRating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      kraRatings: this.fb.array([]),
      skillRatings: this.fb.array([]),
      feedback: [''],
      improvementAreas: [''],
      developmentPlan: ['']
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUserValue();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadInitialData(): void {
    this.isLoading = true;
    
    forkJoin({
      cycle: this.performanceService.getActiveAppraisalCycle(),
      kras: this.performanceService.getKRAs(1, 100),
      skills: this.performanceService.getSkillsMatrix()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          if (results.cycle.success && results.cycle.data) {
            this.activeCycle = results.cycle.data;
          }
          
          if (results.kras.success && results.kras.data) {
            const paginatedData = results.kras.data as any;
            this.kras = paginatedData.data || paginatedData.items || [];
          }
          
          if (results.skills.success && results.skills.data) {
            this.skills = results.skills.data || [];
          }

          if (this.currentUser?.userId && this.activeCycle?.cycleId) {
            this.loadTeamSelfAssessments();
          }
          
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading initial data:', error);
          this.notificationService.showError('Failed to load review data');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadTeamSelfAssessments(): void {
    if (!this.currentUser?.userId || !this.activeCycle?.cycleId) return;

    this.performanceService.getTeamSelfAssessments(this.currentUser.userId, this.activeCycle.cycleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Group by employee to get unique employee IDs
            const employeeIds = new Set<string>();
            response.data.forEach(assessment => {
              employeeIds.add(assessment.employeeId);
            });

            // Load employees using employee service
            const employeeIdArray = Array.from(employeeIds);
            if (employeeIdArray.length > 0) {
              // Load employees - using a search that includes these IDs
              // For now, we'll load all employees and filter
              this.employeeService.getEmployees({
                page: 1,
                pageSize: 1000,
                sortBy: 'firstName',
                sortDirection: 'asc'
              } as any).subscribe({
                next: (empResponse) => {
                  if (empResponse && empResponse.employees) {
                    // Filter to only employees with self-assessments
                    this.employees = empResponse.employees.filter((emp: Employee) => 
                      employeeIdArray.includes(emp.employeeId)
                    );
                  }
                },
                error: (err) => {
                  console.error('Error loading employees:', err);
                  // Fallback: create minimal employee objects
                  this.employees = employeeIdArray.map(id => ({
                    employeeId: id,
                    firstName: 'Employee',
                    lastName: id.substring(0, 8),
                    email: '',
                    status: 'active'
                  } as Employee));
                }
              });
            }
          }
        },
        error: (error) => {
          console.error('Error loading team assessments:', error);
        }
      });
  }

  onEmployeeSelect(employeeId: string): void {
    if (!this.activeCycle?.cycleId) return;

    this.isLoading = true;
    
    this.performanceService.getEmployeeSelfAssessment(employeeId, this.activeCycle.cycleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.employeeSelfAssessments = response.data;
            this.initializeReviewForm();
            
            // Find employee from employees list
            const emp = this.employees.find(e => e.employeeId === employeeId);
            if (emp) {
              this.selectedEmployee = emp;
            }
          }
          
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading employee data:', error);
          this.notificationService.showError('Failed to load employee assessment');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  initializeReviewForm(): void {
    const kraRatings = this.reviewForm.get('kraRatings') as FormArray;
    const skillRatings = this.reviewForm.get('skillRatings') as FormArray;
    
    kraRatings.clear();
    skillRatings.clear();

    // Initialize KRA ratings from self-assessments
    this.employeeSelfAssessments
      .filter(a => a.kraId)
      .forEach(assessment => {
        kraRatings.push(this.fb.group({
          kraId: [assessment.kraId],
          rating: [assessment.rating, [Validators.required, Validators.min(1), Validators.max(5)]],
          employeeRating: [assessment.rating],
          comments: [assessment.comments || '']
        }));
      });

    // Initialize Skill ratings from self-assessments
    this.employeeSelfAssessments
      .filter(a => a.skillId)
      .forEach(assessment => {
        skillRatings.push(this.fb.group({
          skillId: [assessment.skillId],
          rating: [assessment.rating, [Validators.required, Validators.min(1), Validators.max(5)]],
          employeeRating: [assessment.rating],
          comments: [assessment.comments || '']
        }));
      });
  }

  get kraRatings(): FormArray {
    return this.reviewForm.get('kraRatings') as FormArray;
  }

  get skillRatings(): FormArray {
    return this.reviewForm.get('skillRatings') as FormArray;
  }

  calculateOverallRating(): number {
    const kraRatings = this.kraRatings.controls.map(c => c.get('rating')?.value || 0);
    const skillRatings = this.skillRatings.controls.map(c => c.get('rating')?.value || 0);
    const managerRating = this.reviewForm.get('overallRating')?.value || 0;

    if (kraRatings.length === 0 && skillRatings.length === 0) {
      return managerRating;
    }

    const kraAvg = kraRatings.length > 0 
      ? kraRatings.reduce((a, b) => a + b, 0) / kraRatings.length 
      : 0;
    const skillAvg = skillRatings.length > 0
      ? skillRatings.reduce((a, b) => a + b, 0) / skillRatings.length
      : 0;

    // Weighted: KRAs 60%, Skills 30%, Manager 10%
    return (kraAvg * 0.6) + (skillAvg * 0.3) + (managerRating * 0.1);
  }

  submitReview(): void {
    if (!this.currentUser?.userId || !this.selectedEmployee || !this.activeCycle) {
      this.notificationService.showError('Missing required information');
      return;
    }

    if (this.reviewForm.invalid) {
      this.notificationService.showError('Please complete all required fields');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.reviewForm.value;

    const request: ManagerReviewRequest = {
      managerId: this.currentUser.userId,
      employeeId: this.selectedEmployee.employeeId,
      cycleId: this.activeCycle.cycleId,
      overallRating: this.calculateOverallRating(),
      feedback: formValue.feedback || '',
      improvementAreas: formValue.improvementAreas || '',
      developmentPlan: formValue.developmentPlan || '',
      kraRatings: this.buildKRARatings(),
      skillRatings: this.buildSkillRatings()
    };

    this.performanceService.submitManagerReview(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess('Manager review submitted successfully');
            // Automatically consolidate the appraisal after review
            this.consolidateAppraisal();
          } else {
            this.notificationService.showError(response.message || 'Failed to submit review');
            this.isSubmitting = false;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error submitting review:', error);
          this.notificationService.showError('Failed to submit manager review');
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }
      });
  }

  consolidateAppraisal(): void {
    if (!this.currentUser?.userId || !this.selectedEmployee || !this.activeCycle) {
      return;
    }

    const consolidateRequest: ConsolidateAppraisalRequest = {
      employeeId: this.selectedEmployee.employeeId,
      cycleId: this.activeCycle.cycleId,
      reviewerId: this.currentUser.userId
    };

    this.performanceService.consolidateAppraisal(consolidateRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess('Appraisal consolidated successfully');
            this.reviewForm.reset();
            this.selectedEmployee = null;
            this.employeeSelfAssessments = [];
            this.loadInitialData();
          } else {
            this.notificationService.showWarning('Review submitted but consolidation failed. You can consolidate manually later.');
          }
          this.isSubmitting = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error consolidating appraisal:', error);
          this.notificationService.showWarning('Review submitted but consolidation failed. You can consolidate manually later.');
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }
      });
  }

  buildKRARatings(): { [kraId: string]: number } {
    const ratings: { [kraId: string]: number } = {};
    this.kraRatings.controls.forEach(control => {
      const kraId = control.get('kraId')?.value;
      const rating = control.get('rating')?.value;
      if (kraId && rating) {
        ratings[kraId] = rating;
      }
    });
    return ratings;
  }

  buildSkillRatings(): { [skillId: string]: number } {
    const ratings: { [skillId: string]: number } = {};
    this.skillRatings.controls.forEach(control => {
      const skillId = control.get('skillId')?.value;
      const rating = control.get('rating')?.value;
      if (skillId && rating) {
        ratings[skillId] = rating;
      }
    });
    return ratings;
  }

  getKraTitle(kraId?: string): string {
    if (!kraId) return 'Unknown';
    const kra = this.kras.find(k => k.kraId === kraId);
    return kra?.title || 'Unknown KRA';
  }

  getSkillName(skillId?: string): string {
    if (!skillId) return 'Unknown';
    const skill = this.skills.find(s => s.skillId === skillId);
    return skill?.skillName || 'Unknown Skill';
  }

  hasManagerRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager', 'Manager']);
  }

  formatLabel(value: number): string {
    return `${value}`;
  }
}

