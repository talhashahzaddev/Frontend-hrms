import { Component, Inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TimesheetService } from '../../services/timesheet.service';
import { TimesheetDay, TimesheetProject, TimesheetTask, TimeAllocation, TimeAllocationEntry } from '../../models/timesheet.models';
import { DropdownModule } from 'primeng/dropdown';
import { SelectItem } from 'primeng/api';

interface DayAllocation {
  date: string;
  status: string;
  totalHours: number;
  attendanceId?: string;
  entries: AllocationRow[];
}

interface AllocationRow {
  projectId: string;
  taskId: string;
  hours: number;
  isBillable: boolean;
  description: string;
}

@Component({
  selector: 'app-time-allocation-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, DropdownModule],
  template: `
    <!-- Dialog Header matching shift module pattern -->
    <div class="ts-dialog-header">
      <div class="ts-dialog-header-left">
        <div class="ts-dialog-header-icon">
          <i class="pi pi-clock"></i>
        </div>
        <h2 class="ts-dialog-title">Time Allocation — {{ data.employeeName }}</h2>
      </div>
      <button class="ts-dialog-close" (click)="dialogRef.close()">
        <i class="pi pi-times"></i>
      </button>
    </div>

    <div class="ts-dialog-body">
      @if (loading()) {
        <div style="display: flex; justify-content: center; padding: 40px;">
          <p style="color: #6b7280;">Loading allocations...</p>
        </div>
      } @else {
        <!-- Summary -->
        <div class="ts-summary-bar">
          <div class="ts-summary-item">
            <span class="ts-summary-label">Total Hours Worked</span>
            <span class="ts-summary-value">{{ totalWorkedHours() }}h</span>
          </div>
          <div class="ts-summary-item">
            <span class="ts-summary-label">Total Allocated</span>
            <span class="ts-summary-value" [ngClass]="allocationStatusClass()">{{ totalAllocatedHours() }}h</span>
          </div>
          <div class="ts-summary-item">
            <span class="ts-summary-label">Remaining</span>
            <span class="ts-summary-value" [ngClass]="remainingHours() < 0 ? 'over' : remainingHours() === 0 ? 'balanced' : 'under'">
              {{ remainingHours() }}h
            </span>
          </div>
        </div>

        <!-- Day Allocations -->
        <div class="ts-days-list">
          @for (day of dayAllocations; track day.date) {
            <div class="ts-day-card">
              <div class="ts-day-header">
                <div class="ts-day-info">
                  <span class="ts-day-date">{{ day.date | date:'EEE, MMM d' }}</span>
                  <span class="ts-badge" [ngClass]="'ts-' + day.status.replace('_', '-')">{{ day.status | titlecase }}</span>
                </div>
                <div class="ts-day-hours-info">
                  <span style="color: #6b7280; font-size: 13px;">{{ day.totalHours }}h worked</span>
                  <span class="ts-day-allocated" [ngClass]="getDayAllocationClass(day)">
                    {{ getDayAllocatedHours(day) }}h allocated
                  </span>
                </div>
              </div>

              @if (day.status === 'weekend' || day.status === 'holiday' || day.status === 'no_record' || day.totalHours === 0) {
                <div class="ts-day-skip">No hours to allocate</div>
              } @else {
                <div class="ts-allocation-rows">
                  @for (row of day.entries; track $index) {
                    <div class="ts-alloc-row">
                      <p-dropdown [options]="getProjectOptions()" [(ngModel)]="row.projectId"
                        placeholder="Select project" optionLabel="label" optionValue="value"
                        (onChange)="onProjectChange(row)" [style]="{'min-width': '150px'}"></p-dropdown>

                      <p-dropdown [options]="getTasksForProject(row.projectId)" [(ngModel)]="row.taskId"
                        placeholder="Select task" optionLabel="label" optionValue="value"
                        [disabled]="!row.projectId" [style]="{'min-width': '140px'}"></p-dropdown>

                      <input type="number" [(ngModel)]="row.hours" min="0" [max]="day.totalHours" step="0.25"
                             class="ts-alloc-hours" placeholder="0" (ngModelChange)="validateHours(day, row)" />

                      <label class="ts-billable-toggle">
                        <input type="checkbox" [(ngModel)]="row.isBillable" />
                        <span style="color: #374151; font-size: 12px;">Billable</span>
                      </label>

                      <input type="text" [(ngModel)]="row.description" class="ts-alloc-desc" placeholder="Notes (optional)" />

                      <button class="ts-icon-btn ts-remove-btn" (click)="removeRow(day, $index)" title="Remove"><i class="pi pi-times"></i></button>
                    </div>
                  }
                </div>

                <button class="ts-btn-add-row" (click)="addRow(day)"><i class="pi pi-plus"></i> Add Row</button>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- Dialog Footer — mat-stroked / mat-flat matching correction dialog -->
    <div class="dialog-footer">
      <button mat-stroked-button type="button" mat-dialog-close class="btn-cancel">Cancel</button>
      <button mat-flat-button class="btn-save" [disabled]="saving() || loading()" (click)="save()">
        {{ saving() ? 'Saving...' : 'Save Allocations' }}
      </button>
    </div>
  `,
  styleUrls: ['./time-allocation-dialog.component.scss']
})
export class TimeAllocationDialog implements OnInit {
  dayAllocations: DayAllocation[] = [];
  projects = signal<TimesheetProject[]>([]);
  taskCache = new Map<string, SelectItem[]>();
  loading = signal(true);
  saving = signal(false);

  constructor(
    public dialogRef: MatDialogRef<TimeAllocationDialog>,
    @Inject(MAT_DIALOG_DATA) public data: {
      timesheetId: string;
      employeeId: string;
      employeeName: string;
      days: TimesheetDay[];
    },
    private api: TimesheetService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.loading.set(true);

    // Build day allocations from the days passed in
    this.dayAllocations = this.data.days
      .filter(d => d.status !== 'weekend' && d.status !== 'holiday')
      .map(d => ({
        date: d.date,
        status: d.status,
        totalHours: d.totalHours,
        attendanceId: d.attendanceId,
        entries: []
      }));

    // Load projects and existing allocations in parallel
    this.api.getProjects().subscribe({
      next: projects => {
        this.projects.set(projects.filter(p => p.isActive));

        this.api.getTimeAllocations(this.data.timesheetId, this.data.employeeId).subscribe({
          next: allocations => {
            this.populateExistingAllocations(allocations);
            this.loading.set(false);
          },
          error: () => { this.loading.set(false); }
        });
      },
      error: () => { this.loading.set(false); }
    });
  }

  private populateExistingAllocations(allocations: TimeAllocation[]) {
    for (const alloc of allocations) {
      const day = this.dayAllocations.find(d => d.date === alloc.workDate);
      if (day) {
        day.entries.push({
          projectId: alloc.projectId,
          taskId: alloc.taskId,
          hours: alloc.hours,
          isBillable: alloc.isBillable,
          description: alloc.description || ''
        });
      }
    }

    // Load tasks for each used project
    const usedProjectIds = new Set(allocations.map(a => a.projectId));
    for (const pid of usedProjectIds) {
      this.loadTasksForProject(pid);
    }
  }

  getProjectOptions(): SelectItem[] {
    return this.projects().map(p => ({
      label: p.projectName + (p.projectCode ? ' (' + p.projectCode + ')' : ''),
      value: p.projectId
    }));
  }

  getTasksForProject(projectId: string): SelectItem[] {
    return this.taskCache.get(projectId) || [];
  }

  onProjectChange(row: AllocationRow) {
    row.taskId = '';
    if (row.projectId) {
      this.loadTasksForProject(row.projectId);
    }
  }

  private loadTasksForProject(projectId: string) {
    if (this.taskCache.has(projectId)) return;
    this.api.getProjectTasks(projectId).subscribe({
      next: tasks => {
        this.taskCache.set(projectId, tasks.filter(t => t.isActive).map(t => ({
          label: t.taskName,
          value: t.taskId
        })));
      },
      error: () => { this.taskCache.set(projectId, []); }
    });
  }

  addRow(day: DayAllocation) {
    day.entries.push({ projectId: '', taskId: '', hours: 0, isBillable: true, description: '' });
  }

  removeRow(day: DayAllocation, index: number) {
    day.entries.splice(index, 1);
  }

  validateHours(day: DayAllocation, row: AllocationRow) {
    if (row.hours < 0) row.hours = 0;
    const allocated = this.getDayAllocatedHours(day);
    if (allocated > day.totalHours) {
      row.hours = Math.max(0, row.hours - (allocated - day.totalHours));
    }
  }

  getDayAllocatedHours(day: DayAllocation): number {
    return day.entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  }

  getDayAllocationClass(day: DayAllocation): string {
    const allocated = this.getDayAllocatedHours(day);
    if (allocated === day.totalHours && day.totalHours > 0) return 'balanced';
    if (allocated > day.totalHours) return 'over';
    if (allocated > 0) return 'under';
    return 'none';
  }

  totalWorkedHours(): number {
    return this.dayAllocations.reduce((sum, d) => sum + d.totalHours, 0);
  }

  totalAllocatedHours(): number {
    return this.dayAllocations.reduce((sum, d) => sum + this.getDayAllocatedHours(d), 0);
  }

  remainingHours(): number {
    return Math.round((this.totalWorkedHours() - this.totalAllocatedHours()) * 100) / 100;
  }

  allocationStatusClass(): string {
    const rem = this.remainingHours();
    if (rem === 0) return 'balanced';
    if (rem < 0) return 'over';
    return 'under';
  }

  save() {
    const remaining = this.remainingHours();
    if (remaining < 0) {
      return;
    }

    this.saving.set(true);
    const entries: TimeAllocationEntry[] = [];

    for (const day of this.dayAllocations) {
      for (const row of day.entries) {
        if (row.hours > 0 && row.projectId && row.taskId) {
          entries.push({
            attendanceId: day.attendanceId,
            employeeId: this.data.employeeId,
            workDate: day.date,
            projectId: row.projectId,
            taskId: row.taskId,
            hours: row.hours,
            isBillable: row.isBillable,
            description: row.description || undefined
          });
        }
      }
    }

    this.api.saveTimeAllocations(this.data.timesheetId, {
      timesheetId: this.data.timesheetId,
      entries
    }).subscribe({
      next: () => {
        this.dialogRef.close({ saved: true });
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
      }
    });
  }
}
