import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetService } from '../../services/timesheet.service';
import { TimesheetProject, TimesheetTask } from '../../models/timesheet.models';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-timesheet-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule, InputSwitchModule, ProgressSpinnerModule, TagModule, PageHeaderComponent, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <div class="ts-page-layout">
      <app-page-header title="Projects & Tasks">
        <div actions>
          <p-button label="New Project" icon="pi pi-plus" (click)="openProjectDialog(null)"></p-button>
        </div>
      </app-page-header>

      <!-- Search Bar -->
      <div class="ts-search-bar">
        <div class="ts-search-wrapper">
          <i class="pi pi-search ts-search-icon"></i>
          <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="onSearchChange($event)" placeholder="Search by name, code, or client..." class="ts-search-input" />
          @if (searchTerm) {
            <button class="ts-clear-btn" (click)="searchTerm = ''; applyFilter()"><i class="pi pi-times"></i></button>
          }
        </div>
      </div>

      @if (loading) {
        <div class="ts-loading"><p-progressSpinner></p-progressSpinner></div>
      } @else if (filteredProjects().length === 0) {
        <app-empty-state icon="pi-folder" title="No projects found" [message]="searchTerm ? 'Try a different search term.' : 'Create your first project to get started.'">
          @if (searchTerm) {
            <p-button label="Clear Search" [text]="true" (click)="searchTerm = ''; applyFilter()"></p-button>
          } @else {
            <p-button label="New Project" icon="pi pi-plus" (click)="openProjectDialog(null)"></p-button>
          }
        </app-empty-state>
      } @else {
        <div class="ts-project-cards">
          @for (p of filteredProjects(); track p.projectId) {
            <div class="ts-card ts-project-card" [class.ts-expanded]="expandedProjectId() === p.projectId">
              <div class="ts-project-header" (click)="toggleProject(p)">
                <div class="ts-project-header-left">
                  <i [class]="'pi ' + (expandedProjectId() === p.projectId ? 'pi-chevron-down' : 'pi-chevron-right') + ' ts-expand-icon'"></i>
                  <div>
                    <span class="ts-project-name">{{ p.projectName }}</span>
                    @if (p.projectCode) { <span class="ts-project-code">{{ p.projectCode }}</span> }
                  </div>
                </div>
                <div class="ts-project-header-right">
                  <app-status-badge [status]="p.isActive ? 'active' : 'inactive'"></app-status-badge>
                  <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" size="small" title="Edit Project" (click)="openProjectDialog(p); $event.stopPropagation()"></p-button>
                  <p-button icon="pi pi-trash" [rounded]="true" [text]="true" size="small" styleClass="p-button-danger" title="Delete Project" (click)="confirmDeleteProject(p); $event.stopPropagation()"></p-button>
                </div>
              </div>
              <div class="ts-project-meta">
                @if (p.clientName) { <span class="ts-meta-item"><i class="pi pi-user"></i> {{ p.clientName }}</span> }
                @if (p.costCenterCode) { <span class="ts-meta-item"><i class="pi pi-building"></i> CC: {{ p.costCenterCode }}</span> }
                @if (p.glAccountCode) { <span class="ts-meta-item"><i class="pi pi-chart-bar"></i> GL: {{ p.glAccountCode }}</span> }
                @if (p.startDate) { <span class="ts-meta-item"><i class="pi pi-calendar"></i> {{ p.startDate | date:'MMM d, y' }} — {{ p.endDate ? (p.endDate | date:'MMM d, y') : 'Ongoing' }}</span> }
              </div>

              @if (expandedProjectId() === p.projectId) {
                <div class="ts-tasks-section">
                  <div class="ts-tasks-header">
                    <h4 class="ts-label">Tasks</h4>
                    <p-button label="Add Task" icon="pi pi-plus" size="small" [text]="true" styleClass="p-button-info" (click)="openTaskDialog(p.projectId, null)"></p-button>
                  </div>
                  @if (loadingTasks) {
                    <div class="ts-loading" style="padding: var(--ts-space-4);"><p-progressSpinner [style]="{'width': '24px', 'height': '24px'}"></p-progressSpinner></div>
                  } @else if (tasks().length === 0) {
                    <p class="ts-muted" style="text-align: center; padding: var(--ts-space-5);">No tasks yet. Add one to get started.</p>
                  } @else {
                    <div class="ts-tasks-list">
                      @for (t of tasks(); track t.taskId) {
                        <div class="ts-task-row">
                          <span class="ts-task-name">{{ t.taskName }}</span>
                          <p-tag [value]="t.isBillableDefault ? 'Billable' : 'Non-billable'" [severity]="t.isBillableDefault ? 'success' : 'warning'"></p-tag>
                          @if (t.hourlyRate) { <span class="ts-task-rate">{{ t.hourlyRate | currency }}/hr</span> }
                          <div class="ts-task-actions">
                            <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" size="small" title="Edit Task" (click)="openTaskDialog(p.projectId, t)"></p-button>
                            <p-button icon="pi pi-trash" [rounded]="true" [text]="true" size="small" styleClass="p-button-danger" title="Delete Task" (click)="confirmDeleteTask(p.projectId, t)"></p-button>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- Project Dialog -->
    <p-dialog [header]="editingProject ? 'Edit Project' : 'New Project'" [(visible)]="showProjectDialog" [modal]="true" [style]="{width: '520px', 'border-radius': '10px'}">
      <div class="ts-form-group">
        <label class="ts-label">Project Name *</label>
        <input pInputText [(ngModel)]="projectForm.projectName" placeholder="e.g. Website Redesign" style="width: 100%" />
      </div>
      <div class="ts-form-row">
        <div class="ts-form-group ts-half">
          <label class="ts-label">Project Code</label>
          <input pInputText [(ngModel)]="projectForm.projectCode" placeholder="e.g. WEB-001" style="width: 100%" />
        </div>
        <div class="ts-form-group ts-half">
          <label class="ts-label">Client Name</label>
          <input pInputText [(ngModel)]="projectForm.clientName" placeholder="e.g. Acme Corp" style="width: 100%" />
        </div>
      </div>
      <div class="ts-form-row">
        <div class="ts-form-group ts-half">
          <label class="ts-label">Cost Center</label>
          <input pInputText [(ngModel)]="projectForm.costCenterCode" placeholder="e.g. CC-100" style="width: 100%" />
        </div>
        <div class="ts-form-group ts-half">
          <label class="ts-label">GL Account</label>
          <input pInputText [(ngModel)]="projectForm.glAccountCode" placeholder="e.g. GL-2000" style="width: 100%" />
        </div>
      </div>
      <div class="ts-form-row">
        <div class="ts-form-group ts-half">
          <label class="ts-label">Start Date</label>
          <input type="date" [(ngModel)]="projectForm.startDate" pInputText style="width: 100%" />
        </div>
        <div class="ts-form-group ts-half">
          <label class="ts-label">End Date</label>
          <input type="date" [(ngModel)]="projectForm.endDate" pInputText style="width: 100%" />
        </div>
      </div>
      <div class="ts-form-group">
        <div class="ts-switch-row">
          <span class="ts-switch-label">Active Project</span>
          <p-inputSwitch [(ngModel)]="projectForm.isActive"></p-inputSwitch>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" [text]="true" (click)="closeProjectDialog()"></p-button>
        <p-button [label]="editingProject ? 'Update' : 'Create'" [loading]="saving()" (click)="saveProject()"></p-button>
      </ng-template>
    </p-dialog>

    <!-- Task Dialog -->
    <p-dialog [header]="editingTask ? 'Edit Task' : 'New Task'" [(visible)]="showTaskDialog" [modal]="true" [style]="{width: '520px', 'border-radius': '10px'}">
      <div class="ts-form-group">
        <label class="ts-label">Task Name *</label>
        <input pInputText [(ngModel)]="taskForm.taskName" placeholder="e.g. Frontend Development" style="width: 100%" />
      </div>
      <div class="ts-form-group">
        <label class="ts-label">Hourly Rate</label>
        <p-inputNumber [(ngModel)]="taskForm.hourlyRate" [min]="0" mode="currency" currency="USD" locale="en-US" [style]="{'width': '100%'}"></p-inputNumber>
      </div>
      <div class="ts-form-group">
        <div class="ts-switch-row">
          <span class="ts-switch-label">Billable by Default</span>
          <p-inputSwitch [(ngModel)]="taskForm.isBillableDefault"></p-inputSwitch>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" [text]="true" (click)="closeTaskDialog()"></p-button>
        <p-button [label]="editingTask ? 'Update' : 'Create'" [loading]="saving()" (click)="saveTask()"></p-button>
      </ng-template>
    </p-dialog>

    <!-- Delete Confirmation Dialog -->
    <p-dialog header="Confirm Delete" [(visible)]="showDeleteDialog" [modal]="true" [style]="{width: '520px', 'border-radius': '10px'}">
      <p>{{ deleteMessage }}</p>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" [text]="true" (click)="showDeleteDialog = false"></p-button>
        <p-button label="Delete" styleClass="p-button-danger" [loading]="saving()" (click)="executeDelete()"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styleUrls: ['./timesheet-projects.component.scss']
})
export class TimesheetProjectsComponent implements OnInit {
  projects = signal<TimesheetProject[]>([]);
  expandedProjectId = signal<string | null>(null);
  tasks = signal<TimesheetTask[]>([]);
  loading = true;
  loadingTasks = false;
  saving = signal(false);

  searchTerm = '';

  // Project dialog
  showProjectDialog = false;
  editingProject: TimesheetProject | null = null;
  projectForm: Partial<TimesheetProject> = {};

  // Task dialog
  showTaskDialog = false;
  editingTask: TimesheetTask | null = null;
  taskForm: Partial<TimesheetTask> & { projectId?: string } = {};

  // Delete confirmation
  showDeleteDialog = false;
  deleteMessage = '';
  deleteAction: (() => void) | null = null;

  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  get canCreate(): boolean {
    return this.authService.hasPermissionByActionKey('projects_create');
  }

  filteredProjects = signal<TimesheetProject[]>([]);

  constructor(private api: TimesheetService) {}

  ngOnInit() { this.loadProjects(); }

  loadProjects() {
    this.loading = true;
    this.api.getProjects().subscribe({
      next: p => { this.projects.set(p); this.applyFilter(); this.loading = false; },
      error: () => { this.loading = false; this.snackBar.open('Failed to load projects', 'Close', { duration: 3000 }); }
    });
  }

  applyFilter() {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredProjects.set(this.projects());
    } else {
      this.filteredProjects.set(
        this.projects().filter(p =>
          (p.projectName || '').toLowerCase().includes(term) ||
          (p.projectCode || '').toLowerCase().includes(term) ||
          (p.clientName || '').toLowerCase().includes(term)
        )
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSearchChange(_value: string) {
    this.applyFilter();
  }

  toggleProject(p: TimesheetProject) {
    if (this.expandedProjectId() === p.projectId) {
      this.expandedProjectId.set(null);
      this.tasks.set([]);
    } else {
      this.expandedProjectId.set(p.projectId);
      this.loadTasks(p.projectId);
    }
  }

  loadTasks(projectId: string) {
    this.loadingTasks = true;
    this.api.getProjectTasks(projectId).subscribe({
      next: t => { this.tasks.set(t); this.loadingTasks = false; },
      error: () => { this.loadingTasks = false; this.snackBar.open('Failed to load tasks', 'Close', { duration: 3000 }); }
    });
  }

  // ── Project CRUD ──

  openProjectDialog(project: TimesheetProject | null) {
    this.editingProject = project;
    if (project) {
      this.projectForm = { ...project };
    } else {
      this.projectForm = { projectName: '', projectCode: '', clientName: '', costCenterCode: '', glAccountCode: '', isActive: true, startDate: '', endDate: '' };
    }
    this.showProjectDialog = true;
  }

  closeProjectDialog() {
    this.showProjectDialog = false;
    this.editingProject = null;
    this.projectForm = {};
  }

  saveProject() {
    if (!this.projectForm.projectName?.trim()) {
      this.snackBar.open('Project name is required', 'Close', { duration: 3000 });
      return;
    }
    this.saving.set(true);
    if (this.editingProject) {
      this.api.updateProject(this.projectForm as TimesheetProject).subscribe({
        next: () => {
          this.snackBar.open('Project updated', 'Close', { duration: 2000 });
          this.closeProjectDialog();
          this.loadProjects();
          this.saving.set(false);
        },
        error: () => { this.saving.set(false); this.snackBar.open('Failed to update project', 'Close', { duration: 3000 }); }
      });
    } else {
      this.api.createProject(this.projectForm as TimesheetProject).subscribe({
        next: () => {
          this.snackBar.open('Project created', 'Close', { duration: 2000 });
          this.closeProjectDialog();
          this.loadProjects();
          this.saving.set(false);
        },
        error: () => { this.saving.set(false); this.snackBar.open('Failed to create project', 'Close', { duration: 3000 }); }
      });
    }
  }

  confirmDeleteProject(p: TimesheetProject) {
    this.deleteMessage = `Are you sure you want to delete project "${p.projectName}"? This action cannot be undone.`;
    this.deleteAction = () => {
      this.saving.set(true);
      this.api.deleteProject(p.projectId).subscribe({
        next: () => {
          this.snackBar.open('Project deleted', 'Close', { duration: 2000 });
          this.showDeleteDialog = false;
          this.saving.set(false);
          if (this.expandedProjectId() === p.projectId) {
            this.expandedProjectId.set(null);
            this.tasks.set([]);
          }
          this.loadProjects();
        },
        error: () => { this.saving.set(false); this.snackBar.open('Failed to delete project', 'Close', { duration: 3000 }); }
      });
    };
    this.showDeleteDialog = true;
  }

  // ── Task CRUD ──

  openTaskDialog(projectId: string, task: TimesheetTask | null) {
    this.editingTask = task;
    if (task) {
      this.taskForm = { ...task, projectId };
    } else {
      this.taskForm = { projectId, taskName: '', isBillableDefault: true, hourlyRate: 0 };
    }
    this.showTaskDialog = true;
  }

  closeTaskDialog() {
    this.showTaskDialog = false;
    this.editingTask = null;
    this.taskForm = {};
  }

  saveTask() {
    if (!this.taskForm.taskName?.trim()) {
      this.snackBar.open('Task name is required', 'Close', { duration: 3000 });
      return;
    }
    const projectId = this.taskForm.projectId!;
    this.saving.set(true);
    if (this.editingTask) {
      this.api.updateTask(projectId, this.taskForm as TimesheetTask).subscribe({
        next: () => {
          this.snackBar.open('Task updated', 'Close', { duration: 2000 });
          this.closeTaskDialog();
          this.loadTasks(projectId);
          this.saving.set(false);
        },
        error: () => { this.saving.set(false); this.snackBar.open('Failed to update task', 'Close', { duration: 3000 }); }
      });
    } else {
      this.api.createTask(projectId, this.taskForm as TimesheetTask).subscribe({
        next: () => {
          this.snackBar.open('Task created', 'Close', { duration: 2000 });
          this.closeTaskDialog();
          this.loadTasks(projectId);
          this.saving.set(false);
        },
        error: () => { this.saving.set(false); this.snackBar.open('Failed to create task', 'Close', { duration: 3000 }); }
      });
    }
  }

  confirmDeleteTask(projectId: string, task: TimesheetTask) {
    this.deleteMessage = `Are you sure you want to delete task "${task.taskName}"?`;
    this.deleteAction = () => {
      this.saving.set(true);
      this.api.deleteTask(projectId, task.taskId).subscribe({
        next: () => {
          this.snackBar.open('Task deleted', 'Close', { duration: 2000 });
          this.showDeleteDialog = false;
          this.saving.set(false);
          this.loadTasks(projectId);
        },
        error: () => { this.saving.set(false); this.snackBar.open('Failed to delete task', 'Close', { duration: 3000 }); }
      });
    };
    this.showDeleteDialog = true;
  }

  executeDelete() {
    if (this.deleteAction) {
      this.deleteAction();
      this.deleteAction = null;
    }
  }
}
