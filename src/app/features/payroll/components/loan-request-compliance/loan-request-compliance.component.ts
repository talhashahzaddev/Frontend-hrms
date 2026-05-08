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
import { DeleteActionDialogComponent } from '../dialogs/delete-action-dialog/delete-action-dialog.component';

type ComplianceTab = 'tax-slabs' | 'social-security';

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

  currencySymbol = 'PKR';
  fiscalYears = ['2023-2024', '2024-2025', '2025-2026'];

  selectedFiscalYear = '2024-2025';
  selectedTaxPeriod = '';
  selectedSocialPeriod = '';

  taxSlabs: TaxSlabRow[] = [];
  taxTransactions: TaxTransactionRow[] = [];
  socialSecurityConfigs: SocialSecurityConfigRow[] = [];
  socialSecurityTransactions: SocialSecurityTransactionRow[] = [];

  private localTaxSlabSeed: TaxSlabRow[] = [];
  private localTaxTransactionSeed: TaxTransactionRow[] = [];
  private localSocialConfigSeed: SocialSecurityConfigRow[] = [];
  private localSocialTransactionSeed: SocialSecurityTransactionRow[] = [];

  usingLocalTaxSlabs = false;
  usingLocalTaxTransactions = false;
  usingLocalSocialConfigs = false;
  usingLocalSocialTransactions = false;

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

    this.loadTaxSlabs();
    this.loadTaxTransactions();
    this.loadSocialSecurityConfigs();
    this.loadSocialSecurityTransactions();
  }

  get hasFallbackNotice(): boolean {
    return this.usingLocalTaxSlabs
      || this.usingLocalTaxTransactions
      || this.usingLocalSocialConfigs
      || this.usingLocalSocialTransactions;
  }

  get taxSlabCount(): number {
    return this.visibleTaxSlabs.length;
  }

  get socialSecurityConfigCount(): number {
    return this.socialSecurityConfigs.length;
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

  setTab(tab: ComplianceTab): void {
    this.activeTab = tab;
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

  getSlabStatusClass(status: TaxSlabStatus): string {
    return status === 'active' ? 'status-active' : 'status-inactive';
  }

  getConfigStatusClass(status: SocialSecurityConfigStatus): string {
    return status === 'active' ? 'status-active' : 'status-inactive';
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

}
