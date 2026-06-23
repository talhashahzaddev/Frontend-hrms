import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { TimesheetService } from '../../services/timesheet.service';
import { EmployeeRateCard } from '../../models/timesheet.models';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-timesheet-rate-cards',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, TableModule, ProgressSpinnerModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <div class="ts-page-layout">
      <app-page-header title="Employee Rate Cards"></app-page-header>

      @if (loading) {
        <div class="ts-loading"><p-progressSpinner></p-progressSpinner></div>
      } @else if (rateCards().length === 0) {
        <app-empty-state icon="pi-dollar" title="No rate cards" message="No employee rate cards have been configured yet."></app-empty-state>
      } @else {
        <div class="ts-card ts-table-card">
          <p-table [value]="rateCards()" [tableStyle]="{'width': '100%'}" [paginator]="true" [rows]="20"
                   styleClass="p-datatable-sm p-datatable-striped p-datatable-gridlines">
            <ng-template pTemplate="header">
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th style="text-align: right;">Standard</th>
                <th style="text-align: right;">Overtime</th>
                <th style="text-align: right;">Weekend</th>
                <th style="text-align: right;">Holiday</th>
                <th>Effective</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-r>
              <tr>
                <td>{{ r.employeeName }}</td>
                <td>{{ r.employeeCode }}</td>
                <td style="text-align: right;">{{ r.standardRate | currency }}</td>
                <td style="text-align: right;">{{ r.overtimeRate | currency }}</td>
                <td style="text-align: right;">{{ r.weekendRate | currency }}</td>
                <td style="text-align: right;">{{ r.holidayRate | currency }}</td>
                <td>{{ r.effectiveFrom | date:'MMM d, y' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="7" style="text-align: center; padding: var(--ts-space-8);">No rate cards found</td></tr>
            </ng-template>
          </p-table>
        </div>
      }
    </div>
  `,
  styleUrls: ['./timesheet-rate-cards.component.scss']
})
export class TimesheetRateCardsComponent implements OnInit {
  rateCards = signal<EmployeeRateCard[]>([]);
  loading = true;

  constructor(private api: TimesheetService) {}

  ngOnInit() {
    this.api.getRateCards().subscribe({
      next: r => { this.rateCards.set(r); this.loading = false; },
      error: () => this.loading = false
    });
  }
}
