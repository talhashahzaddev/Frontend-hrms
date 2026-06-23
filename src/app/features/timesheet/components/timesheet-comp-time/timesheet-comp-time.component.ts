import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetService } from '../../services/timesheet.service';
import { CompTimeBalance } from '../../models/timesheet.models';
import { EmployeeSearchComponent } from '../../../../shared/components/employee-search/employee-search.component';
import { Employee } from '../../../../core/models/employee.models';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-timesheet-comp-time',
  standalone: true,
  imports: [CommonModule, FormsModule, EmployeeSearchComponent, ButtonModule, InputNumberModule, ProgressSpinnerModule, StatCardComponent, PageHeaderComponent],
  template: `
    <div class="ts-page-layout">
      <app-page-header title="Comp Time / Overtime Bank"></app-page-header>

      <div class="ts-card" style="margin-bottom: var(--ts-space-5);">
        <div class="ts-form-row">
          <div class="ts-form-group" style="flex: 2;">
            <label class="ts-label">Employee</label>
            <app-employee-search placeholder="Search employee by name..." (employeeSelected)="onEmployeeSelected($event)"></app-employee-search>
          </div>
          <div class="ts-form-group" style="flex: 1;">
            <label class="ts-label">Year</label>
            <p-inputNumber [(ngModel)]="year" [min]="2020" [max]="2099" mode="decimal" [useGrouping]="false" [style]="{'width': '100%'}"></p-inputNumber>
          </div>
          <div class="ts-form-group" style="flex: 0 0 auto; display: flex; align-items: flex-end;">
            <p-button label="Check Balance" icon="pi pi-search" (click)="loadBalance()"></p-button>
          </div>
        </div>
      </div>

      @if (loading) {
        <div class="ts-loading"><p-progressSpinner></p-progressSpinner></div>
      } @else if (balance()) {
        <div class="ts-card" style="margin-bottom: var(--ts-space-5);">
          <h3 class="ts-section-title" style="margin-bottom: var(--ts-space-4);">{{ balance()?.employeeName }}</h3>
          <div class="ts-metrics-grid">
            <app-stat-card label="Banked" [value]="(balance()?.overtimeHoursBanked ?? 0) + 'h'" icon="pi-arrow-down" color="primary"></app-stat-card>
            <app-stat-card label="Used" [value]="(balance()?.overtimeHoursUsed ?? 0) + 'h'" icon="pi-arrow-up" color="danger"></app-stat-card>
            <app-stat-card label="Available" [value]="(balance()?.overtimeHoursAvailable ?? 0) + 'h'" icon="pi-check-circle" color="success"></app-stat-card>
          </div>
          <div class="ts-meta" style="margin-top: var(--ts-space-4);">
            <span class="ts-muted">Conversion: {{ balance()?.conversionRatio ?? 0 }}x</span>
            @if (balance()?.expiresAt) { <span class="ts-muted">Expires: {{ balance()?.expiresAt | date:'MMM d, y' }}</span> }
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./timesheet-comp-time.component.scss']
})
export class TimesheetCompTimeComponent implements OnInit {
  balance = signal<CompTimeBalance | null>(null);
  employeeId = '';
  year = new Date().getFullYear();
  loading = false;

  constructor(private api: TimesheetService) {}

  ngOnInit() {}

  onEmployeeSelected(emp: Employee) {
    this.employeeId = emp.employeeId;
  }

  loadBalance() {
    if (!this.employeeId || !this.year) return;
    this.loading = true;
    this.api.getCompTimeBalance(this.employeeId, this.year).subscribe({
      next: r => { this.balance.set(r); this.loading = false; },
      error: () => this.loading = false
    });
  }
}
