

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { PerformanceService } from '../../services/performance.service';

@Component({
  selector: 'app-appraisal-cycle-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './appraisal-cycle-form.component.html',
  styleUrls: ['./appraisal-cycle-form.component.scss']
})
export class AppraisalCycleFormComponent {
  cycleForm: FormGroup;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private performanceService: PerformanceService,
    private dialogRef: MatDialogRef<AppraisalCycleFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.cycleForm = this.fb.group({
      cycleName: ['', Validators.required],
      description: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.cycleForm.valid) {
      this.isSaving = true;
      this.performanceService.createAppraisalCycle(this.cycleForm.value).subscribe({
        next: () => {
          this.isSaving = false;
          this.dialogRef.close('saved');
        },
        error: (err) => {
          console.error('Error creating cycle:', err);
          this.isSaving = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
