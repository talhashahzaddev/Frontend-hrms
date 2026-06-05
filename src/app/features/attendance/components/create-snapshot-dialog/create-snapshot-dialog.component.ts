import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MonthlyTimesheetCreateDto } from '../../../../core/models/attendance.models';

import { SharedCommonModule } from '@shared/shared-common.module';
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value;
  const end   = group.get('endDate')?.value;
  if (start && end && new Date(start) > new Date(end)) {
    return { invalidRange: true };
  }
  return null;
}


@Component({
  selector: 'app-create-snapshot-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <div class="create-snapshot-dialog">
      <h2 mat-dialog-title>
        <mat-icon class="dialog-icon">add_circle</mat-icon>
        Create Timesheet Period
      </h2>

      <mat-dialog-content>
        <form [formGroup]="snapshotForm" class="snapshot-form">

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Timesheet Name</mat-label>
            <input matInput formControlName="timesheetName"
                   placeholder="e.g., April 2026 Payroll Period" required>
            <mat-icon matSuffix>text_fields</mat-icon>
            <mat-hint>A descriptive name for this timesheet period</mat-hint>
            <mat-error *ngIf="snapshotForm.get('timesheetName')?.hasError('required')">
              Timesheet name is required
            </mat-error>
            <mat-error *ngIf="snapshotForm.get('timesheetName')?.hasError('minlength')">
              Name must be at least 3 characters
            </mat-error>
          </mat-form-field>

          <div class="form-row" formGroupName="dateRange">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Period Start Date</mat-label>
              <input matInput [matDatepicker]="startPicker" formControlName="startDate" required>
              <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
              <mat-error *ngIf="snapshotForm.get('dateRange.startDate')?.hasError('required')">
                Start date is required
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Period End Date</mat-label>
              <input matInput [matDatepicker]="endPicker" formControlName="endDate" required>
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
              <mat-error *ngIf="snapshotForm.get('dateRange.endDate')?.hasError('required')">
                End date is required
              </mat-error>
            </mat-form-field>
          </div>

          <div class="range-error" *ngIf="snapshotForm.get('dateRange')?.hasError('invalidRange') && snapshotForm.get('dateRange')?.touched">
            <mat-icon>error_outline</mat-icon>
            End date must be on or after start date
          </div>

          <div class="period-preview" *ngIf="periodDays > 0">
            <mat-icon>info</mat-icon>
            <span>Period spans <strong>{{ periodDays }} calendar days</strong> ({{ periodWorkDays }} estimated working days)</span>
          </div>

          <div class="info-box">
            <mat-icon>info</mat-icon>
            <p>Creates a snapshot of attendance records for the selected date range.
               Use the same start/end as your payroll period for seamless integration.
               After review, the timesheet can be finalized and locked for payroll.</p>
          </div>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary"
                (click)="onSubmit()"
                [disabled]="!snapshotForm.valid">
          <mat-icon>add</mat-icon>
          Create Timesheet Period
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .create-snapshot-dialog {
      min-width: 520px;
      h2 { display: flex; align-items: center; gap: 12px; color: #667eea; margin: 0;
        .dialog-icon { font-size: 28px; width: 28px; height: 28px; } }
      mat-dialog-content { padding: 20px 24px; min-height: 280px; }
      .snapshot-form { display: flex; flex-direction: column; gap: 16px; }
      .full-width { width: 100%; }
      .form-row { display: flex; gap: 16px; .half-width { flex: 1; } }
      .range-error { display: flex; align-items: center; gap: 8px; color: #f44336; font-size: 13px; margin-top: -8px;
        mat-icon { font-size: 16px; width: 16px; height: 16px; } }
      .period-preview { display: flex; align-items: center; gap: 8px; padding: 10px 14px;
        background: #f3e5f5; border-radius: 8px; border-left: 4px solid #9c27b0;
        font-size: 13px; color: #6a1b9a;
        mat-icon { color: #9c27b0; flex-shrink: 0; font-size: 18px; width: 18px; height: 18px; } }
      .info-box { display: flex; gap: 12px; padding: 12px; background: #e3f2fd;
        border-radius: 8px; border-left: 4px solid #2196f3;
        mat-icon { color: #2196f3; flex-shrink: 0; }
        p { margin: 0; font-size: 13px; color: #1976d2; line-height: 1.5; } }
      mat-dialog-actions { gap: 8px; padding: 16px 24px; margin: 0; border-top: 1px solid #e0e0e0; }
    }
    @media (max-width: 600px) {
      .create-snapshot-dialog { min-width: auto; width: 100%;
        .form-row { flex-direction: column; .half-width { width: 100%; } } }
    }
  `]
})
export class CreateSnapshotDialogComponent implements OnInit {
  snapshotForm: FormGroup;

  get periodDays(): number {
    const s = this.snapshotForm.get('dateRange.startDate')?.value;
    const e = this.snapshotForm.get('dateRange.endDate')?.value;
    if (!s || !e) return 0;
    const diff = Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86_400_000) + 1;
    return diff > 0 ? diff : 0;
  }

  get periodWorkDays(): number {
    const s = this.snapshotForm.get('dateRange.startDate')?.value;
    const e = this.snapshotForm.get('dateRange.endDate')?.value;
    if (!s || !e) return 0;
    let count = 0;
    const cur = new Date(s);
    const end = new Date(e);
    while (cur <= end) {
      const d = cur.getDay();
      if (d !== 0 && d !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateSnapshotDialogComponent>
  ) {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastOfMonth  = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthNames = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
    const suggestedName = `${monthNames[today.getMonth()]} ${today.getFullYear()} Timesheet`;

    this.snapshotForm = this.fb.group({
      timesheetName: [suggestedName, [Validators.required, Validators.minLength(3)]],
      dateRange: this.fb.group({
        startDate: [firstOfMonth, Validators.required],
        endDate:   [lastOfMonth,  Validators.required]
      }, { validators: dateRangeValidator })
    });
  }

  ngOnInit(): void {
    this.snapshotForm.get('dateRange')?.valueChanges.subscribe(() => this.autoUpdateName());
  }

  private autoUpdateName(): void {
    const start: Date | null = this.snapshotForm.get('dateRange.startDate')?.value;
    const end:   Date | null = this.snapshotForm.get('dateRange.endDate')?.value;
    if (!start || !end) return;

    const currentName: string = this.snapshotForm.get('timesheetName')?.value || '';
    const looksAutoGenerated = /Timesheet$|Period$|Payroll$/.test(currentName.trim());
    if (!looksAutoGenerated) return;

    const monthNames = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
    const sd = new Date(start);
    const ed = new Date(end);
    const sameMonth = sd.getMonth() === ed.getMonth() && sd.getFullYear() === ed.getFullYear();

    const name = sameMonth
      ? `${monthNames[sd.getMonth()]} ${sd.getFullYear()} Timesheet`
      : `${monthNames[sd.getMonth()]} ${sd.getFullYear()} – ${monthNames[ed.getMonth()]} ${ed.getFullYear()} Timesheet`;

    this.snapshotForm.patchValue({ timesheetName: name }, { emitEvent: false });
  }

  private toIso(date: Date | string): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.snapshotForm.invalid) return;
    const { timesheetName, dateRange } = this.snapshotForm.value;
    const dto: MonthlyTimesheetCreateDto = {
      timesheetName,
      startDate: this.toIso(dateRange.startDate),
      endDate:   this.toIso(dateRange.endDate)
    };
    this.dialogRef.close(dto);
  }
}
