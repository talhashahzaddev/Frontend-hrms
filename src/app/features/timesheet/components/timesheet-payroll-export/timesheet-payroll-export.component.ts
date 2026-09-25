import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TimesheetService } from '../../services/timesheet.service';
import { EmployeePayrollSummary } from '../../models/timesheet.models';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-timesheet-payroll-export',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatSnackBarModule, TableModule, ButtonModule, DropdownModule, ProgressSpinnerModule, PageHeaderComponent, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <div class="ts-page-layout">
      <app-page-header matIcon="download" title="Payroll Export" subtitle="Export finalized period data for payroll processing">
        <div actions>
          @if (summary()) {
            <p-button label="Export CSV" icon="pi pi-download" styleClass="p-button-success" (click)="exportCSV()"></p-button>
          }
        </div>
      </app-page-header>

      <div class="filters-section">
        <div class="filters-row">
          <div class="ts-form-group" style="margin: 0; min-width: 280px; flex: 1;">
            <label class="field-label">Select Finalized Period</label>
            <p-dropdown class="ts-field-full" [options]="periodOptions()" [(ngModel)]="selectedPeriodId" optionLabel="label" optionValue="value"
              placeholder="— Choose a period —" (onChange)="loadSummary()" styleClass="ts-payroll-dropdown"></p-dropdown>
          </div>
        </div>
      </div>

      @if (loading) {
        <div class="ts-loading"><p-progressSpinner></p-progressSpinner></div>
      } @else if (summary()) {
        <div class="ts-card" style="margin-bottom: var(--ts-space-5);">
          <div class="ts-summary-header">
            <span class="ts-body" style="font-weight: 600;">{{ summary()?.timesheetName }}</span>
            <app-status-badge [status]="summary()?.status"></app-status-badge>
          </div>
        </div>

        <div class="ts-card ts-table-card">
          <p-table [value]="summary()?.employees ?? []" [tableStyle]="{'width': '100%'}" [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]"
                   styleClass="ts-payroll-table">
            <ng-template pTemplate="header">
              <tr>
                <th style="padding-left: 1.5rem;">Employee</th>
                <th style="text-align: center;">Present</th>
                <th style="text-align: center;">Absent</th>
                <th style="text-align: center;">Late</th>
                <th style="text-align: center;">Half</th>
                <th style="text-align: center;">Leave</th>
                <th style="text-align: center;">OT Reg</th>
                <th style="text-align: center;">OT Wknd</th>
                <th style="text-align: center;">OT Hol</th>
                <th style="text-align: center;">Hours</th>
                <th style="text-align: center;">Att %</th>
                <th style="padding-right: 1.5rem;">Consumed</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-emp>
              <tr>
                <td style="padding-left: 1.5rem;">
                  <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 600; color: #1e293b;">
                      <i class="pi pi-user" style="color: #94a3b8; font-size: 0.8rem; margin-right: 6px;"></i>{{ emp.employeeName }}
                    </span>
                    <span style="font-size: 0.75rem; color: #64748b; margin-left: 18px;">{{ emp.employeeCode }}</span>
                  </div>
                </td>
                <td style="text-align: center; color: #0f172a; font-weight: 500;">{{ emp.presentDays }}</td>
                <td style="text-align: center; color: #dc2626; font-weight: 500;">{{ emp.absentDays }}</td>
                <td style="text-align: center; color: #d97706; font-weight: 500;">{{ emp.lateDays }}</td>
                <td style="text-align: center; color: #0f172a;">{{ emp.halfDays }}</td>
                <td style="text-align: center; color: #0284c7; font-weight: 500;">{{ emp.leaveDaysTotal }}</td>
                <td style="text-align: center; color: #475569;">{{ emp.regularOvertimeHours }}h</td>
                <td style="text-align: center; color: #475569;">{{ emp.weekendOvertimeHours }}h</td>
                <td style="text-align: center; color: #475569;">{{ emp.holidayOvertimeHours }}h</td>
                <td style="text-align: center; font-weight: 600; color: #0f172a;">{{ emp.totalHoursWorked }}</td>
                <td style="text-align: center;">
                  <span [style.color]="emp.attendancePercentage < 80 ? '#dc2626' : (emp.attendancePercentage < 100 ? '#d97706' : '#16a34a')" style="font-weight: 600; padding: 4px 8px; background: #f8fafc; border-radius: 6px; font-size: 0.8125rem;">
                    {{ emp.attendancePercentage }}%
                  </span>
                </td>
                <td style="padding-right: 1.5rem;">
                  @if (emp.isConsumedByPayroll) {
                    <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: #dcfce7; color: #16a34a; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">
                      <i class="pi pi-check-circle" style="font-size: 0.7rem;"></i> Yes
                    </span>
                  } @else {
                    <span style="color: #94a3b8;">—</span>
                  }
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="12" style="text-align: center; padding: 4rem; color: #94a3b8; font-size: 0.9rem;">No payroll data available</td></tr>
            </ng-template>
          </p-table>
        </div>
      } @else {
        <app-empty-state icon="pi-download" title="Payroll Export" message="Select a finalized period to view payroll export data."></app-empty-state>
      }
    </div>
  `,
  styleUrls: ['./timesheet-payroll-export.component.scss']
})
export class TimesheetPayrollExportComponent implements OnInit {
  finalizedPeriods = signal<any[]>([]);
  selectedPeriodId = '';
  summary = signal<any>(null);
  loading = false;
  private snackBar = inject(MatSnackBar);

  constructor(private route: ActivatedRoute, private api: TimesheetService) {}

  ngOnInit() {
    this.api.getFinalizedForPayroll().subscribe({
      next: (links) => {
        this.finalizedPeriods.set(links);
        const qpId = this.route.snapshot.queryParamMap.get('periodId');
        if (qpId) { this.selectedPeriodId = qpId; this.loadSummary(); }
      }
    });
  }

  periodOptions() {
    return this.finalizedPeriods().map(p => ({
      label: `${p.timesheetName} (${p.periodStart ? new Date(p.periodStart).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''} — ${p.periodEnd ? new Date(p.periodEnd).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''})`,
      value: p.timesheetId
    }));
  }

  loadSummary() {
    if (!this.selectedPeriodId) return;
    this.loading = true;
    this.api.getPayrollSummary(this.selectedPeriodId).subscribe({
      next: (s) => { this.summary.set(s); this.loading = false; },
      error: () => { this.loading = false; this.snackBar.open('Failed to load payroll summary', 'Close', { duration: 3000 }); }
    });
  }

  exportCSV() {
    const employees = this.summary()?.employees as EmployeePayrollSummary[] | undefined;
    if (!employees?.length) return;
    const headers = ['Employee Code','Employee Name','Department','Designation','Present','Absent','Late','Half','Leave','OT Reg','OT Wknd','OT Hol','Total Hours','Att %'];
    const rows = employees.map(e => [
      e.employeeCode, e.employeeName, e.department, e.designation,
      e.presentDays, e.absentDays, e.lateDays, e.halfDays, e.leaveDaysTotal,
      e.regularOvertimeHours, e.weekendOvertimeHours, e.holidayOvertimeHours,
      e.totalHoursWorked, e.attendancePercentage + '%'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => '"' + String(c ?? '') + '"').join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payroll-export-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    window.URL.revokeObjectURL(url);
  }
}
