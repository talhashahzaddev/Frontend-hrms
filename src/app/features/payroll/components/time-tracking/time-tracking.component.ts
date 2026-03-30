import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AttendanceDialogComponent } from '../attendance-dialog/attendance-dialog.component';
import { SettingsService } from '../../../settings/services/settings.service';
import { take } from 'rxjs';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { NotificationService } from '@core/services/notification.service';
import { PayrollService } from '../../services/payroll.service';

@Component({
  selector: 'app-time-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDialogModule],
  templateUrl: './time-tracking.component.html',
  styleUrl: './time-tracking.component.scss'
})
export class TimeTrackingComponent implements OnInit {
  currencySymbol = signal('$');
  records: any[] = [];
  overtimeRules: any[] = [];
  periods: any[] = [];
  page = 1;
  pageSize = 10;
  totalCount = 0;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pageRange(): number[] {
    const delta = 2;
    const start = Math.max(1, this.page - delta);
    const end   = Math.min(this.totalPages, this.page + delta);
    const range: number[] = [];
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }

  get fromRecord(): number {
    return this.totalCount === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  // Summary card stats
  totalOtHours = 0;
  totalOtAmount = 0;
  regularOtHours = 0;
  holidayOtHours = 0;
  totalEmployees = 0;

  // Pending filter state (bound to UI controls)
  pendingSearch = '';
  pendingType   = '';
  pendingRule   = '';
  pendingPeriod = '';

  // Applied filter state (sent to API)
  filterSearch  = '';
  filterType    = '';
  filterRule    = '';
  filterPeriod  = '';

  get hasActiveFilters(): boolean {
    return !!(this.pendingSearch || this.pendingType || this.pendingRule || this.pendingPeriod);
  }

  get hasAppliedFilters(): boolean {
    return !!(this.filterSearch || this.filterType || this.filterRule || this.filterPeriod);
  }

  constructor(
    private dialog: MatDialog, 
    private settingsService: SettingsService,
    private notification: NotificationService,
    private payrollService: PayrollService
  ) {}

  ngOnInit(): void {
    this.settingsService.getOrganizationCurrency().pipe(take(1)).subscribe({
      next: (code) => this.currencySymbol.set(this.settingsService.getCurrencySymbol(code)),
      error: () => this.currencySymbol.set(this.settingsService.getCurrencySymbol())
    });

    this.payrollService.getOvertimeActiveRules().subscribe({
      next: (rules: any[]) => this.overtimeRules = rules,
      error: () => this.overtimeRules = []
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

    this.loadRecords();
  }

  loadRecords() {
    const params: any = { page: this.page, pageSize: this.pageSize };
    if (this.filterSearch) params['employeeName'] = this.filterSearch;
    if (this.filterType)   params['overtimeType']  = this.filterType;
    if (this.filterRule)   params['ruleId']        = this.filterRule;
    if (this.filterPeriod) params['periodId']      = this.filterPeriod;

    this.payrollService.getOvertimeEntries(params).subscribe({
      next: (res: any) => {
        this.totalCount = res.totalCount || 0;
        
        // Calculate summary stats from current data
        this.totalOtHours = 0;
        this.totalOtAmount = 0;
        this.regularOtHours = 0;
        this.holidayOtHours = 0;
        const employeeSet = new Set<string>();

        this.records = (res.data || []).map((r: any) => {
          const hours = r.hoursWorked || 0;
          const amount = r.finalAmount || 0;
          const typeRaw = (r.overtimeType || 'regular').toLowerCase();

          this.totalOtHours += hours;
          this.totalOtAmount += amount;
          if (r.employeeId) employeeSet.add(r.employeeId);

          if (typeRaw === 'regular') this.regularOtHours += hours;
          if (typeRaw === 'holiday') this.holidayOtHours += hours;

          return {
            overtimeId: r.overtimeId,
            employeeId: r.employeeId,
            name: r.employeeName,
            initials: r.employeeName ? r.employeeName.split(' ').map((n: string) => n[0]).join('') : 'U',
            color: 'blue',
            date: new Date(r.overtimeDate).toLocaleDateString(),
            overtimeDate: r.overtimeDate,
            hours: hours,
            rate: amount && hours ? (amount / hours).toFixed(2) : 0,
            amount: amount,
            type: typeRaw.charAt(0).toUpperCase() + typeRaw.slice(1),
            ruleId: r.ruleId,
            periodId: r.periodId,
            typeClass: `type-${typeRaw}`
          };
        });
        
        this.totalEmployees = employeeSet.size;
      },
      error: (err: any) => {
        this.notification.showError('Failed to load records.');
      }
    });
  }

  applyFilters() {
    this.filterSearch  = this.pendingSearch;
    this.filterType    = this.pendingType;
    this.filterRule    = this.pendingRule;
    this.filterPeriod  = this.pendingPeriod;
    this.page = 1;
    this.loadRecords();
  }

  clearFilters() {
    this.pendingSearch = '';
    this.pendingType   = '';
    this.pendingRule   = '';
    this.pendingPeriod = '';
    this.filterSearch  = '';
    this.filterType    = '';
    this.filterRule    = '';
    this.filterPeriod  = '';
    this.page = 1;
    this.loadRecords();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.loadRecords();
  }

  prevPage() { this.goToPage(this.page - 1); }
  nextPage() { this.goToPage(this.page + 1); }

  openDialog(mode: 'add' | 'edit', record?: any, type: string = 'overtime') {
    const dialogRef = this.dialog.open(AttendanceDialogComponent, {
      width: '480px',
      panelClass: 'custom-dialog-container',
      data: {
        type: type,
        mode: mode,
        record: record
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (mode === 'add') {
           this.payrollService.createOvertimeEntry(result).subscribe({
              next: () => {
                 this.notification.showSuccess('Record created successfully');
                 this.loadRecords();
              },
              error: () => this.notification.showError('Failed to create record')
           });
        } else if (mode === 'edit' && record.overtimeId) {
           this.payrollService.updateOvertimeEntry(record.overtimeId, result).subscribe({
              next: () => {
                 this.notification.showSuccess('Record updated successfully');
                 this.loadRecords();
              },
              error: () => this.notification.showError('Failed to update record')
           });
        }
      }
    });
  }

  onDelete(record: any): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Record',
      message: 'Are you sure you want to delete this attendance record?',
      itemName: record.name,
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true && record.overtimeId) {
        this.payrollService.deleteOvertimeEntry(record.overtimeId).subscribe({
           next: () => {
             this.notification.showSuccess('Record deleted successfully');
             this.loadRecords();
           },
           error: () => this.notification.showError('Failed to delete record')
        });
      }
    });
  }
}
