import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetService } from '../../services/timesheet.service';
import { TimesheetDashboard, TimesheetPeriod } from '../../models/timesheet.models';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-timesheet-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownModule, TableModule, ProgressSpinnerModule, StatCardComponent, PageHeaderComponent],
  template: `
    <div class="ts-page-layout">
      <app-page-header matIcon="analytics" title="Timesheet Analytics" subtitle="Organization-wide utilization and overtime insights"></app-page-header>

      <div class="filters-section">
        <div class="filters-row">
          <p-dropdown [options]="periodOptions()" [(ngModel)]="selectedPeriodId" optionLabel="label" optionValue="value"
            placeholder="All Periods" [showClear]="true" (onChange)="loadDashboard()" styleClass="ts-period-filter"></p-dropdown>
        </div>
      </div>

      @if (loading) {
        <div class="ts-loading"><p-progressSpinner></p-progressSpinner></div>
      } @else {
        <div class="ts-metrics-grid">
          <app-stat-card label="Completion Rate" [value]="(dashboard()?.completionRate?.value ?? 0) + '%'" icon="pi-check-circle" color="success"></app-stat-card>
          <app-stat-card label="Avg Hours/Day" [value]="(dashboard()?.avgHoursPerDay?.value ?? 0) + 'h'" icon="pi-clock" color="primary"></app-stat-card>
          <app-stat-card label="Overtime Hours" [value]="(dashboard()?.overtimeTrend?.value ?? 0) + 'h'" icon="pi-forward" color="warning"></app-stat-card>
          <app-stat-card label="Pending Approvals" [value]="dashboard()?.pendingApprovals?.value ?? 0" icon="pi-hourglass" color="danger"></app-stat-card>
        </div>

        <div class="ts-section">
          <h3 class="ts-section-title">Department Utilization</h3>
          <div class="ts-card">
            <p-table [value]="dashboard()?.departmentUtilization ?? []" [tableStyle]="{'width': '100%'}" styleClass="p-datatable-sm p-datatable-striped p-datatable-gridlines">
              <ng-template pTemplate="header">
                <tr>
                  <th>Department</th>
                  <th pSortableColumn="scheduled">Scheduled Hours <p-sortIcon field="scheduled"></p-sortIcon></th>
                  <th pSortableColumn="actual">Actual Hours <p-sortIcon field="actual"></p-sortIcon></th>
                  <th pSortableColumn="utilizationPercent">Utilization % <p-sortIcon field="utilizationPercent"></p-sortIcon></th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-d>
                <tr>
                  <td>{{ d.department }}</td>
                  <td>{{ d.scheduled }}</td>
                  <td>{{ d.actual }}</td>
                  <td>
                    <div class="ts-util-bar">
                      <div class="ts-util-fill" [style.width.%]="d.utilizationPercent" [style.background]="utilColor(d.utilizationPercent)"></div>
                      <span class="ts-util-label">{{ d.utilizationPercent }}%</span>
                    </div>
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--ts-text-muted);">No utilization data</td></tr>
              </ng-template>
            </p-table>
          </div>
        </div>

        <div class="ts-section">
          <h3 class="ts-section-title">Utilization Trend</h3>
          <div class="ts-card">
            <p-table [value]="dashboard()?.utilizationTrend ?? []" [tableStyle]="{'width': '100%'}" styleClass="p-datatable-sm p-datatable-striped p-datatable-gridlines">
              <ng-template pTemplate="header">
                <tr>
                  <th>Period</th>
                  <th pSortableColumn="utilizationPercent">Utilization % <p-sortIcon field="utilizationPercent"></p-sortIcon></th>
                  <th pSortableColumn="overtimePercent">Overtime % <p-sortIcon field="overtimePercent"></p-sortIcon></th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-t>
                <tr>
                  <td>{{ t.period }}</td>
                  <td>{{ t.utilizationPercent }}%</td>
                  <td>{{ t.overtimePercent }}%</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="3" style="text-align: center; padding: 24px; color: var(--ts-text-muted);">No trend data</td></tr>
              </ng-template>
            </p-table>
          </div>
        </div>

        <div class="ts-section">
          <h3 class="ts-section-title">Overtime Reasons</h3>
          <div class="ts-card">
            <p-table [value]="dashboard()?.overtimeReasons ?? []" [tableStyle]="{'width': '100%'}" styleClass="p-datatable-sm p-datatable-striped p-datatable-gridlines">
              <ng-template pTemplate="header">
                <tr>
                  <th>Reason</th>
                  <th>Total Hours</th>
                  <th>Employees</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-r>
                <tr>
                  <td>{{ r.reason }}</td>
                  <td>{{ r.totalHours }}h</td>
                  <td>{{ r.employeeCount }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="3" style="text-align: center; padding: 24px; color: var(--ts-text-muted);">No overtime data</td></tr>
              </ng-template>
            </p-table>
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./timesheet-dashboard.component.scss']
})
export class TimesheetDashboardComponent implements OnInit {
  periods = signal<TimesheetPeriod[]>([]);
  dashboard = signal<TimesheetDashboard | null>(null);
  selectedPeriodId = '';
  loading = true;

  constructor(private api: TimesheetService) {}

  ngOnInit() {
    this.api.getPeriods().subscribe({ next: p => this.periods.set(p) });
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;
    const pid = this.selectedPeriodId || undefined;
    this.api.getDashboard(pid).subscribe({
      next: d => { this.dashboard.set(d); this.loading = false; },
      error: () => this.loading = false
    });
  }

  periodOptions() {
    return this.periods().map(p => ({ label: p.timesheetName, value: p.timesheetId }));
  }

  utilColor(pct: number): string {
    if (pct >= 80) return '#16A34A';
    if (pct >= 50) return '#D97706';
    return '#DC2626';
  }
}
