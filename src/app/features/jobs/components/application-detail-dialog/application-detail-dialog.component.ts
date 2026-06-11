import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { JobApplicationDto, ParsedResumeDto } from '@core/models/jobs.models';
import { JobsService } from '@features/jobs/services/jobs.service';
import { QuestionBankService } from '../../services/question-bank.service';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface ApplicationDetailDialogData {
  jobApplyId: string;
}

@Component({
  selector: 'app-application-detail-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './application-detail-dialog.component.html',
  styleUrls: ['./application-detail-dialog.component.scss']
})
export class ApplicationDetailDialogComponent implements OnInit {
  application: JobApplicationDto | null = null;
  parsedResume: ParsedResumeDto | null = null;
  isLoading = true;
  error: string | null = null;
  activeTab: 'coverLetter' | 'resumeInfo' = 'resumeInfo';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ApplicationDetailDialogData,
    private dialogRef: MatDialogRef<ApplicationDetailDialogComponent>,
    private jobsService: JobsService,
    private qbService: QuestionBankService
  ) {}

  ngOnInit(): void {
    this.jobsService.getJobApplicationById(this.data.jobApplyId).subscribe({
      next: (app) => {
        this.application = app;
        
        // Fetch parsed resume
        this.qbService.getParsedResume(this.data.jobApplyId).subscribe({
            next: (parsed) => {
                this.parsedResume = parsed;
                if (!this.parsedResume && this.application?.coverLetter) {
                    this.activeTab = 'coverLetter';
                }
                this.isLoading = false;
            },
            error: () => {
                // Not a hard error, parsed resume might just not exist or failed to parse
                if (this.application?.coverLetter) {
                    this.activeTab = 'coverLetter';
                }
                this.isLoading = false;
            }
        });
      },
      error: () => {
        this.error = 'Failed to load application details';
        this.isLoading = false;
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

  close(): void {
    this.dialogRef.close();
  }
}
