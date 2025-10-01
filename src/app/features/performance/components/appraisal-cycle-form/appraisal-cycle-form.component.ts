import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PerformanceService } from '../../services/performance.service';

// Angular Material Modules
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
// 💡 IMPORTANT FIX: Import the main card module AND the specific standalone card components
import { MatCardModule, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card'; 

@Component({
  selector: 'app-appraisal-cycle-form',
  templateUrl: './appraisal-cycle-form.component.html',
  styleUrls: ['./appraisal-cycle-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    
    // MatCardModule provides <mat-card>
    MatCardModule, 
    // ✅ The necessary imports to resolve NG8001 errors:
    MatCardHeader,
    MatCardTitle,
    MatCardContent
  ]
})
export class AppraisalCycleFormComponent {
  cycleForm: FormGroup;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private performanceService: PerformanceService
  ) {
    this.cycleForm = this.fb.group({
      cycleName: ['', Validators.required],
      description: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.cycleForm.valid) {
      this.isSaving = true;
      this.performanceService.createAppraisalCycle(this.cycleForm.value)
        .subscribe({
          next: (res) => {
            console.log('Cycle created:', res);
            this.isSaving = false;
            this.cycleForm.reset(

              {
  cycleName: '',
  description: '',
  startDate: '',
  endDate: ''
}

            );
            this.cycleForm.markAsPristine();
this.cycleForm.markAsUntouched();
           
          },
          error: (err) => {
            console.error('Error creating cycle:', err);
            this.isSaving = false;
          }
        });
    }
  }

  onCancel() {
    this.cycleForm.reset();
  }
}