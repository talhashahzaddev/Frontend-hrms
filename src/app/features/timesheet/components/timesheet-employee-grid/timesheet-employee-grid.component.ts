import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TimesheetService } from '../../services/timesheet.service';
import { TimesheetPeriod, EmployeeTimesheet, TimesheetDay } from '../../models/timesheet.models';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TimesheetCorrectionDialog } from '../timesheet-correction-dialog/timesheet-correction-dialog.component';
import { TimeAllocationDialog } from '../time-allocation-dialog/time-allocation-dialog.component';
import { TimesheetAuditTimelineComponent } from '../timesheet-audit-timeline/timesheet-audit-timeline.component';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-timesheet-employee-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatDialogModule, MatSnackBarModule, TableModule, ButtonModule, InputTextModule, ProgressSpinnerModule, StatusBadgeComponent, DialogModule, TimesheetAuditTimelineComponent],
  template: `
    <div class="period-detail-layout">

      <!-- ═══ LEFT PANEL: Employee List (master) ═══ -->
      <div class="employee-panel">
        <!-- Sticky Panel Header -->
        <div class="emp-panel-header">
          <h2 class="emp-panel-title">{{ period()?.timesheetName || 'Period Details' }}</h2>
          <span class="emp-panel-dates">
            {{ period() ? (period()!.periodStart | date:'MMM d') + ' — ' + (period()!.periodEnd | date:'MMM d, y') : '' }}
          </span>
          <div class="emp-panel-chips">
            <span class="emp-chip">{{ filteredEmployees().length }} Employee{{ filteredEmployees().length !== 1 ? 's' : '' }}</span>
            @if (period()) {
              <app-status-badge [status]="period()!.status"></app-status-badge>
            }
          </div>
        </div>

        <!-- Sticky Search Bar -->
        <div class="emp-search-wrap">
          <i class="pi pi-search emp-search-icon"></i>
          <input type="text" [(ngModel)]="employeeFilter" (ngModelChange)="filterEmployees()"
                 placeholder="Search employee..." class="emp-search-input" />
          @if (employeeFilter) {
            <button class="emp-clear-btn" (click)="clearFilter()"><i class="pi pi-times"></i></button>
          }
        </div>

        <!-- Employee List -->
        <div class="emp-list">
          @if (loading) {
            <div class="emp-loading">
              <p-progressSpinner strokeWidth="3" [style]="{'width': '32px', 'height': '32px'}"></p-progressSpinner>
            </div>
          } @else {
            @for (emp of filteredEmployees(); track emp.employeeId; let i = $index) {
              <div class="employee-item"
                   [class.active]="selectedEmployee()?.employeeId === emp.employeeId"
                   (click)="selectedEmployee.set(emp)">
                <div class="emp-avatar" [style.background]="getAvatarColor(i)">
                  {{ getInitials(emp.employeeName) }}
                </div>
                <div class="emp-info">
                  <span class="emp-name">{{ emp.employeeName }}</span>
                  <span class="emp-meta">{{ getAttendancePercent(emp) }}% &middot; {{ emp.dailyRecords.length || 0 }} days</span>
                </div>
                <div class="emp-right">
                  @if (hasPendingOrDraft(emp)) {
                    <span class="emp-pending-dot"></span>
                  }
                </div>
                @if (selectedEmployee()?.employeeId === emp.employeeId) {
                  <i class="pi pi-chevron-right emp-active-arrow"></i>
                }
              </div>
            } @empty {
              <div class="emp-empty-state">
                <i class="pi pi-search emp-empty-icon"></i>
                <span class="emp-empty-text">No employees match your search</span>
              </div>
            }
          }
        </div>
      </div>

      <!-- ═══ RIGHT PANEL: Daily Records (detail) ═══ -->
      <div class="detail-panel">
        @if (loading) {
          <div class="detail-loading">
            <div class="skeleton-header"></div>
            <div class="skeleton-stats">
              <div class="skeleton skeleton-chip"></div>
              <div class="skeleton skeleton-chip"></div>
              <div class="skeleton skeleton-chip"></div>
              <div class="skeleton skeleton-chip"></div>
            </div>
            <div class="skeleton-grid">
              <div class="skeleton"></div>
              <div class="skeleton"></div>
              <div class="skeleton"></div>
              <div class="skeleton"></div>
              <div class="skeleton"></div>
              <div class="skeleton"></div>
            </div>
          </div>
        } @else if (selectedEmployee(); as emp) {
          <div class="detail-panel-content">
            <!-- Detail Header (sticky) -->
            <div class="detail-header">
              <div class="detail-header-left">
                <h2 class="detail-emp-name">{{ emp.employeeName }}</h2>
                <span class="detail-subtitle">Daily Records</span>
              </div>
              <div class="detail-header-right">
                @if (hasPermission('timesheet_audit_view')) {
                  <p-button label="Audit History" icon="pi pi-history" [outlined]="true" size="small" (click)="openAuditTimeline()"></p-button>
                }
                @if (hasPermission('timesheet_allocations_edit')) {
                  <p-button label="Manage Time Allocations" icon="pi pi-list" [outlined]="true" size="small" (click)="openAllocationDialog()"></p-button>
                }
              </div>
            </div>

            <!-- Summary Stats Strip -->
            <div class="stats-strip">
              <div class="stat-chip">
                <strong>{{ emp.dailyRecords.length || 0 }}</strong>
                Total Days
              </div>
              <div class="stat-chip">
                <strong>{{ getDaysByStatus(emp, 'present') }}</strong>
                Present
              </div>
              <div class="stat-chip">
                <strong>{{ emp.overtimeHours }}h</strong>
                OT Hours
              </div>
              <div class="stat-chip">
                <strong>{{ getDaysByStatus(emp, 'late') }}</strong>
                Late
              </div>
            </div>

            <!-- Daily Cards Grid -->
            <div class="day-grid">
              @for (day of emp.dailyRecords; track day.date) {
                <div class="day-card"
                     [class.weekend]="day.status === 'weekend' || day.status === 'holiday'"
                     [class.has-issue]="day.status === 'absent' || day.status === 'late' || day.hasPendingRequest || day.hasDraftRequest"
                     [class.locked]="isPeriodLocked()"
                     (click)="onDayClick(day)">

                  <!-- Date -->
                  <div class="day-top">
                    <span class="day-number">{{ day.date | date:'d' }}</span>
                    <span class="day-dow">{{ day.date | date:'EEE' }}</span>
                  </div>

                  <!-- Status Badge -->
                  <span class="day-status-badge"
                        [class.badge-present]="day.status === 'present'"
                        [class.badge-absent]="day.status === 'absent'"
                        [class.badge-late]="day.status === 'late'"
                        [class.badge-half-day]="day.status === 'half_day'"
                        [class.badge-leave]="day.status === 'on_leave'"
                        [class.badge-weekend]="day.status === 'weekend' || day.status === 'holiday' || day.status === 'no_record'">
                    {{ getStatusShort(day) }}
                  </span>

                  <!-- Hours — hidden for absent/weekend/holiday (no meaningful time data) -->
                  @if (day.totalHours > 0 && day.status !== 'absent' && day.status !== 'weekend' && day.status !== 'holiday' && day.status !== 'no_record') {
                    <span class="day-hours">{{ day.totalHours }}h</span>
                  }

                  <!-- In/Out Times — hidden for absent (no clock data) -->
                  @if (day.status !== 'absent' && day.status !== 'weekend' && day.status !== 'holiday' && day.status !== 'no_record') {
                    <div class="day-times">
                      @if (day.checkInTime) {
                        <span class="day-in"><i class="pi pi-arrow-down"></i> {{ day.checkInTime | date:'HH:mm' }}</span>
                      }
                      @if (day.checkOutTime) {
                        <span class="day-out"><i class="pi pi-arrow-up"></i> {{ day.checkOutTime | date:'HH:mm' }}</span>
                      }
                    </div>
                  }

                  <!-- OT / Late Badges — hidden for absent -->
                  @if (day.status !== 'absent') {
                    <div class="day-badges">
                      @if (day.overtimeHours > 0) {
                        <span class="day-badge ot">+{{ day.overtimeHours }}h OT</span>
                      }
                      @if (day.lateMinutes > 0) {
                        <span class="day-badge late">-{{ day.lateMinutes }}m</span>
                      }
                    </div>
                  }

                  <!-- Correction Status Indicators -->
                  @if (day.hasPendingRequest || day.hasDraftRequest) {
                    <i class="pi pi-circle-fill day-pending-dot" title="Pending correction request"></i>
                  }
                  @if (day.hasApprovedRequest) {
                    <i class="pi pi-check-circle day-approved-dot" title="Correction approved"></i>
                  }
                  @if (day.rejectionReason && !day.hasPendingRequest && !day.hasDraftRequest) {
                    <i class="pi pi-times-circle day-rejected-dot" [title]="'Rejected: ' + day.rejectionReason"></i>
                  }
                  @if (day.isManagerOverride) {
                    <i class="pi pi-star-fill day-override-dot" title="Manager override"></i>
                  }
                  @if (isPeriodLocked()) {
                    <i class="pi pi-lock day-lock-icon" title="Period is locked"></i>
                  }
                </div>
              }
            </div>
          </div>
        } @else {
          <!-- Empty State -->
          <div class="detail-empty">
            <i class="pi pi-user detail-empty-icon"></i>
            <p class="detail-empty-text">Select an employee to view daily records</p>
          </div>
        }
      </div>
    </div>

    <!-- Audit Timeline Dialog — content is lazy to avoid API call on page load -->
    <p-dialog header="Audit History" [(visible)]="showAuditTimeline" [modal]="true" [style]="{width: '640px', 'max-height': '80vh', 'border-radius': '10px'}">
      @if (showAuditTimeline) {
        <app-timesheet-audit-timeline [timesheetId]="periodId"></app-timesheet-audit-timeline>
      }
    </p-dialog>
  `,
  styleUrls: ['./timesheet-employee-grid.component.scss']
})
export class TimesheetEmployeeGridComponent implements OnInit {
  period = signal<TimesheetPeriod | null>(null);
  employees = signal<EmployeeTimesheet[]>([]);
  filteredEmployees = signal<EmployeeTimesheet[]>([]);
  selectedEmployee = signal<EmployeeTimesheet | null>(null);
  employeeFilter = '';
  loading = true;
  showAuditTimeline = false;
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  periodId = '';

  readonly avatarColors = ['#DBEAFE', '#DCFCE7', '#FEF3C7', '#FCE7F3', '#EDE9FE', '#FFE4E6'];

  private authService = inject(AuthService);

  constructor(private route: ActivatedRoute, private api: TimesheetService) {}

  /** Check if user has a specific Timesheet action permission */
  hasPermission(actionKey: string): boolean {
    return this.authService.hasPermissionByActionKey(actionKey);
  }

  ngOnInit() {
    this.periodId = this.route.snapshot.paramMap.get('periodId')!;
    this.api.getPeriod(this.periodId).subscribe({
      next: p => this.period.set(p),
      error: err => this.snackBar.open(err?.error?.message || 'Failed to load period', 'Close', { duration: 5000 })
    });
    this.loadEmployeeDays();
  }

  private loadEmployeeDays() {
    this.loading = true;
    // Backend handles access control via timesheet_view_all_employees permission
    this.api.getEmployeeDays(this.periodId).subscribe({
      next: (data) => {
        this.employees.set(data);
        this.filteredEmployees.set(data);
        this.loading = false;
        if (data.length) this.selectedEmployee.set(data[0]);
      },
      error: (err) => { this.loading = false; this.snackBar.open(err?.error?.message || 'Failed to load employee days', 'Close', { duration: 5000 }); }
    });
  }

  filterEmployees() {
    const term = this.employeeFilter.toLowerCase().trim();
    if (!term) {
      this.filteredEmployees.set(this.employees());
      return;
    }
    this.filteredEmployees.set(
      this.employees().filter(e =>
        e.employeeName?.toLowerCase().includes(term) ||
        e.department?.toLowerCase().includes(term)
      )
    );
  }

  clearFilter() {
    this.employeeFilter = '';
    this.filteredEmployees.set(this.employees());
  }

  onRowSelect(event: any) {
    this.selectedEmployee.set(event.data);
  }

  hasPendingOrDraft(emp: EmployeeTimesheet): boolean {
    return (emp.dailyRecords ?? []).some(d => d.hasPendingRequest || d.hasDraftRequest);
  }

  getDaysByStatus(emp: EmployeeTimesheet, status: string): number {
    return emp.dailyRecords?.filter(d => d.status === status).length ?? 0;
  }

  getAttendancePercent(emp: EmployeeTimesheet): number {
    const days = emp.dailyRecords ?? [];
    const working = days.filter(d => d.status !== 'weekend' && d.status !== 'holiday' && d.status !== 'no_record');
    const worked = working.filter(d => d.status === 'present' || d.status === 'late' || d.status === 'half_day' || d.status === 'on_leave');
    return working.length ? Math.round((worked.length / working.length) * 100) : 0;
  }

  getStatusShort(day: TimesheetDay): string {
    const map: Record<string, string> = {
      present: 'P', absent: 'A', late: 'L', half_day: 'HD', on_leave: 'LV', weekend: 'WE', holiday: 'HO', no_record: '—'
    };
    return map[day.status] ?? day.status;
  }

  onDayClick(day: TimesheetDay) {
    const emp = this.selectedEmployee();
    if (!emp || !this.hasPermission('timesheet_corrections_submit')) return;
    if (this.isPeriodLocked()) return;  // can't correct locked periods
    const dialogRef = this.dialog.open(TimesheetCorrectionDialog, {
      width: '480px',
      data: { day, periodId: this.periodId }
    });
    dialogRef.afterClosed().subscribe((result: { submitted: boolean; status: string } | undefined) => {
      if (result?.submitted) {
        this.snackBar.open(result.status === 'draft' ? 'Draft saved' : 'Correction submitted for review', 'Close', { duration: 3000 });
        this.api.getEmployeeDays(this.periodId).subscribe(data => this.employees.set(data));
      }
    });
  }

  cancelOverride() {}
  applyOverride() {}

  getAvatarColor(index: number): string {
    return this.avatarColors[index % this.avatarColors.length];
  }

  getInitials(name: string): string {
    if (!name) return '';
    return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
  }

  openAllocationDialog() {
    const emp = this.selectedEmployee();
    if (!emp) return;
    const dialogRef = this.dialog.open(TimeAllocationDialog, {
      width: '800px',
      data: {
        timesheetId: this.periodId,
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        days: emp.dailyRecords
      }
    });
    dialogRef.afterClosed().subscribe((result: { saved: boolean } | undefined) => {
      if (result?.saved) {
        this.loadEmployeeDays();
      }
    });
  }

  isPeriodLocked(): boolean {
    const status = this.period()?.status;
    return status === 'Locked' || status === 'Finalized' || status === 'Archived';
  }

  openAuditTimeline() {
    this.showAuditTimeline = true;
  }
}
