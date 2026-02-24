import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JobApplicationDto, StageMasterDto } from '@core/models/jobs.models';
import { JobsService } from '@features/jobs/services/jobs.service';
import { NotificationService } from '@core/services/notification.service';

export interface ApplicationProcessDialogData {
  jobApplyId: string;
}

@Component({
  selector: 'app-application-process-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './application-process-dialog.component.html',
  styleUrls: ['./application-process-dialog.component.scss']
})
export class ApplicationProcessDialogComponent implements OnInit {
  application: JobApplicationDto | null = null;
  isLoading = true;
  error: string | null = null;
  stages: StageMasterDto[] = [];
  stagesLoading = true;
  selectedStageId = new FormControl<string>('', { nonNullable: false });
  addingStage = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ApplicationProcessDialogData,
    private dialogRef: MatDialogRef<ApplicationProcessDialogComponent>,
    private jobsService: JobsService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.jobsService.getJobApplicationById(this.data.jobApplyId).subscribe({
      next: (app) => {
        this.application = app;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load application details';
        this.isLoading = false;
      }
    });
    this.jobsService.getStages().subscribe({
      next: (list) => {
        this.stages = list ?? [];
        this.stagesLoading = false;
      },
      error: () => {
        this.stagesLoading = false;
      }
    });
  }

  getAppliedDate(app: JobApplicationDto): string {
    const d = app.createdDate;
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return '—';
    }
  }

  addStage(): void {
    const stageId = this.selectedStageId.value;
    if (!stageId?.trim()) {
      this.notification.showError('Please select a stage');
      return;
    }
    this.addingStage = true;
    this.jobsService
      .createApplicationStage({
        jobApplyId: this.data.jobApplyId,
        stageId: stageId.trim()
      })
      .subscribe({
        next: () => {
          this.notification.showSuccess('Stage added successfully. Application status updated.');
          this.addingStage = false;
          this.selectedStageId.setValue('');
          // Reload application to show updated current stage
          this.jobsService.getJobApplicationById(this.data.jobApplyId).subscribe({
            next: (app) => {
              this.application = app;
            }
          });
        },
        error: (err) => {
          this.notification.showError(err?.message || 'Failed to add stage');
          this.addingStage = false;
        }
      });
  }

  close(): void {
    this.dialogRef.close(true);
  }
}
