import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, startWith } from 'rxjs';

import { JobsService } from '../../services/jobs.service';
import { NotificationService } from '@core/services/notification.service';
import { StageMasterDto } from '@core/models/jobs.models';
import { StageFormDialogComponent } from '../stage-form-dialog/stage-form-dialog.component';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-stage-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './stage-list.component.html',
  styleUrls: ['./stage-list.component.scss']
})
export class StageListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  dataSource = new MatTableDataSource<StageMasterDto>([]);
  displayedColumns: string[] = ['stageName', 'stageOrder', 'createdAt', 'actions'];
  isLoading = false;
  searchControl = new FormControl('');

  constructor(
    private jobsService: JobsService,
    private notification: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadStages();
    this.searchControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadStages());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStages(): void {
    this.isLoading = true;
    this.jobsService.getStages().subscribe({
      next: (list) => {
        let data = list ?? [];
        const search = this.searchControl.value?.trim().toLowerCase();
        if (search) {
          data = data.filter((s) => s.stageName?.toLowerCase().includes(search));
        }
        this.dataSource.data = data;
        this.isLoading = false;
      },
      error: () => {
        this.dataSource.data = [];
        this.isLoading = false;
      }
    });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '—';
    }
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(StageFormDialogComponent, {
      width: '420px',
      panelClass: 'stage-form-dialog-panel',
      data: { mode: 'create' }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) this.loadStages();
    });
  }

  editStage(stage: StageMasterDto): void {
    const dialogRef = this.dialog.open(StageFormDialogComponent, {
      width: '420px',
      panelClass: 'stage-form-dialog-panel',
      data: { mode: 'edit', stage }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) this.loadStages();
    });
  }

  deleteStage(stage: StageMasterDto): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Stage',
      message: 'Are you sure you want to delete this stage?',
      itemName: stage.stageName,
      confirmButtonText: 'Yes, Delete'
    };
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.jobsService.deleteStage(stage.stageId).subscribe({
          next: () => {
            this.notification.showSuccess('Stage deleted successfully');
            this.loadStages();
          },
          error: (err) => {
            this.notification.showError(err?.message || 'Failed to delete stage');
          }
        });
      }
    });
  }

  hasFiltersApplied(): boolean {
    return !!this.searchControl.value?.trim();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.loadStages();
  }
}
