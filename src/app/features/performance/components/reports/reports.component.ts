import { AppraisalCycle } from '@/app/core/models/performance.models';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PerformanceService } from '../../services/performance.service';
import { AuthService } from '@/app/core/services/auth.service';
import { NotificationService } from '@/app/core/services/notification.service';
// import { error } from 'console';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { ReactiveFormsModule } from '@angular/forms';
import { PerformanceSummary } from '@/app/core/models/performance.models';


@Component({
  selector: 'app-reports',
  imports: [
    CommonModule,
      MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
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
    this.PerformanceService.getPerformanceSummary(cycleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Summary API response:', response);
          this.summary = response.data;
          console.log('Summary:', this.summary);
        },
        error: (error) => {
          this.notificaionService.showError('Failed to load summary');
          console.error('Failed to load summary', error);
        }
      });
  }
 

}
