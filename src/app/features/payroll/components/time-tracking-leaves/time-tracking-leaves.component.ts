import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PayrollService, LeaveSummary, LeaveRuleDto } from '../../services/payroll.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { NotificationService } from '@core/services/notification.service';
import { take } from 'rxjs';
import { AttendanceDialogComponent } from '../dialogs/attendance-dialog/attendance-dialog.component';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-time-tracking-leaves',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './time-tracking-leaves.component.html',
  styleUrl: './time-tracking-leaves.component.scss'
})
export class TimeTrackingLeavesComponent implements OnInit {
  currencySymbol = signal('$');
  records: LeaveSummary[] = [];
  leaveRules: LeaveRuleDto[] = [];
  periods: any[] = [];
  
  isLoading = signal(false);
  page = 1;
  pageSize = 9; // Grid layout looks better with multiples of 3
  totalCount = 0;

  // Summary stats
  totalLeaveDays = 0;
  totalPaidDays = 0;
  totalUnpaidDeduction = 0;
  totalHalfPaidDeduction = 0;
  unpaidEmployeesCount = 0;
  halfPaidEmployeesCount = 0;

  // Filters (Applied)
  searchTerm = '';
  selectedRule = '';
  selectedPeriod = '';

  // Filters (Pending)
  pendingSearch = '';
  pendingRule = '';
  pendingPeriod = '';

  constructor(
    private payrollService: PayrollService,
    private settingsService: SettingsService,
    private notification: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.loadRecords();
  }

  loadInitialData() {
    this.settingsService.getOrganizationCurrency().pipe(take(1)).subscribe({
      next: (code) => this.currencySymbol.set(this.settingsService.getCurrencySymbol(code)),
      error: () => this.currencySymbol.set(this.settingsService.getCurrencySymbol())
    });

    this.payrollService.getLeaveActiveRules().subscribe({
      next: (rules) => this.leaveRules = rules,
      error: () => this.leaveRules = []
    });

    this.payrollService.getPayrollPeriods({ pageSize: 100 }).subscribe({
      next: (res: any) => {
        this.periods = (res.data || []).map((p: any) => ({
          id: p.periodId,
          name: p.periodName
        }));
      },
      error: () => this.periods = []
    });
  }

  loadRecords() {
    this.isLoading.set(true);
    const params: any = {
      page: this.page,
      pageSize: this.pageSize,
      employeeName: this.searchTerm,
      ruleId: this.selectedRule,
      periodId: this.selectedPeriod
    };

    this.payrollService.getLeaveSummaries(params).subscribe({
      next: (res: any) => {
        this.records = res.data || [];
        this.totalCount = res.totalCount || 0;
        this.calculateStats();
        this.isLoading.set(false);
      },
      error: () => {
        this.notification.showError('Failed to load leave records.');
        this.isLoading.set(false);
      }
    });
  }

  calculateStats() {
    this.totalLeaveDays = this.records.reduce((acc, r) => acc + Number(r.totalLeaveDays), 0);
    this.totalPaidDays = this.records.reduce((acc, r) => acc + Number(r.paidDays), 0);
    this.totalUnpaidDeduction = this.records.reduce((acc, r) => acc + Number(r.unpaidDeduction), 0);
    this.totalHalfPaidDeduction = this.records.reduce((acc, r) => acc + Number(r.halfPaidDeduction), 0);
    
    this.unpaidEmployeesCount = new Set(this.records.filter(r => Number(r.unpaidDays) > 0).map(r => r.employeeId)).size;
    this.halfPaidEmployeesCount = new Set(this.records.filter(r => Number(r.halfPaidDays) > 0).map(r => r.employeeId)).size;
  }

  get hasActiveFilters(): boolean {
    return !!this.pendingSearch || !!this.pendingRule || !!this.pendingPeriod;
  }

  get hasAppliedFilters(): boolean {
    return !!this.searchTerm || !!this.selectedRule || !!this.selectedPeriod;
  }

  applyFilters() {
    this.searchTerm = this.pendingSearch;
    this.selectedRule = this.pendingRule;
    this.selectedPeriod = this.pendingPeriod;
    this.page = 1;
    this.loadRecords();
  }

  clearFilters() {
    this.pendingSearch = '';
    this.pendingRule = '';
    this.pendingPeriod = '';
    this.searchTerm = '';
    this.selectedRule = '';
    this.selectedPeriod = '';
    this.page = 1;
    this.loadRecords();
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(AttendanceDialogComponent, {
      width: '550px',
      panelClass: 'custom-dialog-container',
      data: {
        type: 'leave',
        mode: 'add'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.payrollService.createLeaveSummary(result).subscribe({
          next: () => {
            this.notification.showSuccess('Leave record added successfully');
            this.loadRecords();
          },
          error: (err) => this.notification.showError(err.message || 'Failed to add record')
        });
      }
    });
  }

  editRecord(record: LeaveSummary) {
    const dialogRef = this.dialog.open(AttendanceDialogComponent, {
      width: '550px',
      panelClass: 'custom-dialog-container',
      data: {
        type: 'leave',
        mode: 'edit',
        record: record
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.payrollService.updateLeaveSummary(record.id, result).subscribe({
          next: () => {
            this.notification.showSuccess('Leave record updated successfully');
            this.loadRecords();
          },
          error: (err) => this.notification.showError(err.message || 'Failed to update record')
        });
      }
    });
  }

  deleteRecord(record: LeaveSummary) {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Leave Record',
      message: `Are you sure you want to delete the leave record for ${record.employeeName}?`,
      itemName: record.employeeName,
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.payrollService.deleteLeaveSummary(record.id).subscribe({
          next: () => {
            this.notification.showSuccess('Record deleted successfully');
            this.loadRecords();
          },
          error: () => this.notification.showError('Failed to delete record')
        });
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }
}
