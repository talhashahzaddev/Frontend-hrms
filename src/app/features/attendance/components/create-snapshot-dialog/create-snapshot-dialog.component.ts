import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-create-snapshot-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule
  ],
  template: `
    <div class="create-snapshot-dialog">
      <h2 mat-dialog-title>
        <mat-icon class="dialog-icon">add_circle</mat-icon>
        Create Monthly Timesheet Snapshot
      </h2>
      
      <mat-dialog-content>
        <form [formGroup]="snapshotForm" class="snapshot-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Timesheet Name</mat-label>
            <input 
              matInput 
              formControlName="timesheetName"
              placeholder="e.g., January 2026 Production"
              required>
            <mat-icon matSuffix>text_fields</mat-icon>
            <mat-hint>Enter a descriptive name for this timesheet</mat-hint>
            <mat-error *ngIf="snapshotForm.get('timesheetName')?.hasError('required')">
              Timesheet name is required
            </mat-error>
            <mat-error *ngIf="snapshotForm.get('timesheetName')?.hasError('minlength')">
              Name must be at least 3 characters
            </mat-error>
          </mat-form-field>

          <div class="form-row">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Month</mat-label>
              <mat-select formControlName="month" required>
                <mat-option *ngFor="let month of months" [value]="month.value">
                  {{ month.label }}
                </mat-option>
              </mat-select>
              <mat-icon matSuffix>calendar_today</mat-icon>
              <mat-error *ngIf="snapshotForm.get('month')?.hasError('required')">
                Month is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Year</mat-label>
              <mat-select formControlName="year" required>
                <mat-option *ngFor="let year of years" [value]="year">
                  {{ year }}
                </mat-option>
              </mat-select>
              <mat-icon matSuffix>event</mat-icon>
              <mat-error *ngIf="snapshotForm.get('year')?.hasError('required')">
                Year is required
              </mat-error>
            </mat-form-field>
          </div>

          <div class="info-box">
            <mat-icon>info</mat-icon>
            <p>This will create a snapshot of attendance records for the selected month and year. 
               The snapshot can be reviewed, edited, and finalized for payroll processing.</p>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="onCancel()">
          Cancel
        </button>
        <button 
          mat-raised-button 
          color="primary" 
          (click)="onSubmit()"
          [disabled]="!snapshotForm.valid">
          <mat-icon>add</mat-icon>
          Create Snapshot
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .create-snapshot-dialog {
      min-width: 500px;

      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #667eea;
        margin: 0;

        .dialog-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }
      }

      mat-dialog-content {
        padding: 20px 24px;
        min-height: 300px;
      }

      .snapshot-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .full-width {
        width: 100%;
      }

      .form-row {
        display: flex;
        gap: 16px;

        .half-width {
          flex: 1;
        }
      }

      .info-box {
        display: flex;
        gap: 12px;
        padding: 12px;
        background: #e3f2fd;
        border-radius: 8px;
        border-left: 4px solid #2196f3;

        mat-icon {
          color: #2196f3;
          flex-shrink: 0;
        }

        p {
          margin: 0;
          font-size: 13px;
          color: #1976d2;
          line-height: 1.5;
        }
      }

      mat-dialog-actions {
        gap: 8px;
        padding: 16px 24px;
        margin: 0;
        border-top: 1px solid #e0e0e0;
      }
    }

    @media (max-width: 600px) {
      .create-snapshot-dialog {
        min-width: auto;
        width: 100%;

        .form-row {
          flex-direction: column;

          .half-width {
            width: 100%;
          }
        }
      }
    }
  `]
})
export class CreateSnapshotDialogComponent implements OnInit {
  snapshotForm: FormGroup;
  
  months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  years: number[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateSnapshotDialogComponent>
  ) {
    // Generate years (current year + 1 year back and 1 year forward)
    const currentYear = new Date().getFullYear();
    this.years = [currentYear - 1, currentYear, currentYear + 1];

    // Initialize form with current month and year
    const currentMonth = new Date().getMonth() + 1;
    const suggestedName = `${this.months.find(m => m.value === currentMonth)?.label} ${currentYear} Timesheet`;

    this.snapshotForm = this.fb.group({
      timesheetName: [suggestedName, [Validators.required, Validators.minLength(3)]],
      month: [currentMonth, Validators.required],
      year: [currentYear, Validators.required]
    });
  }

  ngOnInit(): void {
    // Update suggested name when month or year changes
    this.snapshotForm.get('month')?.valueChanges.subscribe(() => this.updateSuggestedName());
    this.snapshotForm.get('year')?.valueChanges.subscribe(() => this.updateSuggestedName());
  }

  updateSuggestedName(): void {
    const month = this.snapshotForm.get('month')?.value;
    const year = this.snapshotForm.get('year')?.value;
    const monthLabel = this.months.find(m => m.value === month)?.label;
    
    if (monthLabel && year) {
      const currentName = this.snapshotForm.get('timesheetName')?.value;
      // Only update if the user hasn't customized the name
      const isDefaultName = currentName.includes('Timesheet') || currentName.includes('Production');
      
      if (isDefaultName) {
        this.snapshotForm.patchValue({
          timesheetName: `${monthLabel} ${year} Timesheet`
        }, { emitEvent: false });
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.snapshotForm.valid) {
      this.dialogRef.close(this.snapshotForm.value);
    }
  }
}
