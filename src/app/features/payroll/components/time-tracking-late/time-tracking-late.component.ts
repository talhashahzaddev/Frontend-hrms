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
import { AttendanceDialogComponent } from '../attendance-dialog/attendance-dialog.component';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { NotificationService } from '@core/services/notification.service';

export interface LateRecordDto {
  id: string;
  employeeId: string;
  employeeName: string;
  initials: string;
  avatarColor: string;
  attendanceDate: string;
  lateMinutes: number;
  isGrace: boolean;
  deduction: number;
  periodId: string;
  ruleId?: string;
  ruleName?: string;
}

@Component({
  selector: 'app-time-tracking-late',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDialogModule, MatProgressSpinnerModule, FormsModule],
  templateUrl: './time-tracking-late.component.html',
  styleUrl: './time-tracking-late.component.scss'
})
export class TimeTrackingLateComponent implements OnInit {
  private readonly payrollService = inject(PayrollService);
  private readonly settingsService = inject(SettingsService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly records = signal<LateRecordDto[]>([]);
  readonly isLoading = signal(true);
  readonly currencySymbol = signal('$');

  // Stats
  readonly totalLateArrivals = signal(0);
  readonly totalHalfDays = signal(0);
  readonly totalDeductions = signal(0);
  readonly employeesFlagged = signal(0);

  // Pagination
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);

  // Filter state
  periods: any[] = [];
  lateRules: any[] = [];
  
  pendingSearch = '';
  pendingPeriod = '';
  pendingRule = '';

  filterSearch = '';
  filterPeriod = '';
  filterRule = '';

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

  get hasActiveFilters(): boolean {
    return !!(this.pendingSearch || this.pendingPeriod || this.pendingRule);
  }

  get hasAppliedFilters(): boolean {
    return !!(this.filterSearch || this.filterPeriod || this.filterRule);
  }

  ngOnInit(): void {
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
    this.fetchLateRecords();
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
    this.payrollService.getActiveLateArrivalRules().subscribe({
      next: (res: any) => {
        this.lateRules = res || [];
      }
    });
  }

  fetchLateRecords(): void {
    this.isLoading.set(true);
    const params: any = {
      page: this.page(),
      pageSize: this.pageSize()
    };

    if (this.filterSearch) params.employeeName = this.filterSearch;
    if (this.filterPeriod) params.periodId = this.filterPeriod;
    if (this.filterRule) params.ruleId = this.filterRule;

    this.payrollService.getLateAttendances(params).subscribe({
      next: (res: any) => {
        const items = res?.data || (Array.isArray(res) ? res : []);
        this.totalCount.set(res?.totalCount ?? items.length ?? 0);

        const mapped: LateRecordDto[] = items.map((item: any) => {
          const name: string = item.employeeName || '';
          const initials = name ? name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'U';
          const colors = ['blue', 'pink', 'amber', 'purple', 'green', 'indigo'];
          const avatarColor = colors[Math.floor(Math.random() * colors.length)];

          return {
            id: item.id,
            employeeId: item.employeeId,
            employeeName: item.employeeName ?? '',
            initials,
            avatarColor,
            attendanceDate: item.attendanceDate,
            lateMinutes: item.lateMinutes ?? 0,
            isGrace: item.isGrace ?? false,
            deduction: item.deduction ?? 0,
            periodId: item.periodId,
            ruleId: item.ruleId,
            ruleName: item.ruleName
          };
        });

        this.records.set(mapped);
        this.updateStats(mapped);
        this.isLoading.set(false);
      },
      error: () => {
        this.records.set([]);
        this.isLoading.set(false);
        this.notification.showError('Failed to load late records.');
      }
    });
  }

  applyFilters() {
    this.filterSearch = this.pendingSearch;
    this.filterPeriod = this.pendingPeriod;
    this.filterRule = this.pendingRule;
    this.page.set(1);
    this.fetchLateRecords();
  }

  clearFilters() {
    this.pendingSearch = '';
    this.pendingPeriod = '';
    this.pendingRule = '';
    this.filterSearch = '';
    this.filterPeriod = '';
    this.filterRule = '';
    this.page.set(1);
    this.fetchLateRecords();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.page()) return;
    this.page.set(p);
    this.fetchLateRecords();
  }

  prevPage() { this.goToPage(this.page() - 1); }
  nextPage() { this.goToPage(this.page() + 1); }

  private updateStats(records: LateRecordDto[]): void {
    const totalLate = records.length;
    const halfDays = records.filter(r => r.lateMinutes === 0 && r.deduction > 0).length; // Just a guess for now
    const totalDeductions = records.reduce((sum, r) => sum + (r.deduction ?? 0), 0);
    const affected = new Set(records.map(r => r.employeeId)).size;

    this.totalLateArrivals.set(totalLate);
    this.totalHalfDays.set(halfDays);
    this.totalDeductions.set(totalDeductions);
    this.employeesFlagged.set(affected);
  }

  addRecord(): void {
    const dialogRef = this.dialog.open(AttendanceDialogComponent, {
      width: '480px',
      panelClass: 'attendance-dialog-panel',
      data: { type: 'late', mode: 'add' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.recordType === 'late') {
        const { recordType, ...payload } = result;
        this.payrollService.createLateAttendance(payload).subscribe({
          next: () => {
            this.notification.showSuccess('Record created successfully');
            this.fetchLateRecords();
          },
          error: (err) => this.notification.showError('Failed to create record')
        });
      }
    });
  }

  editRecord(record: LateRecordDto): void {
    const dialogRef = this.dialog.open(AttendanceDialogComponent, {
      width: '480px',
      panelClass: 'attendance-dialog-panel',
      data: {
        type: 'late',
        mode: 'edit',
        record: {
          id: record.id,
          employeeId: record.employeeId,
          periodId: record.periodId,
          ruleId: record.ruleId,
          lateMinutes: record.lateMinutes,
          deduction: record.deduction,
          isGrace: record.isGrace,
          attendanceDate: record.attendanceDate
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.recordType === 'late') {
        const { recordType, ...payload } = result;
        this.payrollService.updateLateAttendance(record.id, payload).subscribe({
          next: () => {
            this.notification.showSuccess('Record updated successfully');
            this.fetchLateRecords();
          },
          error: (err) => this.notification.showError('Failed to update record')
        });
      }
    });
  }

  deleteRecord(record: LateRecordDto): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Record',
      message: 'Are you sure you want to delete this late record?',
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
        this.payrollService.deleteLateAttendance(record.id).subscribe({
          next: () => {
            this.notification.showSuccess('Record deleted successfully');
            this.fetchLateRecords();
          },
          error: (err) => this.notification.showError('Failed to delete record')
        });
      }
    });
  }
}
