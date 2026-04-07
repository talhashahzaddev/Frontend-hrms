import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs';

import { SettingsService } from '../../../settings/services/settings.service';
import { PayrollService } from '../../services/payroll.service';
import {
  AddTaxSlabDialogComponent,
  TaxSlabDialogPayload,
  TaxSlabStatus
} from '../dialogs/add-tax-slab-dialog/add-tax-slab-dialog.component';
import {
  AddSocialSecurityConfigDialogComponent,
  SocialSecurityConfigDialogPayload,
  SocialSecurityConfigStatus
} from '../dialogs/add-social-security-config-dialog/add-social-security-config-dialog.component';
import {
  AddGratuityConfigDialogComponent,
  GratuityCalculationType,
  GratuityConfigDialogPayload,
  GratuityConfigStatus
} from '../dialogs/add-gratuity-config-dialog/add-gratuity-config-dialog.component';
import {
  AddGratuityRecordDialogComponent,
  GratuityEmployeeOption,
  GratuityRecordDialogPayload,
  GratuityRecordStatus
} from '../dialogs/add-gratuity-record-dialog/add-gratuity-record-dialog.component';
import { DeleteActionDialogComponent } from '../dialogs/delete-action-dialog/delete-action-dialog.component';

type ComplianceTab = 'tax-slabs' | 'social-security' | 'gratuity';
type GratuityView = 'dashboard' | 'configurations';

interface TaxSlabRow {
  id: string;
  slabName: string;
  fiscalYear: string;
  minIncomePkr: number;
  maxIncomePkr: number | null;
  fixedAmountPkr: number;
  percentage: number;
  status: TaxSlabStatus;
}

interface TaxTransactionRow {
  id: string;
  employeeId: string;
  employeeName: string;
  annualSalary: number;
  taxableIncome: number;
  slabApplied: string;
  taxPercent: number;
  taxAmount: number;
  periodLabel: string;
}

interface SocialSecurityConfigRow {
  id: string;
  configName: string;
  employeeContributionPct: number;
  employerContributionPct: number;
  maxSalaryCapPkr: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: SocialSecurityConfigStatus;
}

interface SocialSecurityTransactionRow {
  id: string;
  employeeId: string;
  employeeName: string;
  actualSalary: number;
  cappedSalary: number;
  employeeShare: number;
  employerShare: number;
  totalContribution: number;
  periodLabel: string;
}

interface GratuityConfigRow {
  id: string;
  configName: string;
  calculationType: GratuityCalculationType;
  value: number;
  minYearsRequired: number;
  status: GratuityConfigStatus;
  effectiveSince: string;
}

interface GratuityTransactionRow {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  yearsWorked: number;
  lastSalary: number;
  gratuityAmount: number;
  status: GratuityRecordStatus;
  paidDate: string | null;
}

@Component({
  selector: 'app-loan-request-compliance',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './loan-request-compliance.component.html',
  styleUrl: './loan-request-compliance.component.scss'
})
export class LoanRequestComplianceComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly settingsService = inject(SettingsService);

  activeTab: ComplianceTab = 'tax-slabs';
  gratuityView: GratuityView = 'dashboard';

  currencySymbol = 'PKR';
  fiscalYears = ['2023-2024', '2024-2025', '2025-2026'];

  selectedFiscalYear = '2024-2025';
  selectedTaxPeriod = '';
  selectedSocialPeriod = '';
  gratuityStatusFilter: GratuityRecordStatus | '' = '';

  taxSlabs: TaxSlabRow[] = [];
  taxTransactions: TaxTransactionRow[] = [];
  socialSecurityConfigs: SocialSecurityConfigRow[] = [];
  socialSecurityTransactions: SocialSecurityTransactionRow[] = [];
  gratuityConfigs: GratuityConfigRow[] = [];
  gratuityTransactions: GratuityTransactionRow[] = [];

  private localTaxSlabSeed: TaxSlabRow[] = [];
  private localTaxTransactionSeed: TaxTransactionRow[] = [];
  private localSocialConfigSeed: SocialSecurityConfigRow[] = [];
  private localSocialTransactionSeed: SocialSecurityTransactionRow[] = [];
  private localGratuityConfigSeed: GratuityConfigRow[] = [];
  private localGratuityTransactionSeed: GratuityTransactionRow[] = [];

  usingLocalTaxSlabs = false;
  usingLocalTaxTransactions = false;
  usingLocalSocialConfigs = false;
  usingLocalSocialTransactions = false;
  usingLocalGratuityConfigs = false;
  usingLocalGratuityTransactions = false;

  ngOnInit(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode: any) => {
          this.currencySymbol = this.settingsService.getCurrencySymbol(currencyCode) || 'PKR';
        },
        error: () => {
          this.currencySymbol = this.settingsService.getCurrencySymbol() || 'PKR';
        }
      });

    this.localTaxSlabSeed = this.buildLocalTaxSlabs();
    this.localTaxTransactionSeed = this.buildLocalTaxTransactions();
    this.localSocialConfigSeed = this.buildLocalSocialConfigs();
    this.localSocialTransactionSeed = this.buildLocalSocialTransactions();
    this.localGratuityConfigSeed = this.buildLocalGratuityConfigs();
    this.localGratuityTransactionSeed = this.buildLocalGratuityTransactions();

    this.loadTaxSlabs();
    this.loadTaxTransactions();
    this.loadSocialSecurityConfigs();
    this.loadSocialSecurityTransactions();
    this.loadGratuityConfigs();
    this.loadGratuityTransactions();
  }

  get hasFallbackNotice(): boolean {
    return this.usingLocalTaxSlabs
      || this.usingLocalTaxTransactions
      || this.usingLocalSocialConfigs
      || this.usingLocalSocialTransactions
      || this.usingLocalGratuityConfigs
      || this.usingLocalGratuityTransactions;
  }

  get taxSlabCount(): number {
    return this.visibleTaxSlabs.length;
  }

  get socialSecurityConfigCount(): number {
    return this.socialSecurityConfigs.length;
  }

  get gratuityConfigCount(): number {
    return this.gratuityConfigs.length;
  }

  get activeFiscalYear(): string {
    return this.selectedFiscalYear;
  }

  get totalTaxCollected(): number {
    return this.visibleTaxTransactions.reduce((sum, row) => sum + row.taxAmount, 0);
  }

  get employeesTaxedCount(): number {
    return new Set(this.visibleTaxTransactions.map((row) => row.employeeId)).size;
  }

  get activeSocialConfig(): SocialSecurityConfigRow | null {
    return this.socialSecurityConfigs.find((row) => row.status === 'active') ?? null;
  }

  get totalSocialContribution(): number {
    return this.visibleSocialTransactions.reduce((sum, row) => sum + row.totalContribution, 0);
  }

  get gratuityActiveConfig(): GratuityConfigRow | null {
    return this.gratuityConfigs.find((row) => row.status === 'active') ?? null;
  }

  get gratuityLiability(): number {
    return this.gratuityTransactions
      .filter((row) => row.status !== 'paid')
      .reduce((sum, row) => sum + row.gratuityAmount, 0);
  }

  get visibleTaxSlabs(): TaxSlabRow[] {
    return this.taxSlabs.filter((row) => row.fiscalYear === this.selectedFiscalYear);
  }

  get taxPeriods(): string[] {
    return this.uniqueLabels(this.taxTransactions.map((row) => row.periodLabel));
  }

  get socialPeriods(): string[] {
    return this.uniqueLabels(this.socialSecurityTransactions.map((row) => row.periodLabel));
  }

  get visibleTaxTransactions(): TaxTransactionRow[] {
    if (!this.selectedTaxPeriod) {
      return this.taxTransactions;
    }

    return this.taxTransactions.filter((row) => row.periodLabel === this.selectedTaxPeriod);
  }

  get visibleSocialTransactions(): SocialSecurityTransactionRow[] {
    if (!this.selectedSocialPeriod) {
      return this.socialSecurityTransactions;
    }

    return this.socialSecurityTransactions.filter((row) => row.periodLabel === this.selectedSocialPeriod);
  }

  get visibleGratuityTransactions(): GratuityTransactionRow[] {
    if (!this.gratuityStatusFilter) {
      return this.gratuityTransactions;
    }

    return this.gratuityTransactions.filter((row) => row.status === this.gratuityStatusFilter);
  }

  get gratuityEmployeeOptions(): GratuityEmployeeOption[] {
    const optionMap = new Map<string, GratuityEmployeeOption>();

    this.gratuityTransactions.forEach((row) => {
      optionMap.set(row.employeeId, {
        id: row.employeeId,
        name: row.employeeName,
        designation: row.designation
      });
    });

    if (!optionMap.size) {
      optionMap.set('emp-001', { id: 'emp-001', name: 'Ali Hassan', designation: 'Senior Engineer' });
      optionMap.set('emp-002', { id: 'emp-002', name: 'Sara Ahmed', designation: 'Project Manager' });
      optionMap.set('emp-003', { id: 'emp-003', name: 'Usman Khan', designation: 'Associate Designer' });
    }

    return Array.from(optionMap.values());
  }

  setTab(tab: ComplianceTab): void {
    this.activeTab = tab;
  }

  setGratuityView(view: GratuityView): void {
    this.gratuityView = view;
  }

  onFiscalYearChange(): void {
    this.loadTaxSlabs();
  }

  openAddTaxSlabDialog(editing?: TaxSlabRow): void {
    const dialogRef = this.dialog.open(AddTaxSlabDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'tax-slab-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: editing ? 'edit' : 'create',
        fiscalYears: this.fiscalYears,
        initialValue: editing
      }
    });

    dialogRef.afterClosed().subscribe((result: TaxSlabDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.saveTaxSlab(result, editing);
    });
  }

  openAddSocialConfigDialog(editing?: SocialSecurityConfigRow): void {
    const dialogRef = this.dialog.open(AddSocialSecurityConfigDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'social-security-config-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: editing ? 'edit' : 'create',
        initialValue: editing
      }
    });

    dialogRef.afterClosed().subscribe((result: SocialSecurityConfigDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.saveSocialConfig(result, editing);
    });
  }

  openAddGratuityConfigDialog(editing?: GratuityConfigRow): void {
    const dialogRef = this.dialog.open(AddGratuityConfigDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'gratuity-config-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: editing ? 'edit' : 'create',
        initialValue: editing
      }
    });

    dialogRef.afterClosed().subscribe((result: GratuityConfigDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.saveGratuityConfig(result, editing);
    });
  }

  openAddGratuityRecordDialog(editing?: GratuityTransactionRow): void {
    const dialogRef = this.dialog.open(AddGratuityRecordDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'gratuity-record-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: editing ? 'edit' : 'create',
        employees: this.gratuityEmployeeOptions,
        initialValue: editing
      }
    });

    dialogRef.afterClosed().subscribe((result: GratuityRecordDialogPayload | undefined) => {
      if (!result) {
        return;
      }

      this.saveGratuityRecord(result, editing);
    });
  }

  confirmDeleteTaxSlab(row: TaxSlabRow): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete tax slab',
        message: `Delete ${row.slabName}? This action cannot be undone.`,
        confirmText: 'Delete slab'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        this.deleteTaxSlab(row);
      }
    });
  }

  confirmDeleteSocialConfig(row: SocialSecurityConfigRow): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete social security config',
        message: `Delete ${row.configName}? This action cannot be undone.`,
        confirmText: 'Delete config'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        this.deleteSocialConfig(row);
      }
    });
  }

  confirmDeleteGratuityConfig(row: GratuityConfigRow): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete gratuity config',
        message: `Delete ${row.configName}? This action cannot be undone.`,
        confirmText: 'Delete config'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        this.deleteGratuityConfig(row);
      }
    });
  }

  confirmDeleteGratuityRecord(row: GratuityTransactionRow): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete gratuity record',
        message: `Delete record for ${row.employeeName}? This action cannot be undone.`,
        confirmText: 'Delete record'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        this.deleteGratuityRecord(row);
      }
    });
  }

  getSlabStatusClass(status: TaxSlabStatus): string {
    return status === 'active' ? 'status-active' : 'status-inactive';
  }

  getConfigStatusClass(status: SocialSecurityConfigStatus | GratuityConfigStatus): string {
    return status === 'active' ? 'status-active' : 'status-inactive';
  }

  getGratuityStatusClass(status: GratuityRecordStatus): string {
    if (status === 'paid') return 'status-paid';
    if (status === 'approved') return 'status-approved';
    return 'status-calculated';
  }

  formatMoney(value: number): string {
    return `${this.currencySymbol} ${Math.max(0, Number(value ?? 0)).toLocaleString()}`;
  }

  formatDateLabel(dateValue: string | null): string {
    if (!dateValue) {
      return '-';
    }

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return parsed.toLocaleDateString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  }

  private loadTaxSlabs(): void {
    if (this.usingLocalTaxSlabs) {
      this.taxSlabs = [...this.localTaxSlabSeed];
      return;
    }

    this.payrollService.getTaxSlabs({ page: 1, pageSize: 500 }).subscribe({
      next: (data: any) => {
        const rows = this.extractItems(data).map((item: any, index: number) => this.mapTaxSlab(item, index));
        this.taxSlabs = rows;
      },
      error: (error: any) => {
        if (this.isUnsupportedEndpointError(error)) {
          this.usingLocalTaxSlabs = true;
          this.taxSlabs = [...this.localTaxSlabSeed];
          return;
        }

        this.taxSlabs = [];
      }
    });
  }

  private loadTaxTransactions(): void {
    if (this.usingLocalTaxTransactions) {
      this.taxTransactions = [...this.localTaxTransactionSeed];
      this.ensureSelectedPeriods();
      return;
    }

    this.payrollService.getTaxTransactions({ page: 1, pageSize: 500 }).subscribe({
      next: (data: any) => {
        const rows = this.extractItems(data).map((item: any, index: number) => this.mapTaxTransaction(item, index));
        this.taxTransactions = rows;
        this.ensureSelectedPeriods();
      },
      error: (error: any) => {
        if (this.isUnsupportedEndpointError(error)) {
          this.usingLocalTaxTransactions = true;
          this.taxTransactions = [...this.localTaxTransactionSeed];
          this.ensureSelectedPeriods();
          return;
        }

        this.taxTransactions = [];
      }
    });
  }

  private loadSocialSecurityConfigs(): void {
    if (this.usingLocalSocialConfigs) {
      this.socialSecurityConfigs = [...this.localSocialConfigSeed];
      return;
    }

    this.payrollService.getSocialSecurityConfigs({ page: 1, pageSize: 200 }).subscribe({
      next: (data: any) => {
        const rows = this.extractItems(data).map((item: any, index: number) => this.mapSocialConfig(item, index));
        this.socialSecurityConfigs = rows;
      },
      error: (error: any) => {
        if (this.isUnsupportedEndpointError(error)) {
          this.usingLocalSocialConfigs = true;
          this.socialSecurityConfigs = [...this.localSocialConfigSeed];
          return;
        }

        this.socialSecurityConfigs = [];
      }
    });
  }

  private loadSocialSecurityTransactions(): void {
    if (this.usingLocalSocialTransactions) {
      this.socialSecurityTransactions = [...this.localSocialTransactionSeed];
      this.ensureSelectedPeriods();
      return;
    }

    this.payrollService.getSocialSecurityTransactions({ page: 1, pageSize: 500 }).subscribe({
      next: (data: any) => {
        const rows = this.extractItems(data).map((item: any, index: number) => this.mapSocialTransaction(item, index));
        this.socialSecurityTransactions = rows;
        this.ensureSelectedPeriods();
      },
      error: (error: any) => {
        if (this.isUnsupportedEndpointError(error)) {
          this.usingLocalSocialTransactions = true;
          this.socialSecurityTransactions = [...this.localSocialTransactionSeed];
          this.ensureSelectedPeriods();
          return;
        }

        this.socialSecurityTransactions = [];
      }
    });
  }

  private loadGratuityConfigs(): void {
    if (this.usingLocalGratuityConfigs) {
      this.gratuityConfigs = [...this.localGratuityConfigSeed];
      return;
    }

    this.payrollService.getGratuityConfigs({ page: 1, pageSize: 200 }).subscribe({
      next: (data: any) => {
        const rows = this.extractItems(data).map((item: any, index: number) => this.mapGratuityConfig(item, index));
        this.gratuityConfigs = rows;
      },
      error: (error: any) => {
        if (this.isUnsupportedEndpointError(error)) {
          this.usingLocalGratuityConfigs = true;
          this.gratuityConfigs = [...this.localGratuityConfigSeed];
          return;
        }

        this.gratuityConfigs = [];
      }
    });
  }

  private loadGratuityTransactions(): void {
    if (this.usingLocalGratuityTransactions) {
      this.gratuityTransactions = [...this.localGratuityTransactionSeed];
      return;
    }

    this.payrollService.getGratuityTransactions({ page: 1, pageSize: 500 }).subscribe({
      next: (data: any) => {
        const rows = this.extractItems(data).map((item: any, index: number) => this.mapGratuityTransaction(item, index));
        this.gratuityTransactions = rows;
      },
      error: (error: any) => {
        if (this.isUnsupportedEndpointError(error)) {
          this.usingLocalGratuityTransactions = true;
          this.gratuityTransactions = [...this.localGratuityTransactionSeed];
          return;
        }

        this.gratuityTransactions = [];
      }
    });
  }

  private saveTaxSlab(payload: TaxSlabDialogPayload, editing?: TaxSlabRow): void {
    const requestPayload = {
      slabName: payload.slabName,
      fiscalYear: payload.fiscalYear,
      status: payload.status,
      minIncomePkr: Number(payload.minIncomePkr),
      maxIncomePkr: payload.maxIncomePkr == null ? null : Number(payload.maxIncomePkr),
      fixedAmountPkr: Number(payload.fixedAmountPkr),
      percentage: Number(payload.percentage)
    };

    if (this.usingLocalTaxSlabs) {
      this.saveLocalTaxSlab(payload, editing);
      return;
    }

    if (editing) {
      this.payrollService.updateTaxSlab(editing.id, requestPayload).subscribe({
        next: () => this.loadTaxSlabs(),
        error: () => {
          this.usingLocalTaxSlabs = true;
          this.saveLocalTaxSlab(payload, editing);
        }
      });
      return;
    }

    this.payrollService.createTaxSlab(requestPayload).subscribe({
      next: () => this.loadTaxSlabs(),
      error: () => {
        this.usingLocalTaxSlabs = true;
        this.saveLocalTaxSlab(payload);
      }
    });
  }

  private saveSocialConfig(payload: SocialSecurityConfigDialogPayload, editing?: SocialSecurityConfigRow): void {
    const requestPayload = {
      configName: payload.configName,
      employeeContributionPct: Number(payload.employeeContributionPct),
      employerContributionPct: Number(payload.employerContributionPct),
      maxSalaryCapPkr: Number(payload.maxSalaryCapPkr),
      effectiveFrom: payload.effectiveFrom,
      effectiveTo: payload.effectiveTo,
      status: payload.status
    };

    if (this.usingLocalSocialConfigs) {
      this.saveLocalSocialConfig(payload, editing);
      return;
    }

    if (editing) {
      this.payrollService.updateSocialSecurityConfig(editing.id, requestPayload).subscribe({
        next: () => this.loadSocialSecurityConfigs(),
        error: () => {
          this.usingLocalSocialConfigs = true;
          this.saveLocalSocialConfig(payload, editing);
        }
      });
      return;
    }

    this.payrollService.createSocialSecurityConfig(requestPayload).subscribe({
      next: () => this.loadSocialSecurityConfigs(),
      error: () => {
        this.usingLocalSocialConfigs = true;
        this.saveLocalSocialConfig(payload);
      }
    });
  }

  private saveGratuityConfig(payload: GratuityConfigDialogPayload, editing?: GratuityConfigRow): void {
    const requestPayload = {
      configName: payload.configName,
      calculationType: payload.calculationType,
      value: Number(payload.value),
      minYearsRequired: Number(payload.minYearsRequired),
      status: payload.status
    };

    if (this.usingLocalGratuityConfigs) {
      this.saveLocalGratuityConfig(payload, editing);
      return;
    }

    if (editing) {
      this.payrollService.updateGratuityConfig(editing.id, requestPayload).subscribe({
        next: () => this.loadGratuityConfigs(),
        error: () => {
          this.usingLocalGratuityConfigs = true;
          this.saveLocalGratuityConfig(payload, editing);
        }
      });
      return;
    }

    this.payrollService.createGratuityConfig(requestPayload).subscribe({
      next: () => this.loadGratuityConfigs(),
      error: () => {
        this.usingLocalGratuityConfigs = true;
        this.saveLocalGratuityConfig(payload);
      }
    });
  }

  private saveGratuityRecord(payload: GratuityRecordDialogPayload, editing?: GratuityTransactionRow): void {
    const employee = this.gratuityEmployeeOptions.find((row) => row.id === payload.employeeId);

    const requestPayload = {
      employeeId: payload.employeeId,
      yearsWorked: Number(payload.yearsWorked),
      lastSalary: Number(payload.lastSalary),
      gratuityAmount: Number(payload.gratuityAmount),
      status: payload.status,
      paidDate: payload.paidDate
    };

    if (this.usingLocalGratuityTransactions) {
      this.saveLocalGratuityRecord(payload, employee?.name ?? 'Employee', employee?.designation ?? 'Employee', editing);
      return;
    }

    if (editing) {
      this.payrollService.updateGratuityTransaction(editing.id, requestPayload).subscribe({
        next: () => this.loadGratuityTransactions(),
        error: () => {
          this.usingLocalGratuityTransactions = true;
          this.saveLocalGratuityRecord(payload, employee?.name ?? editing.employeeName, employee?.designation ?? editing.designation, editing);
        }
      });
      return;
    }

    this.payrollService.createGratuityTransaction(requestPayload).subscribe({
      next: () => this.loadGratuityTransactions(),
      error: () => {
        this.usingLocalGratuityTransactions = true;
        this.saveLocalGratuityRecord(payload, employee?.name ?? 'Employee', employee?.designation ?? 'Employee');
      }
    });
  }

  private deleteTaxSlab(row: TaxSlabRow): void {
    if (this.usingLocalTaxSlabs) {
      this.localTaxSlabSeed = this.localTaxSlabSeed.filter((item) => item.id !== row.id);
      this.taxSlabs = [...this.localTaxSlabSeed];
      return;
    }

    this.payrollService.deleteTaxSlab(row.id).subscribe({
      next: () => this.loadTaxSlabs(),
      error: () => {
        this.usingLocalTaxSlabs = true;
        this.localTaxSlabSeed = this.localTaxSlabSeed.filter((item) => item.id !== row.id);
        this.taxSlabs = [...this.localTaxSlabSeed];
      }
    });
  }

  private deleteSocialConfig(row: SocialSecurityConfigRow): void {
    if (this.usingLocalSocialConfigs) {
      this.localSocialConfigSeed = this.localSocialConfigSeed.filter((item) => item.id !== row.id);
      this.socialSecurityConfigs = [...this.localSocialConfigSeed];
      return;
    }

    this.payrollService.deleteSocialSecurityConfig(row.id).subscribe({
      next: () => this.loadSocialSecurityConfigs(),
      error: () => {
        this.usingLocalSocialConfigs = true;
        this.localSocialConfigSeed = this.localSocialConfigSeed.filter((item) => item.id !== row.id);
        this.socialSecurityConfigs = [...this.localSocialConfigSeed];
      }
    });
  }

  private deleteGratuityConfig(row: GratuityConfigRow): void {
    if (this.usingLocalGratuityConfigs) {
      this.localGratuityConfigSeed = this.localGratuityConfigSeed.filter((item) => item.id !== row.id);
      this.gratuityConfigs = [...this.localGratuityConfigSeed];
      return;
    }

    this.payrollService.deleteGratuityConfig(row.id).subscribe({
      next: () => this.loadGratuityConfigs(),
      error: () => {
        this.usingLocalGratuityConfigs = true;
        this.localGratuityConfigSeed = this.localGratuityConfigSeed.filter((item) => item.id !== row.id);
        this.gratuityConfigs = [...this.localGratuityConfigSeed];
      }
    });
  }

  private deleteGratuityRecord(row: GratuityTransactionRow): void {
    if (this.usingLocalGratuityTransactions) {
      this.localGratuityTransactionSeed = this.localGratuityTransactionSeed.filter((item) => item.id !== row.id);
      this.gratuityTransactions = [...this.localGratuityTransactionSeed];
      return;
    }

    this.payrollService.deleteGratuityTransaction(row.id).subscribe({
      next: () => this.loadGratuityTransactions(),
      error: () => {
        this.usingLocalGratuityTransactions = true;
        this.localGratuityTransactionSeed = this.localGratuityTransactionSeed.filter((item) => item.id !== row.id);
        this.gratuityTransactions = [...this.localGratuityTransactionSeed];
      }
    });
  }

  private saveLocalTaxSlab(payload: TaxSlabDialogPayload, editing?: TaxSlabRow): void {
    const nextRow: TaxSlabRow = {
      id: editing?.id ?? `local-tax-slab-${Date.now()}`,
      slabName: payload.slabName,
      fiscalYear: payload.fiscalYear,
      status: payload.status,
      minIncomePkr: Number(payload.minIncomePkr),
      maxIncomePkr: payload.maxIncomePkr == null ? null : Number(payload.maxIncomePkr),
      fixedAmountPkr: Number(payload.fixedAmountPkr),
      percentage: Number(payload.percentage)
    };

    if (editing) {
      this.localTaxSlabSeed = this.localTaxSlabSeed.map((row) => row.id === editing.id ? nextRow : row);
    } else {
      this.localTaxSlabSeed = [nextRow, ...this.localTaxSlabSeed];
    }

    this.taxSlabs = [...this.localTaxSlabSeed];
  }

  private saveLocalSocialConfig(payload: SocialSecurityConfigDialogPayload, editing?: SocialSecurityConfigRow): void {
    const nextRow: SocialSecurityConfigRow = {
      id: editing?.id ?? `local-social-config-${Date.now()}`,
      configName: payload.configName,
      employeeContributionPct: Number(payload.employeeContributionPct),
      employerContributionPct: Number(payload.employerContributionPct),
      maxSalaryCapPkr: Number(payload.maxSalaryCapPkr),
      effectiveFrom: payload.effectiveFrom,
      effectiveTo: payload.effectiveTo,
      status: payload.status
    };

    if (editing) {
      this.localSocialConfigSeed = this.localSocialConfigSeed.map((row) => row.id === editing.id ? nextRow : row);
    } else {
      this.localSocialConfigSeed = [nextRow, ...this.localSocialConfigSeed];
    }

    this.socialSecurityConfigs = [...this.localSocialConfigSeed];
  }

  private saveLocalGratuityConfig(payload: GratuityConfigDialogPayload, editing?: GratuityConfigRow): void {
    const nextRow: GratuityConfigRow = {
      id: editing?.id ?? `local-gratuity-config-${Date.now()}`,
      configName: payload.configName,
      calculationType: payload.calculationType,
      value: Number(payload.value),
      minYearsRequired: Number(payload.minYearsRequired),
      status: payload.status,
      effectiveSince: editing?.effectiveSince ?? this.getTodayIsoDate()
    };

    if (editing) {
      this.localGratuityConfigSeed = this.localGratuityConfigSeed.map((row) => row.id === editing.id ? nextRow : row);
    } else {
      this.localGratuityConfigSeed = [nextRow, ...this.localGratuityConfigSeed];
    }

    this.gratuityConfigs = [...this.localGratuityConfigSeed];
  }

  private saveLocalGratuityRecord(
    payload: GratuityRecordDialogPayload,
    employeeName: string,
    designation: string,
    editing?: GratuityTransactionRow
  ): void {
    const nextRow: GratuityTransactionRow = {
      id: editing?.id ?? `local-gratuity-row-${Date.now()}`,
      employeeId: payload.employeeId,
      employeeName,
      designation,
      yearsWorked: Number(payload.yearsWorked),
      lastSalary: Number(payload.lastSalary),
      gratuityAmount: Number(payload.gratuityAmount),
      status: payload.status,
      paidDate: payload.paidDate
    };

    if (editing) {
      this.localGratuityTransactionSeed = this.localGratuityTransactionSeed.map((row) => row.id === editing.id ? nextRow : row);
    } else {
      this.localGratuityTransactionSeed = [nextRow, ...this.localGratuityTransactionSeed];
    }

    this.gratuityTransactions = [...this.localGratuityTransactionSeed];
  }

  private mapTaxSlab(item: any, index: number): TaxSlabRow {
    return {
      id: String(item.taxSlabId ?? item.id ?? `tax-slab-${index + 1}`),
      slabName: String(item.slabName ?? item.name ?? `Tax Slab ${index + 1}`),
      fiscalYear: String(item.fiscalYear ?? item.financialYear ?? this.selectedFiscalYear),
      minIncomePkr: this.toNumber(item.minIncomePkr ?? item.minIncome ?? item.minimumIncome),
      maxIncomePkr: item.maxIncomePkr == null && item.maxIncome == null
        ? null
        : this.toNumber(item.maxIncomePkr ?? item.maxIncome ?? item.maximumIncome),
      fixedAmountPkr: this.toNumber(item.fixedAmountPkr ?? item.fixedAmount),
      percentage: this.toNumber(item.percentage ?? item.taxPercent ?? item.rate),
      status: this.normalizeSimpleStatus(item.status)
    };
  }

  private mapTaxTransaction(item: any, index: number): TaxTransactionRow {
    return {
      id: String(item.taxTransactionId ?? item.id ?? `tax-tx-${index + 1}`),
      employeeId: String(item.employeeId ?? item.employee?.id ?? `emp-${index + 1}`),
      employeeName: String(item.employeeName ?? item.employee?.name ?? `Employee ${index + 1}`),
      annualSalary: this.toNumber(item.annualSalary ?? item.grossAnnualSalary),
      taxableIncome: this.toNumber(item.taxableIncome ?? item.taxableAmount),
      slabApplied: String(item.slabApplied ?? item.taxSlabName ?? item.slabName ?? 'N/A'),
      taxPercent: this.toNumber(item.taxPercent ?? item.taxRate ?? item.percentage),
      taxAmount: this.toNumber(item.taxAmount ?? item.deductionAmount),
      periodLabel: String(item.periodLabel ?? item.period ?? item.payrollPeriodName ?? 'October 2024')
    };
  }

  private mapSocialConfig(item: any, index: number): SocialSecurityConfigRow {
    return {
      id: String(item.socialSecurityConfigId ?? item.id ?? `social-config-${index + 1}`),
      configName: String(item.configName ?? item.name ?? `EOBI ${index + 1}`),
      employeeContributionPct: this.toNumber(item.employeeContributionPct ?? item.employeeRate ?? item.employeeContribution),
      employerContributionPct: this.toNumber(item.employerContributionPct ?? item.employerRate ?? item.employerContribution),
      maxSalaryCapPkr: this.toNumber(item.maxSalaryCapPkr ?? item.capAmount ?? item.maxSalaryCap),
      effectiveFrom: this.normalizeDate(item.effectiveFrom ?? item.startDate),
      effectiveTo: this.normalizeDateNullable(item.effectiveTo ?? item.endDate),
      status: this.normalizeSimpleStatus(item.status)
    };
  }

  private mapSocialTransaction(item: any, index: number): SocialSecurityTransactionRow {
    return {
      id: String(item.socialSecurityTransactionId ?? item.id ?? `social-tx-${index + 1}`),
      employeeId: String(item.employeeId ?? item.employee?.id ?? `emp-${index + 1}`),
      employeeName: String(item.employeeName ?? item.employee?.name ?? `Employee ${index + 1}`),
      actualSalary: this.toNumber(item.actualSalary ?? item.grossSalary),
      cappedSalary: this.toNumber(item.cappedSalary ?? item.maxSalaryCap),
      employeeShare: this.toNumber(item.employeeShare ?? item.employeeContributionAmount),
      employerShare: this.toNumber(item.employerShare ?? item.employerContributionAmount),
      totalContribution: this.toNumber(item.totalContribution ?? item.totalAmount),
      periodLabel: String(item.periodLabel ?? item.period ?? item.payrollPeriodName ?? 'October 2024')
    };
  }

  private mapGratuityConfig(item: any, index: number): GratuityConfigRow {
    return {
      id: String(item.gratuityConfigId ?? item.id ?? `gratuity-config-${index + 1}`),
      configName: String(item.configName ?? item.name ?? `Gratuity Config ${index + 1}`),
      calculationType: this.normalizeCalculationType(item.calculationType),
      value: this.toNumber(item.value ?? item.calculationValue),
      minYearsRequired: this.toNumber(item.minYearsRequired ?? item.minimumYears),
      status: this.normalizeSimpleStatus(item.status),
      effectiveSince: this.normalizeDate(item.effectiveSince ?? item.effectiveFrom ?? item.createdAt)
    };
  }

  private mapGratuityTransaction(item: any, index: number): GratuityTransactionRow {
    return {
      id: String(item.gratuityTransactionId ?? item.id ?? `gratuity-tx-${index + 1}`),
      employeeId: String(item.employeeId ?? item.employee?.id ?? `emp-${index + 1}`),
      employeeName: String(item.employeeName ?? item.employee?.name ?? `Employee ${index + 1}`),
      designation: String(item.designation ?? item.employee?.designation ?? 'Employee'),
      yearsWorked: this.toNumber(item.yearsWorked ?? item.serviceYears),
      lastSalary: this.toNumber(item.lastSalary ?? item.lastDrawnSalary),
      gratuityAmount: this.toNumber(item.gratuityAmount ?? item.amount),
      status: this.normalizeGratuityStatus(item.status),
      paidDate: this.normalizeDateNullable(item.paidDate)
    };
  }

  private ensureSelectedPeriods(): void {
    if (!this.selectedTaxPeriod && this.taxPeriods.length) {
      this.selectedTaxPeriod = this.taxPeriods[0];
    }

    if (!this.selectedSocialPeriod && this.socialPeriods.length) {
      this.selectedSocialPeriod = this.socialPeriods[0];
    }
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

  private normalizeSimpleStatus(value: unknown): 'active' | 'inactive' {
    const status = String(value ?? '').trim().toLowerCase();
    return status === 'inactive' ? 'inactive' : 'active';
  }

  private normalizeGratuityStatus(value: unknown): GratuityRecordStatus {
    const status = String(value ?? '').trim().toLowerCase();
    if (status === 'paid') return 'paid';
    if (status === 'approved') return 'approved';
    return 'calculated';
  }

  private normalizeCalculationType(value: unknown): GratuityCalculationType {
    const type = String(value ?? '').trim().toLowerCase();
    if (type === 'fixed') return 'fixed';
    if (type === 'percentage') return 'percentage';
    return 'perYear';
  }

  private normalizeDate(value: unknown): string {
    const normalized = this.normalizeDateNullable(value);
    return normalized || this.getTodayIsoDate();
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

  private isUnsupportedEndpointError(error: any): boolean {
    const status = Number(error?.status ?? 0);
    return status === 0 || status === 404 || status === 405 || status === 501;
  }

  private toNumber(value: unknown): number {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private uniqueLabels(values: string[]): string[] {
    return Array.from(new Set(values.filter((value) => !!value)));
  }

  private getTodayIsoDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildLocalTaxSlabs(): TaxSlabRow[] {
    return [
      {
        id: 'tax-slab-1',
        slabName: 'Basic Exemption',
        fiscalYear: '2024-2025',
        minIncomePkr: 0,
        maxIncomePkr: 600000,
        fixedAmountPkr: 0,
        percentage: 0,
        status: 'active'
      },
      {
        id: 'tax-slab-2',
        slabName: 'Standard Slab 1',
        fiscalYear: '2024-2025',
        minIncomePkr: 600001,
        maxIncomePkr: 1200000,
        fixedAmountPkr: 0,
        percentage: 2.5,
        status: 'active'
      },
      {
        id: 'tax-slab-3',
        slabName: 'Mid Tier Slab 1',
        fiscalYear: '2024-2025',
        minIncomePkr: 1200001,
        maxIncomePkr: 2400000,
        fixedAmountPkr: 15000,
        percentage: 12.5,
        status: 'active'
      },
      {
        id: 'tax-slab-4',
        slabName: 'Mid Tier Slab 2',
        fiscalYear: '2024-2025',
        minIncomePkr: 2400001,
        maxIncomePkr: 3600000,
        fixedAmountPkr: 165000,
        percentage: 22.5,
        status: 'active'
      },
      {
        id: 'tax-slab-5',
        slabName: 'High Income Slab',
        fiscalYear: '2024-2025',
        minIncomePkr: 3600001,
        maxIncomePkr: 6000000,
        fixedAmountPkr: 435000,
        percentage: 27.5,
        status: 'active'
      },
      {
        id: 'tax-slab-6',
        slabName: 'Top Tier Slab',
        fiscalYear: '2024-2025',
        minIncomePkr: 6000001,
        maxIncomePkr: null,
        fixedAmountPkr: 1095000,
        percentage: 35,
        status: 'active'
      }
    ];
  }

  private buildLocalTaxTransactions(): TaxTransactionRow[] {
    return [
      {
        id: 'tax-tx-1',
        employeeId: 'emp-001',
        employeeName: 'Ahmed Siddiqui',
        annualSalary: 1850000,
        taxableIncome: 1780000,
        slabApplied: 'Mid Tier 1',
        taxPercent: 12.5,
        taxAmount: 15200,
        periodLabel: 'October 2024'
      },
      {
        id: 'tax-tx-2',
        employeeId: 'emp-002',
        employeeName: 'Kiran Mansoor',
        annualSalary: 2950000,
        taxableIncome: 2810000,
        slabApplied: 'Mid Tier 2',
        taxPercent: 22.5,
        taxAmount: 38400,
        periodLabel: 'October 2024'
      },
      {
        id: 'tax-tx-3',
        employeeId: 'emp-003',
        employeeName: 'Zahid Raza',
        annualSalary: 540000,
        taxableIncome: 540000,
        slabApplied: 'Basic Exemption',
        taxPercent: 0,
        taxAmount: 0,
        periodLabel: 'October 2024'
      },
      {
        id: 'tax-tx-4',
        employeeId: 'emp-004',
        employeeName: 'Farhan Ali',
        annualSalary: 4200000,
        taxableIncome: 4120000,
        slabApplied: 'High Income',
        taxPercent: 27.5,
        taxAmount: 72150,
        periodLabel: 'October 2024'
      }
    ];
  }

  private buildLocalSocialConfigs(): SocialSecurityConfigRow[] {
    return [
      {
        id: 'social-config-1',
        configName: 'EOBI 2024',
        employeeContributionPct: 1,
        employerContributionPct: 5,
        maxSalaryCapPkr: 10000,
        effectiveFrom: '2024-01-01',
        effectiveTo: '2024-12-31',
        status: 'active'
      },
      {
        id: 'social-config-2',
        configName: 'EOBI 2023',
        employeeContributionPct: 1,
        employerContributionPct: 5,
        maxSalaryCapPkr: 8000,
        effectiveFrom: '2023-01-01',
        effectiveTo: '2023-12-31',
        status: 'inactive'
      }
    ];
  }

  private buildLocalSocialTransactions(): SocialSecurityTransactionRow[] {
    return [
      {
        id: 'social-tx-1',
        employeeId: 'emp-101',
        employeeName: 'Ali Hassan',
        actualSalary: 85000,
        cappedSalary: 10000,
        employeeShare: 100,
        employerShare: 500,
        totalContribution: 600,
        periodLabel: 'October 2024'
      },
      {
        id: 'social-tx-2',
        employeeId: 'emp-102',
        employeeName: 'Sara Ahmed',
        actualSalary: 120000,
        cappedSalary: 10000,
        employeeShare: 100,
        employerShare: 500,
        totalContribution: 600,
        periodLabel: 'October 2024'
      },
      {
        id: 'social-tx-3',
        employeeId: 'emp-103',
        employeeName: 'Usman Khan',
        actualSalary: 65000,
        cappedSalary: 10000,
        employeeShare: 100,
        employerShare: 500,
        totalContribution: 600,
        periodLabel: 'October 2024'
      },
      {
        id: 'social-tx-4',
        employeeId: 'emp-104',
        employeeName: 'Fatima Malik',
        actualSalary: 45000,
        cappedSalary: 10000,
        employeeShare: 100,
        employerShare: 500,
        totalContribution: 600,
        periodLabel: 'October 2024'
      }
    ];
  }

  private buildLocalGratuityConfigs(): GratuityConfigRow[] {
    return [
      {
        id: 'gratuity-config-1',
        configName: 'Standard gratuity 2024',
        calculationType: 'perYear',
        value: 1,
        minYearsRequired: 3,
        status: 'active',
        effectiveSince: '2024-01-01'
      },
      {
        id: 'gratuity-config-2',
        configName: 'Legacy policy',
        calculationType: 'fixed',
        value: 15,
        minYearsRequired: 5,
        status: 'inactive',
        effectiveSince: '2022-01-01'
      }
    ];
  }

  private buildLocalGratuityTransactions(): GratuityTransactionRow[] {
    return [
      {
        id: 'gratuity-tx-1',
        employeeId: 'emp-001',
        employeeName: 'Ali Hassan',
        designation: 'Senior Engineer',
        yearsWorked: 7,
        lastSalary: 150000,
        gratuityAmount: 1050000,
        status: 'paid',
        paidDate: '2024-10-12'
      },
      {
        id: 'gratuity-tx-2',
        employeeId: 'emp-002',
        employeeName: 'Sara Ahmed',
        designation: 'Project Manager',
        yearsWorked: 5,
        lastSalary: 200000,
        gratuityAmount: 1000000,
        status: 'approved',
        paidDate: null
      },
      {
        id: 'gratuity-tx-3',
        employeeId: 'emp-003',
        employeeName: 'Usman Khan',
        designation: 'Associate Designer',
        yearsWorked: 4,
        lastSalary: 75000,
        gratuityAmount: 300000,
        status: 'calculated',
        paidDate: null
      }
    ];
  }
}
