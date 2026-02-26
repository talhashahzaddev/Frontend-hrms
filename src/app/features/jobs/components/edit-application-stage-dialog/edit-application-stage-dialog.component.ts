import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApplicationStageDto, StageMasterDto, CreateApplicationStageRequest } from '@core/models/jobs.models';
import { JobsService } from '@features/jobs/services/jobs.service';
import { EmployeeService } from '@features/employee/services/employee.service';
import { NotificationService } from '@core/services/notification.service';
import { Employee } from '@core/models/employee.models';

export interface ApplicationStageDialogData {
  mode: 'create' | 'edit';
  jobApplyId: string;
  stage?: ApplicationStageDto; // For edit mode
  stageMaster?: StageMasterDto; // For create mode
}

@Component({
  selector: 'app-application-stage-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './edit-application-stage-dialog.component.html',
  styleUrls: ['./edit-application-stage-dialog.component.scss']
})
export class EditApplicationStageDialogComponent {
  form: FormGroup;
  employees: Employee[] = [];
  employeesLoading = false;
  saving = false;
  minInterviewDate: Date;
  minInterviewTime = '00:00';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ApplicationStageDialogData,
    private dialogRef: MatDialogRef<EditApplicationStageDialogComponent>,
    private fb: FormBuilder,
    private jobsService: JobsService,
    private employeeService: EmployeeService,
    private notification: NotificationService
  ) {
    const stage = data.stage;
    const isInterviewStage = data.mode === 'create' ? !!data.stageMaster?.isInterviewStage : !!data.stage?.isInterviewStage;
    const showExtraFields = isInterviewStage;

    const now = new Date();
    this.minInterviewDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let interviewDateVal: Date | null = null;
    let interviewTimeVal = '';
    let interviewPlaceVal = stage?.interviewPlace ?? '';
    if (stage?.interviewDate) {
      try {
        const d = new Date(stage.interviewDate);
        if (!isNaN(d.getTime())) {
          interviewDateVal = d;
          interviewTimeVal = this.formatTimeForInput(d);
        }
      } catch {
        // ignore
      }
    }

    this.form = this.fb.group({
      notes: [stage?.notes ?? ''],
      type: [stage?.type ?? ''],
      interviewerIds: [stage?.interviewers?.map((i) => i.employeeId) ?? []],
      interviewDate: [interviewDateVal],
      interviewTime: [interviewTimeVal],
      interviewPlace: [interviewPlaceVal]
    });

    if (!showExtraFields) {
      this.form.get('type')?.disable();
      this.form.get('interviewerIds')?.disable();
      this.form.get('interviewDate')?.disable();
      this.form.get('interviewTime')?.disable();
      this.form.get('interviewPlace')?.disable();
    } else {
      this.employeesLoading = true;
      this.employeeService.getEmployees({ page: 1, pageSize: 200 }).subscribe({
        next: (res) => {
          this.employees = res.employees ?? [];
          this.employeesLoading = false;
        },
        error: () => {
          this.employeesLoading = false;
        }
      });
      this.form.get('interviewDate')?.valueChanges?.subscribe(() => this.updateMinTime());
      this.updateMinTime();
    }
  }

  private formatTimeForInput(d: Date): string {
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private updateMinTime(): void {
    const dateVal = this.form.get('interviewDate')?.value;
    if (dateVal instanceof Date) {
      const today = new Date();
      const isToday =
        dateVal.getDate() === today.getDate() &&
        dateVal.getMonth() === today.getMonth() &&
        dateVal.getFullYear() === today.getFullYear();
      if (isToday) {
        const h = today.getHours();
        const m = today.getMinutes();
        this.minInterviewTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      } else {
        this.minInterviewTime = '00:00';
      }
    } else {
      this.minInterviewTime = '00:00';
    }
  }

  get showExtraFields(): boolean {
    return this.data.mode === 'create' ? !!this.data.stageMaster?.isInterviewStage : !!this.data.stage?.isInterviewStage;
  }

  get stageName(): string {
    return this.data.mode === 'create' ? (this.data.stageMaster?.stageName || '') : (this.data.stage?.stageName || '');
  }



  getEmployeeDisplay(emp: Employee): string {
    if (emp.fullName) return emp.fullName;
    return [emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.employeeCode || emp.employeeId;
  }

  save(): void {
    if (this.form.invalid || this.saving) return;
    const v = this.form.getRawValue();
    let interviewDateIso: string | undefined;
    if (this.showExtraFields && v.interviewDate instanceof Date && v.interviewTime) {
      const [hours, minutes] = (v.interviewTime as string).split(':').map(Number);
      const combined = new Date(v.interviewDate);
      combined.setHours(hours ?? 0, minutes ?? 0, 0, 0);
      if (combined.getTime() <= Date.now()) {
        this.notification.showError('Interview date and time must be in the future.');
        return;
      }
      interviewDateIso = combined.toISOString();
    }
    this.saving = true;
    if (this.data.mode === 'create') {
      const payload: CreateApplicationStageRequest = {
        jobApplyId: this.data.jobApplyId,
        stageId: this.data.stageMaster!.stageId,
        notes: v.notes?.trim() || undefined,
        type: this.showExtraFields ? (v.type?.trim() || undefined) : undefined,
        interviewerIds: this.showExtraFields && Array.isArray(v.interviewerIds) ? v.interviewerIds : undefined,
        interviewDate: interviewDateIso,
        interviewPlace: this.showExtraFields && v.interviewPlace?.trim() ? v.interviewPlace.trim() : undefined
      };
      this.jobsService.createApplicationStage(payload).subscribe({
        next: () => {
          this.notification.showSuccess('Stage added successfully.');
          this.dialogRef.close(true);
          this.saving = false;
        },
        error: (err) => {
          this.notification.showError(err?.message || 'Failed to add stage');
          this.saving = false;
        }
      });
    } else {
      const payload = {
        notes: v.notes?.trim() || undefined,
        type: this.showExtraFields ? (v.type?.trim() || undefined) : undefined,
        interviewerIds: this.showExtraFields && Array.isArray(v.interviewerIds) ? v.interviewerIds : undefined,
        interviewDate: interviewDateIso,
        interviewPlace: this.showExtraFields && v.interviewPlace?.trim() ? v.interviewPlace.trim() : undefined
      };
      this.jobsService.updateApplicationStage(this.data.stage!.applicationStageId, payload).subscribe({
        next: () => {
          this.notification.showSuccess('Stage updated successfully.');
          this.dialogRef.close(true);
          this.saving = false;
        },
        error: (err) => {
          this.notification.showError(err?.message || 'Failed to update stage');
          this.saving = false;
        }
      });
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
