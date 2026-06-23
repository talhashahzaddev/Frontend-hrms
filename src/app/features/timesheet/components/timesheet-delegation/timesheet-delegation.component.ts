import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetService } from '../../services/timesheet.service';
import { TimesheetDelegation } from '../../models/timesheet.models';
import { EmployeeSearchComponent } from '../../../../shared/components/employee-search/employee-search.component';
import { Employee } from '../../../../core/models/employee.models';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-timesheet-delegation',
  standalone: true,
  imports: [CommonModule, FormsModule, EmployeeSearchComponent, DatePipe, ButtonModule, InputTextModule, MessageModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <div class="ts-page-layout">
      <app-page-header title="Approval Delegation"></app-page-header>

      <div class="ts-section">
        <h3 class="ts-section-title">Active Delegation</h3>
        @if (activeDelegation()) {
          <div class="ts-card">
            <div class="ts-delegation-detail">
              <div class="ts-detail-row">
                <span class="ts-label">From:</span>
                <span class="ts-body">{{ activeDelegation()?.delegatedFromName }}</span>
              </div>
              <div class="ts-detail-row">
                <span class="ts-label">To:</span>
                <span class="ts-body">{{ activeDelegation()?.delegatedToName }}</span>
              </div>
              <div class="ts-detail-row">
                <span class="ts-label">Period:</span>
                <span class="ts-body">{{ activeDelegation()?.startDate | date:'MMM d' }} — {{ activeDelegation()?.endDate | date:'MMM d, y' }}</span>
              </div>
              @if (activeDelegation()?.reason) {
                <div class="ts-detail-row">
                  <span class="ts-label">Reason:</span>
                  <span class="ts-body">{{ activeDelegation()?.reason }}</span>
                </div>
              }
            </div>
          </div>
        } @else {
          <app-empty-state icon="pi-user-minus" title="No active delegation" message="No active delegation found for this account."></app-empty-state>
        }
      </div>

      <div class="ts-section">
        <h3 class="ts-section-title">Create Delegation</h3>
        <div class="ts-card">
          <div class="ts-form-group">
            <label class="ts-label">Delegate To</label>
            <app-employee-search (employeeSelected)="onEmployeeSelected($event)"></app-employee-search>
          </div>
          <div class="ts-form-row">
            <div class="ts-form-group ts-half">
              <label class="ts-label">Start Date</label>
              <input type="date" [(ngModel)]="newDelegate.startDate" pInputText style="width: 100%" />
            </div>
            <div class="ts-form-group ts-half">
              <label class="ts-label">End Date</label>
              <input type="date" [(ngModel)]="newDelegate.endDate" pInputText style="width: 100%" />
            </div>
          </div>
          <div class="ts-form-group">
            <label class="ts-label">Reason</label>
            <input [(ngModel)]="newDelegate.reason" pInputText placeholder="Optional reason..." style="width: 100%" />
          </div>
          <p-button label="Create Delegation" icon="pi pi-plus" (click)="createDelegation()"></p-button>
          @if (successMsg) { <p-message severity="success" [text]="successMsg" [ngStyle]="{'margin-top': 'var(--ts-space-3)'}"></p-message> }
          @if (errorMsg) { <p-message severity="error" [text]="errorMsg" [ngStyle]="{'margin-top': 'var(--ts-space-3)'}"></p-message> }
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./timesheet-delegation.component.scss']
})
export class TimesheetDelegationComponent implements OnInit {
  activeDelegation = signal<TimesheetDelegation | null>(null);
  newDelegate = { employeeId: '', startDate: '', endDate: '', reason: '' };
  successMsg = '';
  errorMsg = '';

  constructor(private api: TimesheetService) {}

  onEmployeeSelected(emp: Employee) {
    this.newDelegate.employeeId = emp.employeeId;
  }

  ngOnInit() {
    this.loadActiveDelegation();
  }

  loadActiveDelegation() {
    const approverId = ''; // Will come from auth context — for now uses query param
    if (!approverId) return;
    this.api.getActiveDelegation(approverId).subscribe({
      next: d => this.activeDelegation.set(d)
    });
  }

  createDelegation() {
    if (!this.newDelegate.employeeId || !this.newDelegate.startDate || !this.newDelegate.endDate) return;
    this.successMsg = '';
    this.errorMsg = '';
    this.api.createDelegation({
      delegatedTo: this.newDelegate.employeeId,
      startDate: this.newDelegate.startDate,
      endDate: this.newDelegate.endDate,
      reason: this.newDelegate.reason
    }).subscribe({
      next: () => {
        this.successMsg = 'Delegation created successfully.';
        this.newDelegate = { employeeId: '', startDate: '', endDate: '', reason: '' };
        this.loadActiveDelegation();
      },
      error: (err) => {
        this.errorMsg = err?.error?.errorMessage || 'Failed to create delegation.';
      }
    });
  }
}
