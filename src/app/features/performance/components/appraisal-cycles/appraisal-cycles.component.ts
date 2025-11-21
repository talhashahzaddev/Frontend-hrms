import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';

import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AppraisalCycle, AppraisalCycleStatus, CreateAppraisalCycleRequest, UpdateAppraisalCycleRequest } from '../../../../core/models/performance.models';
import { AppraisalCycleFormComponent } from '../appraisal-cycle-form/appraisal-cycle-form.component';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-appraisal-cycles',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  templateUrl: './appraisal-cycles.component.html',
  styleUrls: ['./appraisal-cycles.component.scss']
})
export class AppraisalCyclesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isLoading = false;
  appraisalCycles: AppraisalCycle[] = [];
  displayedColumns: string[] = ['cycleName', 'dates', 'status', 'appraisals', 'actions'];
  filterForm: FormGroup;
  
  // Pagination
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;

  constructor(
    private performanceService: PerformanceService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      status: ['']
    });
  }

  ngOnInit(): void {
    this.loadAppraisalCycles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAppraisalCycles(): void {
    this.isLoading = true;
    this.performanceService.getAppraisalCycles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.appraisalCycles = response.data;
            this.totalItems = response.data.length;
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading appraisal cycles:', error);
          this.notificationService.showError('Failed to load appraisal cycles');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(AppraisalCycleFormComponent, {
      width: '600px',
      disableClose: true,
      data: {}
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'saved') {
        this.loadAppraisalCycles();
        this.notificationService.showSuccess('Appraisal cycle created successfully');
      }
    });
  }

  openEditDialog(cycle: AppraisalCycle): void {
    const dialogRef = this.dialog.open(AppraisalCycleFormComponent, {
      width: '600px',
      disableClose: true,
      data: { cycle: cycle }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'saved') {
        this.loadAppraisalCycles();
        this.notificationService.showSuccess('Appraisal cycle updated successfully');
      }
    });
  }

  deleteCycle(cycle: AppraisalCycle): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Appraisal Cycle',
      message: 'Are you sure you want to delete this appraisal cycle?',
      itemName: cycle.cycleName
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result === true) {
          this.isLoading = true;
          this.performanceService.deleteAppraisalCycle(cycle.cycleId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                if (response.success) {
                  this.notificationService.showSuccess('Appraisal cycle deleted successfully');
                  this.loadAppraisalCycles();
                } else {
                  this.notificationService.showError(response.message || 'Failed to delete appraisal cycle');
                }
                this.isLoading = false;
                this.cdr.markForCheck();
              },
              error: (error) => {
                console.error('Error deleting cycle:', error);
                this.notificationService.showError(error.error?.message || 'Failed to delete appraisal cycle');
                this.isLoading = false;
                this.cdr.markForCheck();
              }
            });
        }
      });
  }

  applyFilters(): void {
    this.loadAppraisalCycles();
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.loadAppraisalCycles();
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (status?.toLowerCase()) {
      case 'active': return 'primary';
      case 'completed': return 'accent';
      case 'cancelled': return 'warn';
      default: return undefined;
    }
  }

  hasHRRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadAppraisalCycles();
  }
}

