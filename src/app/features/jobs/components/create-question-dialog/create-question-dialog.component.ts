import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SharedCommonModule } from '@shared/shared-common.module';
import { QuestionDto } from '@core/models/jobs.models';

export interface CreateQuestionDialogData {
  categoryId: string;
  question?: QuestionDto;
}

@Component({
  selector: 'app-create-question-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './create-question-dialog.component.html',
  styleUrls: ['./create-question-dialog.component.scss']
})
export class CreateQuestionDialogComponent {
  form: FormGroup;
  isSubmitting = false;
  isEditMode = false;
  questionTypes = ['Text', 'True/False', 'Multiple Choice'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateQuestionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateQuestionDialogData
  ) {
    this.isEditMode = !!data.question;
    
    // Parse options array back into comma-separated string if it's a JSON array
    let optionsStr = data.question?.options || '';
    if (optionsStr && optionsStr.startsWith('[')) {
      try {
        const arr = JSON.parse(optionsStr);
        if (Array.isArray(arr)) {
          optionsStr = arr.join(', ');
        }
      } catch (e) {}
    }

    this.form = this.fb.group({
      questionText: [data.question?.questionText || '', Validators.required],
      questionType: [data.question?.questionType || 'Text', Validators.required],
      options: [optionsStr],
      expectedAnswer: [data.question?.expectedAnswer || ''],
      isKnockout: [data.question?.isKnockout || false]
    });
  }

  get showOptionsField(): boolean {
    return this.form.get('questionType')?.value === 'Multiple Choice';
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    
    const payload = { ...this.form.value };
    if (payload.options && typeof payload.options === 'string') {
      const optionsArray = payload.options
        .split(',')
        .map((o: string) => o.trim())
        .filter((o: string) => o.length > 0);
        
      payload.options = optionsArray.length > 0 ? JSON.stringify(optionsArray) : null;
    } else {
      payload.options = null;
    }
    
    this.dialogRef.close(payload);
  }

  close(): void {
    this.dialogRef.close();
  }
}
