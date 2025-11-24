import { AppraisalCycle } from '@/app/core/models/performance.models';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PerformanceService } from '../../services/performance.service';
import { AuthService } from '@/app/core/services/auth.service';
import { NotificationService } from '@/app/core/services/notification.service';
// import { error } from 'console';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { PerformanceSummary } from '@/app/core/models/performance.models';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit,OnDestroy {

public appraisalCycles:AppraisalCycle[]=[];
private destroy$=new Subject<void>();
reportForm!: FormGroup;

summary: PerformanceSummary | null = null;
isLoading = false;




 constructor(
  public fb:FormBuilder,
private PerformanceService:PerformanceService,
private notificaionService:NotificationService
 ){
  
 }


  ngOnInit(): void {
    this.initializeForm();
    
    this.loadAppraisalCycles();
        this.reportForm.get('cycleId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(cycleId => {
        if (cycleId) {
          this.loadSummary(cycleId);
        }
      });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

   private initializeForm(): void {
    this.reportForm = this.fb.group({
      cycleId: ['']
    });
  }

  private loadAppraisalCycles():void{
   this.PerformanceService.getAppraisalCycles().pipe(takeUntil(this.destroy$)).subscribe({
    next:(response)=>{
      console.log('Raw API cycles:', response);
      this.appraisalCycles=response.data || [];
    }
  ,error:(error)=>{
    this.notificaionService.showError('Failed to get Appraisal Cycles');
    console.error('Failed to get apprisalCycles',error);
  }
  
  })
  }

 private loadSummary(cycleId: string): void {
    this.isLoading = true;
    this.summary = null;
    this.PerformanceService.getPerformanceSummary(cycleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Summary API response:', response);
          this.summary = response.data;
          console.log('Summary:', this.summary);
          this.isLoading = false;
        },
        error: (error) => {
          this.notificaionService.showError('Failed to load summary');
          console.error('Failed to load summary', error);
          this.isLoading = false;
        }
      });
  }

  hasRatingDistribution(): boolean {
    if (!this.summary?.ratingDistribution) return false;
    return Object.keys(this.summary.ratingDistribution).length > 0;
  }

  getRatingDistributionKeys(): string[] {
    if (!this.summary?.ratingDistribution) return [];
    return Object.keys(this.summary.ratingDistribution).sort((a, b) => parseFloat(a) - parseFloat(b));
  }

  getRatingCount(rating: string): number {
    if (!this.summary?.ratingDistribution) return 0;
    // ratingDistribution is typed as { [rating: number]: number } but keys come as strings
    const count = (this.summary.ratingDistribution as any)[rating];
    return count || 0;
  }

  getRatingPercentage(rating: string): number {
    if (!this.summary?.ratingDistribution || !this.summary.totalAppraisals) return 0;
    const count = this.getRatingCount(rating);
    return (count / this.summary.totalAppraisals) * 100;
  }



  

}
