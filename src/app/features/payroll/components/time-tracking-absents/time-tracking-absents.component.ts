import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { PayrollService } from '../../services/payroll.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { take } from 'rxjs';
import { AttendanceDialogComponent } from '../dialogs/attendance-dialog/attendance-dialog.component';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface AbsentRecordDto {
  id: string;
  employeeId: string;
  employeeName: string;
  positionName: string;
  initials: string;
  avatarColor: string;
  absentDays: number;
  halfDays: number;
  effectiveAbsents: number;
  deductibleDays: number;
  deductionAmount: number;
  // API fields
  periodId?: string;
  ruleId?: string;
  presentDays?: number;
  absentDeduction?: number;
  halfDayDeduction?: number;
  totalDeduction?: number;
}


@Component({
  selector: 'app-time-tracking-absents',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, MatIconModule, MatButtonModule, MatDialogModule, MatProgressSpinnerModule, FormsModule],
  templateUrl: './time-tracking-absents.component.html',
  styleUrl: './time-tracking-absents.component.scss'
})
export class TimeTrackingAbsentsComponent implements OnInit {
  private readonly payrollService = inject(PayrollService);
  private readonly settingsService = inject(SettingsService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly records = signal<AbsentRecordDto[]>([]);
  readonly isLoading = signal(true);
  readonly currencySymbol = signal('$');

  // Stats
  readonly totalAbsents = signal(0);
  readonly totalDeduction = signal(0);
  readonly employeesAffected = signal(0);

  // Pagination
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount() / this.pageSize()));
  }

  get pageRange(): number[] {
    const delta = 2;
    const current = this.page();
    const total = this.totalPages;
    const start = Math.max(1, current - delta);
    const end   = Math.min(total, current + delta);
    const range: number[] = [];
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }

  get fromRecord(): number {
    const count = this.totalCount();
    return count === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1;
  }

  get toRecord(): number {
    return Math.min(this.page() * this.pageSize(), this.totalCount());
  }

  // Filter state
  periods: any[] = [];
  deductionRules: any[] = [];
  pendingSearch = '';
  pendingPeriod = '';
  pendingRule = '';

  filterSearch = '';
  filterPeriod = '';
  filterRule = '';

  get hasActiveFilters(): boolean {
    return !!(this.pendingSearch || this.pendingPeriod || this.pendingRule);
  }

  get hasAppliedFilters(): boolean {
    return !!(this.filterSearch || this.filterPeriod || this.filterRule);
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasPermissionByActionKey(actionKey);
  }

  ngOnInit(): void {
    if (!this.hasPermission('attendance_summary_view')) {
      this.isLoading.set(false);
      return;
    }

    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode) => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol(currencyCode));
        },
        error: () => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol());
        }
      });

    this.loadPeriods();
    this.loadActiveRules();
    this.fetchAbsents();
  }

  loadPeriods() {
    this.payrollService.getPayrollPeriods({ pageSize: 100 }).subscribe({
      next: (res: any) => {
        this.periods = (res.data || []).map((p: any) => ({
          id: p.periodId,
          name: p.periodName
        }));
      }
    });
  }

  loadActiveRules() {
    this.payrollService.getActiveAttendanceDeductionRules().subscribe({
      next: (res: any) => {
        this.deductionRules = res || [];
      }
    });
  }

  fetchAbsents(): void {
    if (!this.hasPermission('attendance_summary_view')) return;
    this.isLoading.set(true);
    const params: any = {
      page: this.page(),
      pageSize: this.pageSize()
    };

    if (this.filterSearch) params.employeeName = this.filterSearch;
    if (this.filterPeriod) params.periodId = this.filterPeriod;
    if (this.filterRule) params.ruleId = this.filterRule;

    this.payrollService.getAttendanceSummaries(params).subscribe({
      next: (res: any) => {
        // Handle both PagedResult wrapper or plain array
        const items = res?.data || (Array.isArray(res) ? res : []);
        this.totalCount.set(res?.totalCount ?? items.length ?? 0);

        const mapped: AbsentRecordDto[] = items.map((item: any) => {
          const name: string = item.employeeName || '';
          const initials = name ? name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'U';
          const colors = ['blue', 'pink', 'amber', 'purple', 'green', 'indigo'];
          const avatarColor = colors[Math.floor(Math.random() * colors.length)];

          return {
            id: item.id,
            employeeId: item.employeeId,
            employeeName: item.employeeName ?? '',
            positionName: item.shiftName ?? '',
            initials,
            avatarColor,
            absentDays: item.absentDays ?? 0,
            halfDays: item.halfDays ?? 0,
            effectiveAbsents: item.effectiveAbsents ?? 0,
            deductibleDays: item.effectiveAbsents ?? 0,
            deductionAmount: item.totalDeduction ?? 0,
            periodId: item.periodId,
            ruleId: item.ruleId,
            presentDays: item.presentDays ?? 0,
            absentDeduction: item.absentDeduction ?? 0,
            halfDayDeduction: item.halfDayDeduction ?? 0,
            totalDeduction: item.totalDeduction ?? 0,
          };
        });

        this.records.set(mapped);
        this.updateStats(mapped);
        this.isLoading.set(false);
      },
      error: () => {
        this.records.set([]);
        this.isLoading.set(false);
        this.notification.showError('Failed to load records.');
      }
    });
  }

  applyFilters() {
    this.filterSearch = this.pendingSearch;
    this.filterPeriod = this.pendingPeriod;
    this.filterRule = this.pendingRule;
    this.page.set(1);
    this.fetchAbsents();
  }

  clearFilters() {
    this.pendingSearch = '';
    this.pendingPeriod = '';
    this.pendingRule = '';
    this.filterSearch = '';
    this.filterPeriod = '';
    this.filterRule = '';
    this.page.set(1);
    this.fetchAbsents();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.page()) return;
    this.page.set(p);
    this.fetchAbsents();
  }

  prevPage() { this.goToPage(this.page() - 1); }
  nextPage() { this.goToPage(this.page() + 1); }

  private updateStats(records: AbsentRecordDto[]): void {
    const totalAbsents = records.reduce((sum, r) => sum + (r.absentDays ?? 0), 0);
    const totalDeduction = records.reduce((sum, r) => sum + (r.deductionAmount ?? 0), 0);
    const affected = new Set(records.map(r => r.employeeId)).size;

    this.totalAbsents.set(totalAbsents);
    this.totalDeduction.set(totalDeduction);
    this.employeesAffected.set(affected);
  }

  logAbsent(): void {
    if (!this.hasPermission('attendance_summary_add')) return;
    const dialogRef = this.dialog.open(AttendanceDialogComponent, {
      width: '480px',
      panelClass: 'attendance-dialog-panel',
      data: { type: 'absent', mode: 'add' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.recordType === 'absent') {
        const { recordType, ...payload } = result;
        this.payrollService.createAttendanceSummary(payload).subscribe({
          next: () => {
            this.notification.showSuccess('Record created successfully');
            this.fetchAbsents();
          },
          error: (err) => this.notification.showError('Failed to create record')
        });
      }
    });
  }

  editRecord(record: AbsentRecordDto): void {
    if (!this.hasPermission('attendance_summary_edit')) return;
    const dialogRef = this.dialog.open(AttendanceDialogComponent, {
      width: '480px',
      panelClass: 'attendance-dialog-panel',
      data: {
        type: 'absent',
        mode: 'edit',
        record: {
          employeeId: record.employeeId,
          periodId: record.periodId,
          ruleId: record.ruleId,
          presentDays: record.presentDays ?? 0,
          absentDays: record.absentDays,
          halfDays: record.halfDays,
          effectiveAbsents: record.effectiveAbsents,
          absentDeduction: record.absentDeduction ?? 0,
          halfDayDeduction: record.halfDayDeduction ?? 0,
          totalDeduction: record.totalDeduction ?? record.deductionAmount,
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.recordType === 'absent') {
        const { recordType, ...payload } = result;
        this.payrollService.updateAttendanceSummary(record.id, payload).subscribe({
          next: () => {
            this.notification.showSuccess('Record updated successfully');
            this.fetchAbsents();
          },
          error: (err) => this.notification.showError('Failed to update record')
        });
      }
    });
  }

  deleteRecord(record: AbsentRecordDto): void {
    if (!this.hasPermission('attendance_summary_delete')) return;
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Record',
      message: 'Are you sure you want to delete this absent record?',
      itemName: record.employeeName,
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.payrollService.deleteAttendanceSummary(record.id).subscribe({
          next: () => {
            this.notification.showSuccess('Record deleted successfully');
            this.fetchAbsents();
          },
          error: (err) => this.notification.showError('Failed to delete record')
        });
      }
    });
  }
}
