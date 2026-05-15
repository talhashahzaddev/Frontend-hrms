import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { Subscription, take } from 'rxjs';

import { EmployeeService } from '../../../employee/services/employee.service';
import { Department } from '../../../../core/models/employee.models';
import { SettingsService } from '../../../settings/services/settings.service';
import { environment } from '../../../../../environments/environment';
import { PayrollService } from '../../services/payroll.service';
import { PayslipBulkHubService, PayslipBulkProgress } from '../../services/payslip-bulk-hub.service';
import {
  PayslipViewDialogComponent,
  PayslipViewDialogData,
  PayslipViewValueItem
} from '../dialogs/payslip-view-dialog/payslip-view-dialog.component';
import {
  ReissuePayslipDialogComponent,
  ReissuePayslipDialogPayload,
  ReissueVersionHistoryItem
} from '../dialogs/reissue-payslip-dialog/reissue-payslip-dialog.component';
import {
  BulkGenerateDepartmentOption,
  BulkGenerateEmployeeStatus,
  BulkGeneratePayslipsDialogComponent,
  BulkGeneratePayslipsDialogPayload,
  BulkGeneratePeriodOption
} from '../dialogs/bulk-generate-payslips-dialog/bulk-generate-payslips-dialog.component';
import {
  BulkEmailPayslipsDialogComponent,
  BulkEmailPayslipsDialogPayload,
  BulkEmailRecipientStatus,
  BulkEmailRecipientOption
} from '../dialogs/bulk-email-payslips-dialog/bulk-email-payslips-dialog.component';

type PayslipStatus = 'draft' | 'generated' | 'sent' | 'viewed' | 'failed' | 'bounced';

interface PeriodOption {
  id: string;
  label: string;
}

// interface DepartmentOption {
//   id: string;
//   label: string;
// }

interface EmployeeOption {
  id: string;
  name: string;
  employeeCode: string;
  designation: string;
  departmentId: string;
  departmentName: string;
  email: string;
}

interface PayslipRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  departmentId: string;
  departmentName: string;
  periodId: string;
  periodLabel: string;
  grossSalaryPkr: number;
  deductionsPkr: number;
  netSalaryPkr: number;
  status: PayslipStatus;
  versionNo: number;
  payslipUrl: string | null;
  emailedAt: string | null;
  viewedAt: string | null;
  updatedAt: string | null;
}

@Component({
  selector: 'app-compliance-payslips',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './compliance-payslips.component.html',
  styleUrl: './compliance-payslips.component.scss'
})
export class CompliancePayslipsComponent implements OnInit, OnDestroy {
  private readonly payrollService = inject(PayrollService);
  private readonly employeeService = inject(EmployeeService);
  private readonly settingsService = inject(SettingsService);
  private readonly payslipBulkHub = inject(PayslipBulkHubService);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);

  private bulkProgressSubscription?: Subscription;
  private bulkHideTimer?: ReturnType<typeof setTimeout>;

  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());
  readonly bulkJobActive = signal(false);
  readonly bulkProgress = signal<PayslipBulkProgress | null>(null);

  pendingSearchKeyword = '';
  pendingPeriodId = '';
  pendingStatus: PayslipStatus | '' = '';
  pendingDepartmentId = '';

  appliedSearchKeyword = '';
  appliedPeriodId = '';
  appliedStatus: PayslipStatus | '' = '';
  appliedDepartmentId = '';

  currentPage = 1;
  pageSize = 7;

  periods: PeriodOption[] = [];
  departments: Department[] = [];
  employees: EmployeeOption[] = [];
  payslips: PayslipRow[] = [];
  serverTotalCount = 0;
  complianceStats = { totalCount: 0, generatedCount: 0, pendingCount: 0 };

  readonly selectedPayslipIds = new Set<string>();

  private localPayslipSeed: PayslipRow[] = [];
  private localPayslipDetails = new Map<string, PayslipViewDialogData>();
  private localReissueHistory = new Map<string, ReissueVersionHistoryItem[]>();

  usingLocalPayslipData = false;
  usingLocalPayslipDetailData = false;

  ngOnDestroy(): void {
    this.bulkProgressSubscription?.unsubscribe();
    if (this.bulkHideTimer) {
      clearTimeout(this.bulkHideTimer);
    }
    void this.payslipBulkHub.disconnect();
  }

  ngOnInit(): void {
    this.localPayslipSeed = this.buildLocalPayslipSeed();

    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode: unknown) => {
          const code = typeof currencyCode === 'string' ? currencyCode : undefined;
          this.currencySymbol.set(this.settingsService.getCurrencySymbol(code));
        },
        error: () => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol());
        }
      });

    this.loadEmployees();
    this.loadDepartments();
    this.loadPeriods();
  }

  get hasActiveFilters(): boolean {
    return !!(this.pendingSearchKeyword || this.pendingPeriodId || this.pendingStatus || this.pendingDepartmentId);
  }

  get hasAppliedFilters(): boolean {
    return !!(this.appliedSearchKeyword || this.appliedPeriodId || this.appliedStatus || this.appliedDepartmentId);
  }

  get filteredPayslips(): PayslipRow[] {
    if (!this.usingLocalPayslipData) {
      return this.payslips;
    }

    const search = this.appliedSearchKeyword.trim().toLowerCase();

    return this.payslips.filter((row) => {
      const matchesSearch = !search
        || row.employeeName.toLowerCase().includes(search)
        || row.employeeCode.toLowerCase().includes(search)
        || row.departmentName.toLowerCase().includes(search);

      const matchesPeriod = !this.appliedPeriodId || row.periodId === this.appliedPeriodId;
      const matchesStatus = !this.appliedStatus || row.status === this.appliedStatus;
      const matchesDepartment = !this.appliedDepartmentId || row.departmentId === this.appliedDepartmentId;

      return matchesSearch && matchesPeriod && matchesStatus && matchesDepartment;
    });
  }

  get pagedPayslips(): PayslipRow[] {
    if (this.usingLocalPayslipData) {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredPayslips.slice(start, start + this.pageSize);
    }

    return this.payslips;
  }

  get totalRecords(): number {
    if (this.usingLocalPayslipData) {
      return this.filteredPayslips.length;
    }

    return this.serverTotalCount;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  get fromRecord(): number {
    if (!this.totalRecords) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  get totalPayslips(): number {
    return this.complianceStats.totalCount;
  }

  get generatedCount(): number {
    return this.complianceStats.generatedCount;
  }

  get sentCount(): number {
    return 0;
  }

  get reissuedCount(): number {
    return this.payslips.filter((row) => row.versionNo > 1).length;
  }

  get pendingCount(): number {
    return this.complianceStats.pendingCount;
  }

  get pendingEmailsCount(): number {
    return this.complianceStats.generatedCount;
  }

  get distributionPercent(): number {
    if (!this.complianceStats.totalCount) {
      return 0;
    }

    return Math.round((this.complianceStats.generatedCount / this.complianceStats.totalCount) * 100);
  }

  get activePeriodLabel(): string {
    const selected = this.periods.find((period) => period.id === this.appliedPeriodId);
    return selected?.label ?? 'All periods';
  }

  get allVisibleSelected(): boolean {
    if (!this.pagedPayslips.length) {
      return false;
    }

    return this.pagedPayslips.every((row) => this.selectedPayslipIds.has(row.id));
  }

  onFiltersChanged(): void {
    // Optionally auto-clear selection if needed
    // this.selectedPayslipIds.clear();
  }

  applyFilters(): void {
    this.appliedSearchKeyword = this.pendingSearchKeyword;
    this.appliedPeriodId = this.pendingPeriodId;
    this.appliedStatus = this.pendingStatus;
    this.appliedDepartmentId = this.pendingDepartmentId;
    this.currentPage = 1;
    this.reconcileSelection();
    this.loadPayslips();
    this.loadStats();
  }

  clearFilters(): void {
    this.pendingSearchKeyword = '';
    this.pendingPeriodId = '';
    this.pendingStatus = '';
    this.pendingDepartmentId = '';

    this.appliedSearchKeyword = '';
    this.appliedPeriodId = '';
    this.appliedStatus = '';
    this.appliedDepartmentId = '';

    this.currentPage = 1;
    this.reconcileSelection();
    this.loadPayslips();
    this.loadStats();
  }

  prevPage(): void {
    if (this.currentPage <= 1) {
      return;
    }

    this.currentPage -= 1;
    if (!this.usingLocalPayslipData) {
      this.loadPayslips();
    }
    this.reconcileSelection();
  }

  nextPage(): void {
    if (this.currentPage >= this.totalPages) {
      return;
    }

    this.currentPage += 1;
    if (!this.usingLocalPayslipData) {
      this.loadPayslips();
    }
    this.reconcileSelection();
  }

  toggleAllVisible(checked: boolean): void {
    if (checked) {
      this.pagedPayslips.forEach((row) => this.selectedPayslipIds.add(row.id));
      return;
    }

    this.pagedPayslips.forEach((row) => this.selectedPayslipIds.delete(row.id));
  }

  toggleRowSelection(id: string, checked: boolean): void {
    if (checked) {
      this.selectedPayslipIds.add(id);
      return;
    }

    this.selectedPayslipIds.delete(id);
  }

  isSelected(id: string): boolean {
    return this.selectedPayslipIds.has(id);
  }

  openViewPayslip(row: PayslipRow): void {
    if (this.usingLocalPayslipData) {
      this.openPayslipViewDialog(this.getLocalPayslipDetail(row));
      return;
    }

    const directUrl = this.resolvePayslipOpenUrl(row.payslipUrl);
    if (directUrl) {
      const opened = window.open(directUrl, '_blank', 'noopener,noreferrer');
    //   if (!opened) {
    //     window.alert('Pop-up blocked. Please allow pop-ups to view the payslip PDF.');
    //   }
    //   return;
    }

    this.payrollService.getCompliancePayslipPdfBlob(row.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const opened = window.open(url, '_blank');
        // if (!opened) {
        //   URL.revokeObjectURL(url);
        //   window.alert('Pop-up blocked. Please allow pop-ups to view the payslip PDF.');
        //   return;
        // }

        setTimeout(() => URL.revokeObjectURL(url), 120_000);
      },
      error: () => {
        window.alert('Unable to open payslip PDF. Ensure payroll data exists for this employee and period.');
      }
    });
  }

  openReissueDialog(row: PayslipRow): void {
    const dialogRef = this.dialog.open(ReissuePayslipDialogComponent, {
      width: '520px',
      maxWidth: '96vw',
      panelClass: 'reissue-payslip-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        payslipLabel: `${row.employeeName} - ${row.periodLabel}`,
        nextVersionNo: row.versionNo + 1,
        history: this.getReissueHistory(row)
      }
    });

    dialogRef.afterClosed().subscribe((result: ReissuePayslipDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.reissuePayslip(row, result);
    });
  }

  openBulkGenerateDialog(): void {
    const employees = this.employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      departmentId: employee.departmentId,
      departmentName: employee.departmentName,
      currentStatus: this.getCurrentEmployeeStatus(employee.id, this.appliedPeriodId || this.periods[0]?.id || '')
    }));

    const dialogRef = this.dialog.open(BulkGeneratePayslipsDialogComponent, {
      width: '600px',
      maxWidth: '96vw',
      panelClass: 'bulk-generate-payslips-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        periods: this.periods.map((period) => ({ id: period.id, label: period.label })) as BulkGeneratePeriodOption[],
        departments: this.departments.map((department) => ({ id: department.departmentId, label: department.departmentName })) as BulkGenerateDepartmentOption[],
        employees,
        defaultPeriodId: this.appliedPeriodId || this.periods[0]?.id
      }
    });

    dialogRef.afterClosed().subscribe((result: BulkGeneratePayslipsDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.bulkGeneratePayslips(result);
    });
  }

  openBulkEmailDialog(): void {
    const defaultPeriodId = this.appliedPeriodId || this.periods[0]?.id || '';
    const periodLabel = this.getPeriodLabelById(defaultPeriodId);

    const dialogRef = this.dialog.open(BulkEmailPayslipsDialogComponent, {
      width: '640px',
      maxWidth: '96vw',
      panelClass: 'bulk-email-payslips-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        periods: this.periods.map((period) => ({ id: period.id, label: period.label })),
        recipients: this.buildBulkEmailRecipients(),
        defaultPeriodId,
        defaultSubject: `Payslip for ${periodLabel} - Enterprise HR`,
        defaultMessage: 'Hello,\n\nYour payslip for the selected period is now available. Please find the attached document for your records.\n\nBest regards,\nPayroll Team'
      }
    });

    dialogRef.afterClosed().subscribe((result: BulkEmailPayslipsDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.bulkEmailPayslips(result);
    });
  }

  generateSinglePayslip(row: PayslipRow): void {
    if (row.status !== 'draft') {
      return;
    }

    if (this.usingLocalPayslipData) {
      this.applyLocalSingleGenerate(row);
      return;
    }

    this.payrollService.bulkGenerateCompliancePayslipPdfs({
      payrollPeriodId: row.periodId,
      employeeIds: [row.employeeId],
      overwriteExisting: true
    }).subscribe({
      next: () => {
        this.loadPayslips();
        this.loadStats();
      },
      error: (error: any) => {
        if (this.isUnsupportedEndpointError(error)) {
          this.activateLocalPayslipFallback();
          this.applyLocalSingleGenerate(row);
        }
      }
    });
  }

  sendSinglePayslip(row: PayslipRow): void {
    if (row.status === 'draft') {
      return;
    }

    const payload: BulkEmailPayslipsDialogPayload = {
      payrollPeriodId: row.periodId,
      sendToMode: 'custom',
      subject: `Payslip for ${row.periodLabel} - Enterprise HR`,
      message: 'Hello,\n\nYour payslip is now available. Please find the attached document for your records.\n\nBest regards,\nPayroll Team',
      employeeIds: [row.employeeId]
    };

    this.bulkEmailPayslips(payload);
  }

  statusClass(status: PayslipStatus): string {
    return `status-${status}`;
  }

  statusLabel(status: PayslipStatus): string {
    return status;
  }

  formatMoney(value: number): string {
    return `${this.currencySymbol()} ${Math.max(0, this.toNumber(value)).toLocaleString()}`;
  }

  private loadEmployees(): void {
    this.employeeService.getEmployees({ page: 1, pageSize: 1200 } as any).subscribe({
      next: (response: any) => {
        const items = response?.employees ?? [];

        this.employees = items
          .map((item: any, index: number) => {
            const employeeId = String(item.employeeId ?? item.id ?? '').trim();
            if (!employeeId) {
              return null;
            }

            const firstName = String(item.firstName ?? '').trim();
            const lastName = String(item.lastName ?? '').trim();
            const fullName = `${firstName} ${lastName}`.trim() || String(item.name ?? `Employee ${index + 1}`);
            const deptId = String(item.departmentId ?? item.department?.departmentId ?? item.department?.id ?? `dept-${index + 1}`);

            return {
              id: employeeId,
              name: fullName,
              employeeCode: String(item.employeeCode ?? item.code ?? `EMP-${index + 1}`),
              designation: String(item.positionTitle ?? item.designation ?? 'Employee'),
              departmentId: deptId,
              departmentName: String(item.departmentName ?? item.department?.departmentName ?? item.department?.name ?? 'General'),
              email: String(item.email ?? `${fullName.replace(/\s+/g, '.').toLowerCase()}@example.com`)
            } as EmployeeOption;
          })
          .filter((row: EmployeeOption | null): row is EmployeeOption => !!row);
      },
      error: () => {
        this.employees = [];
      }
    });
  }

  private loadDepartments(): void {
    this.employeeService.getDepartments('', 'active').subscribe({
      next: (response: any) => {
        this.departments = response?.data ?? response ?? [];
      },
      error: (err: any) => console.error('Error loading departments', err)
    });
  }

  private loadPeriods(): void {
    this.payrollService.getPayrollPeriods({ page: 1, pageSize: 300 }).subscribe({
      next: (data: any) => {
        const items = this.extractItems(data);

        const mapped = items
          .map((item: any, index: number) => {
            const id = String(item.periodId ?? item.id ?? '').trim();
            if (!id) {
              return null;
            }

            return {
              id,
              label: String(item.periodName ?? item.name ?? item.label ?? `Period ${index + 1}`)
            } as PeriodOption;
          })
          .filter((row: PeriodOption | null): row is PeriodOption => !!row);

        this.periods = mapped.length ? mapped : this.buildLocalPeriods();
        this.ensureDefaultPeriodSelection();
        this.loadPayslips();
        this.loadStats();
      },
      error: () => {
        this.periods = this.buildLocalPeriods();
        this.ensureDefaultPeriodSelection();
        this.loadPayslips();
        this.loadStats();
      }
    });
  }

  private loadPayslips(): void {
    if (this.usingLocalPayslipData) {
      this.payslips = [...this.localPayslipSeed];
      this.serverTotalCount = this.filteredPayslips.length;
      this.refreshLocalComplianceStats();
      this.refreshDepartmentOptions();
      this.ensureDefaultPeriodSelection();
      this.ensurePageInRange();
      return;
    }

    this.payrollService.getCompliancePayslips({
      page: this.currentPage,
      pageSize: this.pageSize,
      payrollPeriodId: this.appliedPeriodId || undefined,
      departmentId: this.appliedDepartmentId || undefined,
      searchTerm: this.appliedSearchKeyword || undefined,
      status: this.appliedStatus || undefined
    }).subscribe({
      next: (page: any) => {
        const items = Array.isArray(page?.data) ? page.data : [];
        this.serverTotalCount = page?.totalCount ?? 0;
        this.payslips = items.map((item: any, index: number) => this.mapPayslipRow(item, index));
        this.ensureDefaultPeriodSelection();
        this.ensurePageInRange();
        this.reconcileSelection();
      },
      error: (error: any) => {
        if (this.isUnsupportedEndpointError(error)) {
          this.activateLocalPayslipFallback();
          this.payslips = [...this.localPayslipSeed];
          this.serverTotalCount = this.filteredPayslips.length;
          this.refreshLocalComplianceStats();
          this.ensureDefaultPeriodSelection();
          this.ensurePageInRange();
          return;
        }

        this.payslips = [];
        this.serverTotalCount = 0;
      }
    });
  }

  private loadStats(): void {
    if (this.usingLocalPayslipData) {
      this.refreshLocalComplianceStats();
      return;
    }

    this.payrollService.getCompliancePayslipStats({
      payrollPeriodId: this.appliedPeriodId || undefined,
      departmentId: this.appliedDepartmentId || undefined,
      searchTerm: this.appliedSearchKeyword || undefined,
      status: this.appliedStatus || undefined
    }).subscribe({
      next: (s: any) => {
        const total = s?.totalCount ?? 0;
        const gen = s?.generatedCount ?? 0;
        this.complianceStats = {
          totalCount: total,
          generatedCount: gen,
          pendingCount: s?.pendingCount ?? Math.max(0, total - gen)
        };
      },
      error: () => {
        this.complianceStats = { totalCount: 0, generatedCount: 0, pendingCount: 0 };
      }
    });
  }

  private refreshLocalComplianceStats(): void {
    if (!this.usingLocalPayslipData) {
      return;
    }

    const rows = this.filteredPayslips;
    const total = rows.length;
    const gen = rows.filter((r) => r.status === 'generated' || r.status === 'sent' || r.status === 'viewed').length;
    this.complianceStats = {
      totalCount: total,
      generatedCount: gen,
      pendingCount: Math.max(0, total - gen)
    };
  }

  private openPayslipViewDialog(data: PayslipViewDialogData): void {
    const dialogRef = this.dialog.open(PayslipViewDialogComponent, {
      width: '720px',
      maxWidth: '96vw',
      panelClass: 'payslip-view-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data
    });

    dialogRef.afterClosed().subscribe((result: { action: 'close' | 'download' } | undefined) => {
      if (result?.action === 'download') {
        this.downloadPayslipPdf(data.payslipId);
      }
    });
  }

  private reissuePayslip(row: PayslipRow, payload: ReissuePayslipDialogPayload): void {
    if (this.usingLocalPayslipData) {
      this.applyLocalReissue(row, payload);
      return;
    }

    this.payrollService.reissuePayslip(row.id, {
      reason: payload.reason,
      notes: payload.notes,
      sendEmail: payload.sendEmail,
      nextVersionNo: payload.nextVersionNo
    }).subscribe({
      next: () => {
        this.loadPayslips();
        this.loadStats();
      },
      error: (error: any) => {
        if (this.isUnsupportedEndpointError(error)) {
          this.activateLocalPayslipFallback();
          this.applyLocalReissue(row, payload);
        }
      }
    });
  }

  private bulkGeneratePayslips(payload: BulkGeneratePayslipsDialogPayload): void {
    if (this.usingLocalPayslipData) {
      this.applyLocalBulkGenerate(payload);
      return;
    }

    this.payrollService.bulkGenerateCompliancePayslipPdfs({
      payrollPeriodId: payload.payrollPeriodId,
      employeeIds: payload.employeeIds,
      overwriteExisting: payload.overwriteExisting
    }).subscribe({
      next: () => {
        this.loadPayslips();
        this.loadStats();
      },
      error: (error: any) => {
        if (this.isUnsupportedEndpointError(error)) {
          this.activateLocalPayslipFallback();
          this.applyLocalBulkGenerate(payload);
        }
      }
    });
  }

  private bulkEmailPayslips(payload: BulkEmailPayslipsDialogPayload): void {
    if (this.usingLocalPayslipData) {
      this.applyLocalBulkEmail(payload);
      return;
    }

    void this.startBulkUploadAndSend(payload);
  }

  private async startBulkUploadAndSend(payload: BulkEmailPayslipsDialogPayload): Promise<void> {
    if (!payload.employeeIds.length) {
      this.toastr.warning('Select at least one employee with a generated payslip.');
      return;
    }

    if (this.bulkHideTimer) {
      clearTimeout(this.bulkHideTimer);
      this.bulkHideTimer = undefined;
    }

    this.bulkProgressSubscription?.unsubscribe();

    const initialTotal = payload.employeeIds.length;
    this.bulkJobActive.set(true);
    this.bulkProgress.set({
      jobId: '',
      total: initialTotal,
      processed: 0,
      failed: 0,
      percentageCompleted: 0,
      isComplete: false
    });

    let signalRConnected = false;

    try {
      await this.payslipBulkHub.connect();
      signalRConnected = true;

      this.bulkProgressSubscription = this.payslipBulkHub.progress$.subscribe((progress) => {
        this.bulkProgress.set(progress);

        if (progress.isComplete) {
          this.onBulkJobComplete(progress);
        }
      });
    } catch (hubError) {
      console.warn('SignalR progress connection failed; bulk job will still run without live updates.', hubError);
      this.toastr.warning('Live progress unavailable. Payslip emails are still being processed in the background.');
    }

    const connectionId = signalRConnected ? this.payslipBulkHub.connectionId : undefined;

    try {
      this.payrollService.uploadSendPayslips({
        payrollPeriodId: payload.payrollPeriodId,
        employeeIds: payload.employeeIds,
        subject: payload.subject,
        message: payload.message,
        connectionId
      }).subscribe({
        next: async (result) => {
          if (result?.jobId) {
            this.bulkProgress.update((current) => ({
              ...(current ?? {
                total: initialTotal,
                processed: 0,
                failed: 0,
                percentageCompleted: 0,
                isComplete: false
              }),
              jobId: result.jobId
            }));

            try {
              await this.payslipBulkHub.joinJob(result.jobId);
            } catch (joinError) {
              console.error('Failed to join payslip bulk SignalR group', joinError);
            }
          }

          this.toastr.info('Bulk payslip upload and email started.');
        },
        error: (error: any) => {
          if (this.isUnsupportedEndpointError(error)) {
            this.activateLocalPayslipFallback();
            this.resetBulkProgressUi();
            this.applyLocalBulkEmail(payload);
            return;
          }

          this.resetBulkProgressUi();
          this.toastr.error(error?.message ?? 'Failed to start bulk payslip job.');
        }
      });
    } catch (error: any) {
      this.resetBulkProgressUi();
      this.toastr.error(error?.message ?? 'Failed to start bulk payslip job.');
    }
  }

  private onBulkJobComplete(progress: PayslipBulkProgress): void {
    this.loadPayslips();
    this.loadStats();

    if (progress.failed > 0) {
      this.toastr.warning(`Completed with ${progress.failed} failed of ${progress.total} payslips.`);
    } else {
      this.toastr.success(`Successfully processed ${progress.processed} payslip${progress.processed === 1 ? '' : 's'}.`);
    }

    this.bulkHideTimer = setTimeout(() => {
      this.resetBulkProgressUi();
    }, 6000);
  }

  private resetBulkProgressUi(): void {
    this.bulkJobActive.set(false);
    this.bulkProgress.set(null);
    this.bulkProgressSubscription?.unsubscribe();
    this.bulkProgressSubscription = undefined;
    void this.payslipBulkHub.disconnect();
  }

  private applyLocalSingleGenerate(row: PayslipRow): void {
    const today = this.getTodayIsoDate();

    this.localPayslipSeed = this.localPayslipSeed.map((item) => {
      if (item.id !== row.id) {
        return item;
      }

      return {
        ...item,
        status: 'generated',
        versionNo: Math.max(1, item.versionNo),
        updatedAt: today
      };
    });

    this.payslips = [...this.localPayslipSeed];
    this.serverTotalCount = this.filteredPayslips.length;
    this.refreshLocalComplianceStats();
  }

  private applyLocalReissue(row: PayslipRow, payload: ReissuePayslipDialogPayload): void {
    const today = this.getTodayIsoDate();

    this.localPayslipSeed = this.localPayslipSeed.map((item) => {
      if (item.id !== row.id) {
        return item;
      }

      const nextStatus: PayslipStatus = payload.sendEmail
        ? 'sent'
        : (item.status === 'viewed' ? 'viewed' : 'generated');

      return {
        ...item,
        versionNo: payload.nextVersionNo,
        status: nextStatus,
        emailedAt: payload.sendEmail ? today : item.emailedAt,
        updatedAt: today
      };
    });

    const history = this.getReissueHistory(row);
    const nextHistory = [
      {
        versionNo: payload.nextVersionNo,
        status: payload.sendEmail ? 'sent' : 'generated',
        issuedAt: today
      } as ReissueVersionHistoryItem,
      ...history
    ];
    this.localReissueHistory.set(row.id, nextHistory);

    this.payslips = [...this.localPayslipSeed];
    this.serverTotalCount = this.filteredPayslips.length;
    this.refreshLocalComplianceStats();
  }

  private applyLocalBulkGenerate(payload: BulkGeneratePayslipsDialogPayload): void {
    const periodLabel = this.getPeriodLabelById(payload.payrollPeriodId);
    const today = this.getTodayIsoDate();

    payload.employeeIds.forEach((employeeId) => {
      const employee = this.findEmployee(employeeId);
      if (!employee) {
        return;
      }

      const existingIndex = this.localPayslipSeed.findIndex((row) => row.employeeId === employeeId && row.periodId === payload.payrollPeriodId);
      const salary = this.estimateSalary(employeeId);

      if (existingIndex >= 0) {
        if (!payload.overwriteExisting) {
          return;
        }

        const existing = this.localPayslipSeed[existingIndex];
        this.localPayslipSeed[existingIndex] = {
          ...existing,
          grossSalaryPkr: salary.gross,
          deductionsPkr: salary.deductions,
          netSalaryPkr: salary.net,
          status: 'generated',
          updatedAt: today
        };
        return;
      }

      const nextRow: PayslipRow = {
        id: `local-payslip-${Date.now()}-${employeeId}`,
        employeeId,
        employeeName: employee.name,
        employeeCode: employee.employeeCode,
        designation: employee.designation,
        departmentId: employee.departmentId,
        departmentName: employee.departmentName,
        periodId: payload.payrollPeriodId,
        periodLabel,
        grossSalaryPkr: salary.gross,
        deductionsPkr: salary.deductions,
        netSalaryPkr: salary.net,
        status: 'generated',
        versionNo: 1,
        payslipUrl: null,
        emailedAt: null,
        viewedAt: null,
        updatedAt: today
      };

      this.localPayslipSeed = [nextRow, ...this.localPayslipSeed];
    });

    this.payslips = [...this.localPayslipSeed];
    this.ensurePageInRange();
    this.serverTotalCount = this.filteredPayslips.length;
    this.refreshLocalComplianceStats();
  }

  private applyLocalBulkEmail(payload: BulkEmailPayslipsDialogPayload): void {
    const targetEmployeeIds = new Set(payload.employeeIds);
    const today = this.getTodayIsoDate();

    this.localPayslipSeed = this.localPayslipSeed.map((row) => {
      if (row.periodId !== payload.payrollPeriodId) {
        return row;
      }

      if (!targetEmployeeIds.has(row.employeeId)) {
        return row;
      }

      if (row.status === 'draft') {
        return row;
      }

      return {
        ...row,
        status: row.status === 'viewed' ? 'viewed' : 'sent',
        emailedAt: today,
        updatedAt: today
      };
    });

    this.payslips = [...this.localPayslipSeed];
    this.serverTotalCount = this.filteredPayslips.length;
    this.refreshLocalComplianceStats();
  }

  private mapPayslipRow(item: any, index: number): PayslipRow {
    const grossSalary = this.toNumber(item.grossSalaryPkr ?? item.grossSalary ?? item.grossSalaryAmount);
    const deductions = this.toNumber(item.deductionsPkr ?? item.totalDeductions ?? item.deductionsAmount ?? item.deductionAmount);
    const netSalary = this.toNumber(item.netSalaryPkr ?? item.netSalary ?? item.netPayablePkr ?? (grossSalary - deductions));

    return {
      id: String(item.resultId ?? item.resultid ?? item.payslipId ?? item.id ?? `payslip-${index + 1}`),
      employeeId: String(item.employeeId ?? item.employee?.employeeId ?? item.employee?.id ?? `emp-${index + 1}`),
      employeeName: String(item.employeeName ?? item.employee?.name ?? `Employee ${index + 1}`),
      employeeCode: String(item.employeeCode ?? item.employee?.employeeCode ?? item.employee?.code ?? `EMP-${index + 1}`),
      designation: String(item.designation ?? item.employee?.designation ?? item.positionTitle ?? 'Employee'),
      departmentId: item.departmentId != null && item.departmentId !== '' ? String(item.departmentId) : '',
      departmentName: String(item.departmentName ?? item.employee?.departmentName ?? item.department?.name ?? 'General'),
      periodId: String(item.payrollPeriodId ?? item.periodId ?? item.period?.id ?? `period-${index + 1}`),
      periodLabel: String(item.periodLabel ?? item.periodName ?? item.period?.name ?? 'N/A'),
      grossSalaryPkr: grossSalary,
      deductionsPkr: deductions,
      netSalaryPkr: netSalary,
      status: this.normalizePayslipStatus(item.payslipStatus ?? item.status),
      versionNo: Math.max(1, Math.floor(this.toNumber(item.versionNo ?? item.version ?? 1))),
      payslipUrl: this.normalizePayslipUrl(item.payslipUrl ?? item.payslipurl),
      emailedAt: this.normalizeDateNullable(item.emailedAt ?? item.emailSentAt ?? item.sentAt),
      viewedAt: this.normalizeDateNullable(item.viewedAt),
      updatedAt: this.normalizeDateNullable(item.updatedAt ?? item.modifiedAt ?? item.createdAt)
    };
  }

  private mapPayslipDetail(data: any, fallbackRow: PayslipRow): PayslipViewDialogData {
    const payload = data?.data ?? data ?? {};
    const earningsSource = this.extractItems(payload.earnings ?? payload.earningItems ?? payload.allowances ?? []);
    const deductionsSource = this.extractItems(payload.deductions ?? payload.deductionItems ?? []);
    const employerContributionSource = this.extractItems(payload.employerContributions ?? payload.employerContributionItems ?? []);

    const earnings = earningsSource.length
      ? earningsSource.map((item: any, index: number) => this.mapValueItem(item, index, 'default'))
      : this.getLocalPayslipDetail(fallbackRow).earnings;

    const deductions = deductionsSource.length
      ? deductionsSource.map((item: any, index: number) => this.mapValueItem(item, index, 'danger'))
      : this.getLocalPayslipDetail(fallbackRow).deductions;

    const attendance = payload.attendance ?? payload.attendanceSummary ?? {};
    const ytd = payload.ytd ?? payload.yearToDate ?? {};

    const employeeName = String(payload.employeeName ?? payload.employee?.name ?? fallbackRow.employeeName);

    return {
      payslipId: String(payload.payslipId ?? payload.id ?? fallbackRow.id),
      title: `Payslip - ${fallbackRow.periodLabel}`,
      currencySymbol: this.currencySymbol(),
      periodLabel: String(payload.periodLabel ?? payload.periodName ?? fallbackRow.periodLabel),
      periodStart: String(payload.periodStart ?? payload.startDate ?? `${fallbackRow.periodLabel} start`),
      periodEnd: String(payload.periodEnd ?? payload.endDate ?? `${fallbackRow.periodLabel} end`),
      employeeName,
      employeeCode: String(payload.employeeCode ?? payload.employee?.employeeCode ?? fallbackRow.employeeCode),
      designation: String(payload.designation ?? payload.employee?.designation ?? fallbackRow.designation),
      departmentName: String(payload.departmentName ?? payload.employee?.departmentName ?? fallbackRow.departmentName),
      joiningDate: this.normalizeDateNullable(payload.joiningDate ?? payload.employee?.joiningDate),
      bankName: String(payload.bankName ?? payload.bank?.name ?? 'N/A'),
      bankAccountNo: String(payload.bankAccountNo ?? payload.bank?.accountNo ?? 'N/A'),
      initials: this.toInitials(employeeName),
      earnings,
      deductions,
      attendance: {
        scheduledDays: this.toNumber(attendance.scheduledDays ?? attendance.totalScheduledDays ?? 26),
        presentDays: this.toNumber(attendance.presentDays ?? attendance.totalPresentDays ?? 24),
        absentDays: this.toNumber(attendance.absentDays ?? attendance.totalAbsentDays ?? 1),
        lateCount: this.toNumber(attendance.lateCount ?? attendance.lateDays ?? 0),
        overtimeHours: this.toNumber(attendance.overtimeHours ?? attendance.otHours ?? 0)
      },
      employerContributions: employerContributionSource.length
        ? employerContributionSource.map((item: any, index: number) => this.mapValueItem(item, index, 'primary'))
        : this.getLocalPayslipDetail(fallbackRow).employerContributions,
      ytd: {
        grossPkr: this.toNumber(ytd.grossPkr ?? ytd.grossAmount ?? fallbackRow.grossSalaryPkr * 3),
        taxPkr: this.toNumber(ytd.taxPkr ?? ytd.taxAmount ?? fallbackRow.deductionsPkr * 0.5),
        netPkr: this.toNumber(ytd.netPkr ?? ytd.netAmount ?? fallbackRow.netSalaryPkr * 3)
      },
      netPayablePkr: this.toNumber(payload.netPayablePkr ?? payload.netSalary ?? fallbackRow.netSalaryPkr)
    };
  }

  private mapValueItem(item: any, index: number, fallbackTone: PayslipViewValueItem['tone']): PayslipViewValueItem {
    return {
      label: String(item.label ?? item.componentName ?? item.name ?? `Item ${index + 1}`),
      amount: this.toNumber(item.amount ?? item.value ?? item.totalAmount),
      tone: (item.tone ?? fallbackTone) as PayslipViewValueItem['tone']
    };
  }

  private buildBulkEmailRecipients(): BulkEmailRecipientOption[] {
    const recipients = this.payslips.map((row) => ({
      id: row.employeeId,
      employeeName: row.employeeName,
      employeeEmail: this.findEmployee(row.employeeId)?.email ?? `${row.employeeCode.toLowerCase()}@example.com`,
      payrollPeriodId: row.periodId,
      hasGeneratedPayslip: row.status !== 'draft',
      alreadySent: row.status === 'sent' || row.status === 'viewed',
      status: row.status
    }));

    const uniqueMap = new Map<string, BulkEmailRecipientOption>();

    recipients.forEach((recipient) => {
      const key = `${recipient.id}::${recipient.payrollPeriodId}`;
      const existing = uniqueMap.get(key);

      if (!existing) {
        uniqueMap.set(key, recipient);
        return;
      }

      if (this.statusRank(recipient.status) > this.statusRank(existing.status)) {
        uniqueMap.set(key, recipient);
      }
    });

    return Array.from(uniqueMap.values());
  }

  private getCurrentEmployeeStatus(employeeId: string, periodId: string): BulkGenerateEmployeeStatus {
    if (!periodId) {
      return 'none';
    }

    const row = this.payslips.find((item) => item.employeeId === employeeId && item.periodId === periodId);
    return row?.status ?? 'none';
  }

  private getReissueHistory(row: PayslipRow): ReissueVersionHistoryItem[] {
    const local = this.localReissueHistory.get(row.id);
    if (local?.length) {
      return local;
    }

    const history: ReissueVersionHistoryItem[] = [];
    const safeVersion = Math.max(1, row.versionNo);

    for (let versionNo = safeVersion; versionNo >= 1; versionNo--) {
      history.push({
        versionNo,
        status: versionNo === safeVersion ? row.status : 'sent',
        issuedAt: row.updatedAt ?? this.getTodayIsoDate()
      });
    }

    this.localReissueHistory.set(row.id, history);
    return history;
  }

  private getLocalPayslipDetail(row: PayslipRow): PayslipViewDialogData {
    const existing = this.localPayslipDetails.get(row.id);
    if (existing) {
      return existing;
    }

    const created = this.buildLocalPayslipDetail(row);
    this.localPayslipDetails.set(row.id, created);
    return created;
  }

  private buildLocalPayslipDetail(row: PayslipRow): PayslipViewDialogData {
    const basic = Math.round(row.grossSalaryPkr * 0.73);
    const houseRent = Math.round(row.grossSalaryPkr * 0.15);
    const medical = Math.round(row.grossSalaryPkr * 0.05);
    const conveyance = Math.round(row.grossSalaryPkr * 0.03);
    const overtime = Math.max(0, row.grossSalaryPkr - (basic + houseRent + medical + conveyance));

    const incomeTax = Math.round(row.deductionsPkr * 0.27);
    const pf = Math.round(row.deductionsPkr * 0.21);
    const ss = Math.round(row.deductionsPkr * 0.07);
    const loan = Math.min(10000, Math.round(row.deductionsPkr * 0.3));
    const advance = Math.round(row.deductionsPkr * 0.12);
    const absentAndOther = Math.max(0, row.deductionsPkr - (incomeTax + pf + ss + loan + advance));

    return {
      payslipId: row.id,
      title: `Payslip - ${row.periodLabel}`,
      currencySymbol: this.currencySymbol(),
      periodLabel: row.periodLabel,
      periodStart: 'Mar 1, 2025',
      periodEnd: 'Mar 31, 2025',
      employeeName: row.employeeName,
      employeeCode: row.employeeCode,
      designation: row.designation,
      departmentName: row.departmentName,
      joiningDate: 'Jan 15, 2022',
      bankName: 'HBL',
      bankAccountNo: '1234-5678-9',
      initials: this.toInitials(row.employeeName),
      earnings: [
        { label: 'Basic salary', amount: basic },
        { label: 'House rent', amount: houseRent },
        { label: 'Medical', amount: medical },
        { label: 'Conveyance', amount: conveyance },
        { label: 'Overtime', amount: overtime },
        { label: 'Eid bonus', amount: 0, tone: 'primary' }
      ],
      deductions: [
        { label: 'Absent', amount: absentAndOther, tone: 'danger' },
        { label: 'Loan deduction', amount: loan, tone: 'danger' },
        { label: 'Salary advance', amount: advance, tone: 'danger' },
        { label: 'Income tax', amount: incomeTax, tone: 'danger' },
        { label: 'PF', amount: pf, tone: 'danger' },
        { label: 'SS', amount: ss, tone: 'danger' }
      ],
      attendance: {
        scheduledDays: 26,
        presentDays: 24,
        absentDays: 1,
        lateCount: 2,
        overtimeHours: 3.5
      },
      employerContributions: [
        { label: 'PF employer', amount: pf, tone: 'primary' },
        { label: 'SS employer', amount: ss, tone: 'primary' }
      ],
      ytd: {
        grossPkr: row.grossSalaryPkr * 3,
        taxPkr: incomeTax * 3,
        netPkr: row.netSalaryPkr * 3
      },
      netPayablePkr: row.netSalaryPkr
    };
  }

  private findEmployee(employeeId: string): EmployeeOption | null {
    return this.employees.find((employee) => employee.id === employeeId) ?? null;
  }

  private getPeriodLabelById(periodId: string): string {
    return this.periods.find((period) => period.id === periodId)?.label ?? 'N/A';
  }

  private refreshDepartmentOptions(): void {
    // No longer needed as we load full department list from API
  }

  private ensureDefaultPeriodSelection(): void {
    if (this.appliedPeriodId) {
      return;
    }

    const firstFromRows = this.payslips[0]?.periodId;
    if (firstFromRows) {
      this.pendingPeriodId = firstFromRows;
      this.appliedPeriodId = firstFromRows;
      return;
    }

    if (this.periods[0]?.id) {
      this.pendingPeriodId = this.periods[0].id;
      this.appliedPeriodId = this.periods[0].id;
    }
  }

  private ensurePageInRange(): void {
    const maxPage = Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }
  }

  private reconcileSelection(): void {
    const visibleIds = new Set(this.pagedPayslips.map((row) => row.id));

    Array.from(this.selectedPayslipIds).forEach((id) => {
      if (!visibleIds.has(id)) {
        this.selectedPayslipIds.delete(id);
      }
    });
  }

  private activateLocalPayslipFallback(): void {
    if (!this.usingLocalPayslipData && this.payslips.length) {
      this.localPayslipSeed = this.payslips.map((row) => ({ ...row }));
    }

    this.usingLocalPayslipData = true;
    this.usingLocalPayslipDetailData = true;
    this.loadPayslips();
    this.loadStats();
  }

  private normalizePayslipStatus(value: unknown): PayslipStatus {
    const status = String(value ?? '').trim().toLowerCase();

    if (status === 'viewed' || status === 'seen') return 'viewed';
    if (status === 'bounced') return 'bounced';
    if (status === 'failed') return 'failed';
    if (status === 'sent' || status === 'emailed' || status === 'email-sent') return 'sent';
    if (status === 'generated' || status === 'processed' || status === 'pending') return 'generated';
    return 'draft';
  }

  private normalizeDateNullable(value: unknown): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private extractItems(data: any): any[] {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.items)) {
      return data.items;
    }

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    if (Array.isArray(data?.records)) {
      return data.records;
    }

    return [];
  }

  private isUnsupportedEndpointError(error: any): boolean {
    const status = Number(error?.status ?? 0);
    return status === 0 || status === 404 || status === 405 || status === 501;
  }

  private estimateSalary(seed: string): { gross: number; deductions: number; net: number } {
    const hash = this.hashNumber(seed);
    const gross = 55000 + (hash % 85000);
    const deductions = Math.max(4500, Math.round(gross * (0.14 + (hash % 11) / 100)));
    const net = Math.max(0, gross - deductions);

    return {
      gross,
      deductions,
      net
    };
  }

  private hashNumber(seed: string): number {
    let hash = 0;

    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }

    return Math.abs(hash);
  }

  private statusRank(status: PayslipStatus | BulkEmailRecipientStatus): number {
    if (status === 'none') return 0;
    if (status === 'viewed') return 5;
    if (status === 'sent') return 4;
    if (status === 'bounced') return 3;
    if (status === 'failed') return 3;
    if (status === 'generated') return 2;
    return 1;
  }

  private toInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? '')
      .join('') || 'NA';
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getTodayIsoDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private resolvePayslipOpenUrl(payslipUrl: string | null | undefined): string | null {
    const raw = String(payslipUrl ?? '').trim();
    if (!raw) {
      return null;
    }

    if (/^https?:\/\//i.test(raw)) {
      return raw;
    }

    if (raw.startsWith('/')) {
      const apiBase = environment.apiUrl.replace(/\/api\/?$/i, '');
      return `${apiBase}${raw}`;
    }

    return null;
  }

  private normalizePayslipUrl(value: unknown): string | null {
    const raw = String(value ?? '').trim();
    return raw || null;
  }

  private downloadPayslipPdf(payslipId: string): void {
    if (this.usingLocalPayslipData) {
      return;
    }

    const row = this.payslips.find((item) => item.id === payslipId);
    const directUrl = row ? this.resolvePayslipOpenUrl(row.payslipUrl) : null;
    if (directUrl) {
      const anchor = document.createElement('a');
      anchor.href = directUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.download = `payslip-${payslipId}.pdf`;
      anchor.click();
      return;
    }

    this.payrollService.getCompliancePayslipPdfBlob(payslipId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `payslip-${payslipId}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        window.alert('Unable to download payslip PDF.');
      }
    });
  }

  private buildLocalPeriods(): PeriodOption[] {
    return [
      { id: 'period-2025-03', label: 'March 2025' },
      { id: 'period-2025-02', label: 'February 2025' },
      { id: 'period-2025-01', label: 'January 2025' }
    ];
  }

  private buildLocalPayslipSeed(): PayslipRow[] {
    return [
      {
        id: 'pay-001',
        employeeId: 'emp-8821',
        employeeName: 'Ali Hassan',
        employeeCode: 'EMP-8821',
        designation: 'Software Engineer',
        departmentId: 'dept-eng',
        departmentName: 'Engineering',
        periodId: 'period-2025-03',
        periodLabel: 'Mar 2025',
        grossSalaryPkr: 105000,
        deductionsPkr: 18400,
        netSalaryPkr: 86600,
        status: 'sent',
        versionNo: 1,
        payslipUrl: null,
        emailedAt: '2025-03-31',
        viewedAt: null,
        updatedAt: '2025-03-31'
      },
      {
        id: 'pay-002',
        employeeId: 'emp-8822',
        employeeName: 'Sara Ahmed',
        employeeCode: 'EMP-8822',
        designation: 'HR Executive',
        departmentId: 'dept-hr',
        departmentName: 'Human Resources',
        periodId: 'period-2025-03',
        periodLabel: 'Mar 2025',
        grossSalaryPkr: 92000,
        deductionsPkr: 14200,
        netSalaryPkr: 77800,
        status: 'sent',
        versionNo: 1,
        payslipUrl: null,
        emailedAt: '2025-03-31',
        viewedAt: null,
        updatedAt: '2025-03-31'
      },
      {
        id: 'pay-003',
        employeeId: 'emp-8823',
        employeeName: 'Usman Khan',
        employeeCode: 'EMP-8823',
        designation: 'Product Analyst',
        departmentId: 'dept-prod',
        departmentName: 'Product',
        periodId: 'period-2025-03',
        periodLabel: 'Mar 2025',
        grossSalaryPkr: 121000,
        deductionsPkr: 22100,
        netSalaryPkr: 98900,
        status: 'viewed',
        versionNo: 2,
        payslipUrl: null,
        emailedAt: '2025-03-31',
        viewedAt: '2025-04-01',
        updatedAt: '2025-04-01'
      },
      {
        id: 'pay-004',
        employeeId: 'emp-8824',
        employeeName: 'Fatima Malik',
        employeeCode: 'EMP-8824',
        designation: 'Accountant',
        departmentId: 'dept-fin',
        departmentName: 'Finance',
        periodId: 'period-2025-03',
        periodLabel: 'Mar 2025',
        grossSalaryPkr: 72000,
        deductionsPkr: 9800,
        netSalaryPkr: 62200,
        status: 'generated',
        versionNo: 1,
        payslipUrl: null,
        emailedAt: null,
        viewedAt: null,
        updatedAt: '2025-03-30'
      },
      {
        id: 'pay-005',
        employeeId: 'emp-8825',
        employeeName: 'Bilal Raza',
        employeeCode: 'EMP-8825',
        designation: 'Sales Executive',
        departmentId: 'dept-sales',
        departmentName: 'Sales',
        periodId: 'period-2025-03',
        periodLabel: 'Mar 2025',
        grossSalaryPkr: 60500,
        deductionsPkr: 8200,
        netSalaryPkr: 52300,
        status: 'generated',
        versionNo: 1,
        payslipUrl: null,
        emailedAt: null,
        viewedAt: null,
        updatedAt: '2025-03-30'
      },
      {
        id: 'pay-006',
        employeeId: 'emp-8826',
        employeeName: 'Nadia Qureshi',
        employeeCode: 'EMP-8826',
        designation: 'Operations Associate',
        departmentId: 'dept-ops',
        departmentName: 'Operations',
        periodId: 'period-2025-03',
        periodLabel: 'Mar 2025',
        grossSalaryPkr: 77000,
        deductionsPkr: 11500,
        netSalaryPkr: 65500,
        status: 'sent',
        versionNo: 2,
        payslipUrl: null,
        emailedAt: '2025-03-31',
        viewedAt: null,
        updatedAt: '2025-03-31'
      },
      {
        id: 'pay-007',
        employeeId: 'emp-8827',
        employeeName: 'Kamran Tariq',
        employeeCode: 'EMP-8827',
        designation: 'Junior Analyst',
        departmentId: 'dept-prod',
        departmentName: 'Product',
        periodId: 'period-2025-03',
        periodLabel: 'Mar 2025',
        grossSalaryPkr: 0,
        deductionsPkr: 0,
        netSalaryPkr: 0,
        status: 'draft',
        versionNo: 1,
        payslipUrl: null,
        emailedAt: null,
        viewedAt: null,
        updatedAt: '2025-03-28'
      }
    ];
  }
}
