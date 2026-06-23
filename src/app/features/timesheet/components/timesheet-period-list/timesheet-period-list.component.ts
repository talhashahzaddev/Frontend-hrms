import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetService } from '../../services/timesheet.service';
import { TimesheetPeriod, TimesheetLockBlockers } from '../../models/timesheet.models';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { EmployeeService } from '../../../employee/services/employee.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-timesheet-period-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, DialogModule, InputTextModule, TagModule, MessageModule, ProgressSpinnerModule, SelectButtonModule, MultiSelectModule, PageHeaderComponent, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <div class="ts-page-layout">
      <app-page-header title="Timesheet Periods">
        <button actions pButton label="Create Period" icon="pi pi-plus" (click)="showCreateDialog = true" *ngIf="canCreate"></button>
      </app-page-header>

      <p-dialog header="Create Timesheet Period" [(visible)]="showCreateDialog" [modal]="true" [style]="{width: '580px', 'border-radius': '10px'}">
        <div class="ts-form-group">
          <label>Period Name</label>
          <input pInputText [(ngModel)]="newPeriod.name" placeholder="e.g. June 2026 Timesheet" style="width: 100%" />
        </div>
        <div class="ts-form-group">
          <label>Start Date</label>
          <input type="date" [(ngModel)]="newPeriod.start" pInputText style="width: 100%" />
        </div>
        <div class="ts-form-group">
          <label>End Date</label>
          <input type="date" [(ngModel)]="newPeriod.end" pInputText style="width: 100%" />
        </div>
        <div class="ts-form-group">
          <label>Scope</label>
          <p-selectButton [options]="scopeOptions" [(ngModel)]="newPeriod.scopeType" optionLabel="label" optionValue="value" styleClass="w-full">
            <ng-template let-item>
              <span><i class="pi" [ngClass]="{'pi-users': item.value === 'all', 'pi-building': item.value === 'department', 'pi-user': item.value === 'employees'}" style="margin-right: 6px;"></i>{{ item.label }}</span>
            </ng-template>
          </p-selectButton>
        </div>
        @if (newPeriod.scopeType === 'department') {
          <div class="ts-form-group">
            <label>Select Department(s)</label>
            <p-multiSelect [options]="departments()" [(ngModel)]="newPeriod.departmentIds" optionLabel="name" optionValue="id"
              placeholder="Choose departments" [filter]="true" filterBy="name" styleClass="w-full"
              [style]="{'min-height': '38px'}">
            </p-multiSelect>
          </div>
        }
        @if (newPeriod.scopeType === 'employees') {
          <div class="ts-form-group">
            <label>Select Employee(s)</label>
            <p-multiSelect [options]="employees()" [(ngModel)]="newPeriod.employeeIds" optionLabel="name" optionValue="id"
              placeholder="Choose employees" [filter]="true" filterBy="name" styleClass="w-full"
              [style]="{'min-height': '38px'}">
            </p-multiSelect>
          </div>
        }
        <div class="ts-scope-preview">
          <i class="pi pi-info-circle"></i>
          @if (newPeriod.scopeType === 'all') {
            <span>All employees in the organization will be included.</span>
          } @else if (newPeriod.scopeType === 'department') {
            @if (newPeriod.departmentIds.length) {
              <span>{{ newPeriod.departmentIds!.length }} department(s) selected</span>
            } @else {
              <span>Select at least one department.</span>
            }
          } @else {
            @if (newPeriod.employeeIds.length) {
              <span>{{ newPeriod.employeeIds!.length }} employee(s) selected</span>
            } @else {
              <span>Select at least one employee.</span>
            }
          }
        </div>
        @if (createError) { <p-message severity="error" [text]="createError"></p-message> }
        <ng-template pTemplate="footer">
          <p-button label="Cancel" [text]="true" (click)="showCreateDialog = false"></p-button>
          <p-button label="Create" [loading]="creating" (click)="createPeriod()"></p-button>
        </ng-template>
      </p-dialog>

      <p-dialog [header]="blockersDialog?.canLock ? 'Ready to Lock' : 'Cannot Lock — Blockers Found'" [(visible)]="showBlockersDialog" [modal]="true" [style]="{width: '520px', 'border-radius': '10px'}">
        @if (blockersDialog?.blockers?.length) {
          <ul style="padding-left: 20px; color: var(--ts-danger);">
            @for (b of blockersDialog!.blockers; track b) { <li style="margin-bottom: 6px;">{{ b }}</li> }
          </ul>
        } @else {
          <p>No blockers. This period is ready to lock.</p>
        }
        <ng-template pTemplate="footer">
          <p-button label="Close" [text]="true" (click)="showBlockersDialog = false"></p-button>
          @if (blockersDialog?.canLock) {
            <p-button label="Lock Now" (click)="confirmLock()"></p-button>
          }
        </ng-template>
      </p-dialog>

      @if (loading) {
        <div class="ts-loading"><p-progressSpinner></p-progressSpinner></div>
      } @else if (periods().length === 0) {
        <app-empty-state icon="pi-calendar" title="No timesheet periods" message="Create a period to get started.">
          <p-button label="Create Period" icon="pi pi-plus" (click)="showCreateDialog = true"></p-button>
        </app-empty-state>
      } @else {
        <div class="ts-period-grid">
          @for (period of periods(); track period.timesheetId) {
            <div class="ts-period-card" [class.ts-finalized]="period.status === 'Finalized' || period.status === 'Locked'">
              <div class="ts-pc-header">
                <span class="ts-pc-name">{{ period.timesheetName }}</span>
                <app-status-badge [status]="period.status"></app-status-badge>
              </div>
              <div class="ts-pc-meta">
                <span><i class="pi pi-calendar" style="margin-right: 4px;"></i> {{ period.periodStart | date:'MMM d, y' }} — {{ period.periodEnd | date:'MMM d, y' }}</span>
                <span class="ts-pc-count"><i class="pi pi-users" style="margin-right: 4px;"></i> {{ period.totalEmployees }} employees</span>
              </div>
              @if (period.scopeType !== 'all') {
                <div class="ts-pc-scope">
                  <span class="ts-scope-tag" [class.ts-scope-dept]="period.scopeType === 'department'" [class.ts-scope-emp]="period.scopeType === 'employees'">
                    <i class="pi" [ngClass]="{'pi-building': period.scopeType === 'department', 'pi-user': period.scopeType === 'employees'}"></i>
                    {{ period.scopeLabel || period.scopeType }}
                  </span>
                </div>
              }
              <div class="ts-pc-actions">
                <p-button label="View Details" [outlined]="true" size="small" [routerLink]="['/timesheet/periods', period.timesheetId]"></p-button>
                @for (action of period.nextActions; track action) {
                  @if (canTransition) {
                    <p-button [label]="action" size="small" [text]="true" styleClass="p-button-info" (click)="handleAction(period, action)"></p-button>
                  }
                }
                @if (period.status === 'Finalized') {
                  <p-button label="Payroll" size="small" [text]="true" icon="pi pi-download" [routerLink]="['/timesheet/payroll-export']" [queryParams]="{periodId: period.timesheetId}"></p-button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./timesheet-period-list.component.scss']
})
export class TimesheetPeriodListComponent implements OnInit {
  periods = signal<TimesheetPeriod[]>([]);
  departments = signal<{id: string, name: string}[]>([]);
  employees = signal<{id: string, name: string}[]>([]);
  loading = true;
  showCreateDialog = false;
  creating = false;
  createError = '';
  blockersDialog: TimesheetLockBlockers | null = null;
  showBlockersDialog = false;
  pendingLockPeriod: TimesheetPeriod | null = null;

  scopeOptions = [
    { label: 'All Employees', value: 'all' },
    { label: 'Department(s)', value: 'department' },
    { label: 'Employee(s)', value: 'employees' }
  ];

  newPeriod: {
    name: string; start: string; end: string;
    scopeType: string; departmentIds: string[]; employeeIds: string[];
  } = { name: '', start: '', end: '', scopeType: 'all', departmentIds: [], employeeIds: [] };

  private authService = inject(AuthService);

  get canCreate(): boolean {
    return this.authService.hasPermissionByActionKey('timesheet_periods_create');
  }

  get canTransition(): boolean {
    return this.authService.hasPermissionByActionKey('timesheet_periods_transition');
  }

  constructor(private api: TimesheetService, private employeeService: EmployeeService) {}

  ngOnInit() {
    this.loadPeriods();
    this.loadDepartments();
    this.loadEmployees();
  }

  loadPeriods() {
    this.loading = true;
    this.api.getPeriods().subscribe({
      next: (periods) => { this.periods.set(periods); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  loadDepartments() {
    this.employeeService.getDepartments().subscribe({
      next: (depts) => this.departments.set(depts.map(d => ({ id: d.departmentId, name: d.departmentName }))),
      error: () => {}
    });
  }

  loadEmployees() {
    this.employeeService.getEmployees().subscribe({
      next: (resp) => this.employees.set(resp.employees.map(e => ({ id: e.employeeId, name: e.firstName + ' ' + e.lastName }))),
      error: () => {}
    });
  }

  createPeriod() {
    if (!this.newPeriod.name || !this.newPeriod.start || !this.newPeriod.end) return;
    if (this.newPeriod.scopeType === 'department' && !this.newPeriod.departmentIds.length) {
      this.createError = 'Select at least one department.';
      return;
    }
    if (this.newPeriod.scopeType === 'employees' && !this.newPeriod.employeeIds.length) {
      this.createError = 'Select at least one employee.';
      return;
    }
    this.creating = true;
    this.createError = '';
    this.api.createPeriod({
      periodName: this.newPeriod.name,
      periodStart: this.newPeriod.start,
      periodEnd: this.newPeriod.end,
      scopeType: this.newPeriod.scopeType,
      departmentIds: this.newPeriod.departmentIds.length ? this.newPeriod.departmentIds : undefined,
      employeeIds: this.newPeriod.employeeIds.length ? this.newPeriod.employeeIds : undefined
    }).subscribe({
      next: () => {
        this.showCreateDialog = false;
        this.creating = false;
        this.newPeriod = { name: '', start: '', end: '', scopeType: 'all', departmentIds: [], employeeIds: [] };
        this.loadPeriods();
      },
      error: (err) => {
        this.creating = false;
        this.createError = err?.error?.errorMessage || 'Failed to create period.';
      }
    });
  }

  handleAction(period: TimesheetPeriod, action: string) {
    if (action === 'InProgress') {
      this.api.transitionStatus(period.timesheetId, 'InProgress').subscribe(() => this.loadPeriods());
    } else if (action === 'Finalized' || action === 'Locked') {
      this.pendingLockPeriod = period;
      this.api.getBlockers(period.timesheetId).subscribe({
        next: (b) => { this.blockersDialog = b; this.showBlockersDialog = true; },
        error: (e) => {
          this.blockersDialog = { canLock: false, blockers: [e?.error?.errorMessage || 'Failed to check blockers'] };
          this.showBlockersDialog = true;
        }
      });
    } else {
      this.api.transitionStatus(period.timesheetId, action).subscribe(() => this.loadPeriods());
    }
  }

  confirmLock() {
    if (!this.pendingLockPeriod) return;
    const action = this.pendingLockPeriod.nextActions.includes('Locked') ? 'Locked' : 'Finalized';
    this.api.transitionStatus(this.pendingLockPeriod.timesheetId, action).subscribe(() => {
      this.blockersDialog = null;
      this.showBlockersDialog = false;
      this.pendingLockPeriod = null;
      this.loadPeriods();
    });
  }
}
