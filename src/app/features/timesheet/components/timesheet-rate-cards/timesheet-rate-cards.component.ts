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
      <app-page-header matIcon="attach_money" title="Employee Rate Cards" subtitle="View employee billing rates by project"></app-page-header>

      @if (loading) {
        <div class="ts-loading"><p-progressSpinner></p-progressSpinner></div>
      } @else if (rateCards().length === 0) {
        <app-empty-state icon="pi-dollar" title="No rate cards" message="No employee rate cards have been configured yet."></app-empty-state>
      } @else {
        <div class="ts-card ts-table-card">
          <p-table [value]="rateCards()" [tableStyle]="{'width': '100%'}" [paginator]="true" [rows]="20"
                   styleClass="ts-rate-cards-table">
            <ng-template pTemplate="header">
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th class="ts-col-num">Standard</th>
                <th class="ts-col-num">Overtime</th>
                <th class="ts-col-num">Weekend</th>
                <th class="ts-col-num">Holiday</th>
                <th>Effective</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-r>
              <tr>
                <td class="ts-cell-name">{{ r.employeeName }}</td>
                <td class="ts-cell-code">{{ r.employeeCode }}</td>
                <td class="ts-cell-rate">{{ r.standardRate | currency }}</td>
                <td class="ts-cell-rate">{{ r.overtimeRate | currency }}</td>
                <td class="ts-cell-rate">{{ r.weekendRate | currency }}</td>
                <td class="ts-cell-rate">{{ r.holidayRate | currency }}</td>
                <td class="ts-cell-date">{{ r.effectiveFrom | date:'MMM d, y' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr class="ts-empty-row"><td colspan="7">No rate cards found</td></tr>
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
