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
import { MatStepperModule } from '@angular/material/stepper';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSliderModule } from '@angular/material/slider';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { 
  SelfAssessment, 
  CreateSelfAssessmentRequest, 
  AppraisalCycle,
  KRA,
  SkillSet
} from '../../../../core/models/performance.models';
import { User } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-self-assessment',
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
    MatStepperModule,
    MatDividerModule,
    MatExpansionModule,
    MatSliderModule
  ],
  templateUrl: './self-assessment.component.html',
  styleUrls: ['./self-assessment.component.scss']
})
export class SelfAssessmentComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isLoading = false;
  isSubmitting = false;
  currentUser: User | null = null;
  activeCycle: AppraisalCycle | null = null;
  kras: KRA[] = [];
  skills: SkillSet[] = [];
  existingAssessments: SelfAssessment[] = [];
  
  assessmentForm: FormGroup;
  selectedStep = 0;

  constructor(
    private performanceService: PerformanceService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.assessmentForm = this.fb.group({
      kraAssessments: this.fb.array([]),
      skillAssessments: this.fb.array([]),
      comments: ['']
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
            
            if (results.kras.success && results.kras.data) {
              const paginatedData = results.kras.data as any;
              this.kras = paginatedData.data || paginatedData.items || [];
              this.initializeKRAAssessments();
            }
            
            if (results.skills.success && results.skills.data) {
              this.skills = results.skills.data || [];
              this.initializeSkillAssessments();
            }

            if (this.currentUser?.userId && this.activeCycle.cycleId) {
              this.loadExistingAssessments();
            }
          } else {
            this.notificationService.showWarning('No active appraisal cycle found');
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading initial data:', error);
          this.notificationService.showError('Failed to load assessment data');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadExistingAssessments(): void {
    if (!this.currentUser?.userId || !this.activeCycle?.cycleId) return;

    this.performanceService.getSelfAssessments(this.currentUser.userId, this.activeCycle.cycleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.existingAssessments = response.data;
            this.populateFormFromExisting();
          }
        },
        error: (error) => {
          console.error('Error loading existing assessments:', error);
        }
      });
  }

  initializeKRAAssessments(): void {
    const kraArray = this.assessmentForm.get('kraAssessments') as FormArray;
    kraArray.clear();
    
    this.kras.forEach(kra => {
      const existing = this.existingAssessments.find(a => a.kraId === kra.kraId);
      kraArray.push(this.fb.group({
        kraId: [kra.kraId],
        rating: [existing?.rating || 0, [Validators.required, Validators.min(1), Validators.max(5)]],
        comments: [existing?.comments || '']
      }));
    });
  }

  initializeSkillAssessments(): void {
    const skillArray = this.assessmentForm.get('skillAssessments') as FormArray;
    skillArray.clear();
    
    this.skills.forEach(skill => {
      const existing = this.existingAssessments.find(a => a.skillId === skill.skillId);
      skillArray.push(this.fb.group({
        skillId: [skill.skillId],
        rating: [existing?.rating || 0, [Validators.required, Validators.min(1), Validators.max(5)]],
        comments: [existing?.comments || '']
      }));
    });
  }

  populateFormFromExisting(): void {
    // Form arrays are already populated in initialize methods
    // This can be used for additional data if needed
  }

  get kraAssessments(): FormArray {
    return this.assessmentForm.get('kraAssessments') as FormArray;
  }

  get skillAssessments(): FormArray {
    return this.assessmentForm.get('skillAssessments') as FormArray;
  }

  saveDraft(): void {
    if (!this.currentUser?.userId || !this.activeCycle?.cycleId) {
      this.notificationService.showError('User or cycle information missing');
      return;
    }

    this.isSubmitting = true;
    const requests: any[] = [];

    // Save KRA assessments
    this.kraAssessments.controls.forEach(control => {
      if (control.valid && control.get('rating')?.value > 0) {
        const request: CreateSelfAssessmentRequest = {
          employeeId: this.currentUser!.userId,
          cycleId: this.activeCycle!.cycleId,
          kraId: control.get('kraId')?.value,
          rating: control.get('rating')?.value,
          comments: control.get('comments')?.value || '',
          status: 'draft'
        };
        requests.push(this.performanceService.createSelfAssessment(request));
      }
    });

    // Save Skill assessments
    this.skillAssessments.controls.forEach(control => {
      if (control.valid && control.get('rating')?.value > 0) {
        const request: CreateSelfAssessmentRequest = {
          employeeId: this.currentUser!.userId,
          cycleId: this.activeCycle!.cycleId,
          skillId: control.get('skillId')?.value,
          rating: control.get('rating')?.value,
          comments: control.get('comments')?.value || '',
          status: 'draft'
        };
        requests.push(this.performanceService.createSelfAssessment(request));
      }
    });

    if (requests.length === 0) {
      this.notificationService.showWarning('Please provide at least one assessment');
      this.isSubmitting = false;
      return;
    }

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationService.showSuccess('Self-assessment saved as draft');
          this.isSubmitting = false;
          this.loadExistingAssessments();
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error saving draft:', error);
          this.notificationService.showError('Failed to save draft');
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }
      });
  }

  submitAssessment(): void {
    if (!this.currentUser?.userId || !this.activeCycle?.cycleId) {
      this.notificationService.showError('User or cycle information missing');
      return;
    }

    if (this.assessmentForm.invalid) {
      this.notificationService.showError('Please complete all required fields');
      return;
    }

    this.isSubmitting = true;
    
    // First save all assessments
    this.saveDraft();
    
    // Then submit
    setTimeout(() => {
      this.performanceService.submitSelfAssessment(this.currentUser!.userId, this.activeCycle!.cycleId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.showSuccess('Self-assessment submitted successfully');
              this.loadExistingAssessments();
            } else {
              this.notificationService.showError(response.message || 'Failed to submit assessment');
            }
            this.isSubmitting = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error submitting assessment:', error);
            this.notificationService.showError('Failed to submit self-assessment');
            this.isSubmitting = false;
            this.cdr.markForCheck();
          }
        });
    }, 500);
  }

  getKraTitle(kraId: string): string {
    const kra = this.kras.find(k => k.kraId === kraId);
    return kra?.title || 'Unknown KRA';
  }

  getSkillName(skillId: string): string {
    const skill = this.skills.find(s => s.skillId === skillId);
    return skill?.skillName || 'Unknown Skill';
  }

  isSubmitted(): boolean {
    return this.existingAssessments.some(a => a.status === 'submitted');
  }

  formatLabel(value: number): string {
    return `${value}`;
  }
}

