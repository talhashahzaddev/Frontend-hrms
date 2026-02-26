import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { JobApplicationDto, StageMasterDto, ApplicationStageDto } from '@core/models/jobs.models';
import { JobsService } from '@features/jobs/services/jobs.service';
import { NotificationService } from '@core/services/notification.service';
import { EditApplicationStageDialogComponent } from '../edit-application-stage-dialog/edit-application-stage-dialog.component';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

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
    MatSelectModule,
    MatTableModule,
    MatMenuModule
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
  applicationStages: ApplicationStageDto[] = [];
  applicationStagesLoading = false;
  stagesDataSource = new MatTableDataSource<ApplicationStageDto>([]);
  displayedColumns: string[] = ['stageName', 'interviewers', 'type', 'notes', 'updatedOn', 'actions'];
  selectedStage: ApplicationStageDto | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ApplicationProcessDialogData,
    private dialogRef: MatDialogRef<ApplicationProcessDialogComponent>,
    private dialog: MatDialog,
    private jobsService: JobsService,
    private notification: NotificationService
  ) { }

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
    this.loadApplicationStages();
  }

  loadApplicationStages(): void {
    this.applicationStagesLoading = true;
    this.jobsService.getApplicationStagesByJobApplyId(this.data.jobApplyId).subscribe({
      next: (list) => {
        this.applicationStages = list ?? [];
        this.stagesDataSource.data = this.applicationStages;
        this.applicationStagesLoading = false;
      },
      error: () => {
        this.applicationStages = [];
        this.stagesDataSource.data = [];
        this.applicationStagesLoading = false;
      }
    });
  }

  getInterviewersDisplay(stage: ApplicationStageDto): string {
    const interviewers = stage.interviewers;
    if (!interviewers?.length) return '—';
    return interviewers.map((i) => i.employeeName || '—').join(', ');
  }

  formatUpdatedOn(updatedOn: string | null | undefined): string {
    if (!updatedOn) return '—';
    try {
      return new Date(updatedOn).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  }

  editStage(stage: ApplicationStageDto): void {
    const dialogRef = this.dialog.open(EditApplicationStageDialogComponent, {
      width: '480px',
      panelClass: 'edit-application-stage-dialog-panel',
      data: { mode: 'edit', jobApplyId: this.data.jobApplyId, stage: stage }
    });
    dialogRef.afterClosed().subscribe((updated) => {
      if (updated) {
        this.loadApplicationStages();
        this.jobsService.getJobApplicationById(this.data.jobApplyId).subscribe({
          next: (app) => {
            this.application = app;
          }
        });
      }
    });
  }

  deleteStage(stage: ApplicationStageDto): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Application Stage',
      message: 'Are you sure you want to delete this stage?',
      itemName: stage.stageName || 'this stage',
      confirmButtonText: 'Yes, Delete'
    };
    const confirmRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-action-dialog-panel'
    });
    confirmRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.jobsService.deleteApplicationStage(stage.applicationStageId).subscribe({
          next: () => {
            this.notification.showSuccess('Stage removed.');
            this.loadApplicationStages();
            this.jobsService.getJobApplicationById(this.data.jobApplyId).subscribe({
              next: (app) => {
                this.application = app;
              }
            });
          },
          error: (err) => {
            this.notification.showError(err?.message || 'Failed to delete stage');
          }
        });
      }
    });
  }

  openStageMenu(row: ApplicationStageDto): void {
    this.selectedStage = row;
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

    const stageMaster = this.stages.find(s => s.stageId === stageId);
    if (!stageMaster) return;

    const dialogRef = this.dialog.open(EditApplicationStageDialogComponent, {
      width: '480px',
      panelClass: 'edit-application-stage-dialog-panel',
      data: {
        mode: 'create',
        jobApplyId: this.data.jobApplyId,
        stageMaster: stageMaster
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.selectedStageId.setValue('');
        this.loadApplicationStages();
        this.jobsService.getJobApplicationById(this.data.jobApplyId).subscribe({
          next: (app) => {
            this.application = app;
          }
        });
      }
    });
  }

  close(): void {
    this.dialogRef.close(true);
  }
}
