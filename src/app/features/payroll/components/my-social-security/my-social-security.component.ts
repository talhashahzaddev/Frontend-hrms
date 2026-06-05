import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { SettingsService } from '../../../settings/services/settings.service';
import {
  CreateSocialSecurityClaimPayload,
  CreateSocialSecurityEnrollmentRequestPayload,
  PayrollService,
  SocialSecurityClaim,
  SocialSecurityEnrollment,
  SocialSecurityEnrollmentRequest
} from '../../services/payroll.service';
import {
  RequestSocialSecurityChangeDialogComponent
} from '../dialogs/request-social-security-change-dialog/request-social-security-change-dialog.component';
import {
  SocialSecurityClaimDialogComponent
} from '../dialogs/social-security-claim-dialog/social-security-claim-dialog.component';

import { SharedCommonModule } from '@shared/shared-common.module';
interface MySocialTransactionRow {
  id: string;
  periodId: string;
  periodName: string;
  configName: string;
  actualSalary: number;
  salaryCapped: number;
  employeeAmount: number;
  employerAmount: number;
  totalAmount: number;
  requestStatus: string;
  isEnrolled: boolean;
}

interface PeriodOption {
  id: string;
  name: string;
}

type MySocialTab = 'transactions' | 'requests' | 'claims';


@Component({
  selector: 'app-my-social-security',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './my-social-security.component.html',
  styleUrl: './my-social-security.component.scss'
})
export class MySocialSecurityComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly settingsService = inject(SettingsService);

  readonly isLoading = signal(true);
  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  currentTab: MySocialTab = 'requests';

  // Transactions
  transactions: MySocialTransactionRow[] = [];
  periodOptions: PeriodOption[] = [];
  selectedPeriodId = '';
  selectedStatus = 'all';
  searchTerm = '';

  // Enrollment
  enrollment: SocialSecurityEnrollment | null = null;
  enrollmentLoading = false;

  // Active rules the employee can request enrollment under
  ruleOptions: { ruleId: string; ruleName: string; schemeName?: string | null; employeeDefaultPct?: number | null; employerDefaultPct?: number | null }[] = [];

  // Requests
  requests: SocialSecurityEnrollmentRequest[] = [];
  requestsLoading = false;

  // Claims
  claims: SocialSecurityClaim[] = [];
  claimsLoading = false;

  ngOnInit(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode) => this.currencySymbol.set(this.settingsService.getCurrencySymbol(currencyCode)),
        error: () => this.currencySymbol.set(this.settingsService.getCurrencySymbol())
      });

    this.loadEnrollment();
    this.loadRuleOptions();
    this.loadMySocialSecurityTransactions();
    this.loadMyRequests();
    this.loadMyClaims();
  }

  private loadRuleOptions(): void {
    this.payrollService.getSocialSecurityRules().pipe(take(1)).subscribe({
      next: (rules: any[]) => {
        this.ruleOptions = (rules ?? [])
          .filter((r) => r?.isActive ?? true)
          .map((r) => ({
            ruleId: String(r.ruleId ?? ''),
            ruleName: String(r.ruleName ?? 'Rule'),
            schemeName: r.schemeName ?? null,
            employeeDefaultPct: r.employeeDefaultPct ?? null,
            employerDefaultPct: r.employerDefaultPct ?? null
          }))
          .filter((r) => !!r.ruleId);
      },
      error: () => {
        this.ruleOptions = [];
      }
    });
  }

  setTab(tab: MySocialTab): void {
    this.currentTab = tab;
  }

  goBack(): void {
    if (this.authService.hasMenuPermission('Payroll', 'My Benefits', 'my_benefits')) {
      void this.router.navigate(['/payroll/my-benefits']);
      return;
    }

    void this.router.navigate(['/dashboard']);
  }

  // ── Enrollment status ─────────────────────────────────────────────────────

  get statusBadgeClass(): string {
    const s = (this.enrollment?.enrollmentStatus ?? '').toLowerCase();
    if (s === 'active') return 'status-approved';
    if (s === 'pending' || s === 'suspended') return 'status-pending';
    if (s === 'withdrawn' || s === 'closed' || s === 'rejected') return 'status-cancelled';
    return 'status-pending';
  }

  get effectiveEmployeePct(): number | null {
    if (!this.enrollment) return null;
    return this.enrollment.employeeCustomPct ?? this.enrollment.ruleEmployeeDefaultPct ?? null;
  }

  get effectiveEmployerPct(): number | null {
    if (!this.enrollment) return null;
    return this.enrollment.employerCustomPct ?? this.enrollment.ruleEmployerDefaultPct ?? null;
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  get visibleTransactions(): MySocialTransactionRow[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.transactions.filter((row) => {
      if (this.selectedPeriodId && row.periodId !== this.selectedPeriodId) return false;
      if (this.selectedStatus !== 'all' && row.requestStatus !== this.selectedStatus) return false;
      if (!search) return true;
      return row.periodName.toLowerCase().includes(search)
          || row.configName.toLowerCase().includes(search)
          || row.requestStatus.toLowerCase().includes(search);
    });
  }

  get totalEmployeeContribution(): number {
    return this.visibleTransactions.reduce((sum, row) => sum + row.employeeAmount, 0);
  }

  get totalEmployerContribution(): number {
    return this.visibleTransactions.reduce((sum, row) => sum + row.employerAmount, 0);
  }

  get totalContribution(): number {
    return this.visibleTransactions.reduce((sum, row) => sum + row.totalAmount, 0);
  }

  get enrolledPeriodsCount(): number {
    return new Set(
      this.visibleTransactions.filter((row) => row.isEnrolled).map((row) => row.periodId || row.periodName)
    ).size;
  }

  getStatusClass(status: string): string {
    const normalized = String(status ?? '').trim().toLowerCase();
    if (normalized === 'approved' || normalized === 'deducted' || normalized === 'processed' || normalized === 'paid') return 'status-approved';
    if (normalized === 'rejected' || normalized === 'cancelled' || normalized === 'withdrawn') return 'status-cancelled';
    return 'status-pending';
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  openRequestDialog(): void {
    const dialogRef = this.dialog.open(RequestSocialSecurityChangeDialogComponent, {
      width: '620px',
      maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: { currentEnrollment: this.enrollment, rules: this.ruleOptions }
    });

    dialogRef.afterClosed().subscribe((payload: CreateSocialSecurityEnrollmentRequestPayload | undefined) => {
      if (!payload) return;

      this.payrollService.createMySocialSecurityRequest(payload).subscribe({
        next: () => {
          this.notification.showSuccess('Your request has been submitted for review.');
          this.loadMyRequests();
        },
        error: (err) => {
          this.notification.showError(this.resolveError(err, 'Failed to submit request.'));
        }
      });
    });
  }

  openClaimDialog(): void {
    const dialogRef = this.dialog.open(SocialSecurityClaimDialogComponent, {
      width: '680px',
      maxWidth: '95vw',
      panelClass: 'social-security-transaction-dialog-panel',
      autoFocus: false,
      restoreFocus: false
    });

    dialogRef.afterClosed().subscribe((payload: CreateSocialSecurityClaimPayload | undefined) => {
      if (!payload) return;

      this.payrollService.createMySocialSecurityClaim(payload).subscribe({
        next: () => {
          this.notification.showSuccess('Your benefit claim has been submitted.');
          this.loadMyClaims();
        },
        error: (err) => {
          this.notification.showError(this.resolveError(err, 'Failed to submit claim.'));
        }
      });
    });
  }

  // ── Data loaders ──────────────────────────────────────────────────────────

  private loadEnrollment(): void {
    this.enrollmentLoading = true;
    this.payrollService.getMySocialSecurityEnrollment().pipe(take(1)).subscribe({
      next: (data) => {
        this.enrollment = data ?? null;
        this.enrollmentLoading = false;
      },
      error: () => {
        this.enrollment = null;
        this.enrollmentLoading = false;
      }
    });
  }

  private loadMySocialSecurityTransactions(): void {
    this.isLoading.set(true);

    this.payrollService.getMySocialSecurityTransactions({ page: 1, pageSize: 500 })
      .pipe(take(1))
      .subscribe({
        next: (result: any) => {
          const items = this.extractItems(result);
          const mapped = items.map((item: any, index: number) => this.mapTransaction(item, index));
          this.transactions = this.dedupeTransactions(mapped);
          this.periodOptions = this.buildPeriodOptions(this.transactions);

          if (this.selectedPeriodId && !this.periodOptions.some((p) => p.id === this.selectedPeriodId)) {
            this.selectedPeriodId = '';
          }

          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.transactions = [];
          this.periodOptions = [];
          this.isLoading.set(false);
          if (error?.status !== 404) {
            this.notification.showError('Failed to load your social security records.');
          }
        }
      });
  }

  private loadMyRequests(): void {
    this.requestsLoading = true;
    this.payrollService.getMySocialSecurityRequests({ page: 1, pageSize: 100 }).pipe(take(1)).subscribe({
      next: (result: any) => {
        this.requests = this.extractItems(result) as SocialSecurityEnrollmentRequest[];
        this.requestsLoading = false;
      },
      error: () => {
        this.requests = [];
        this.requestsLoading = false;
      }
    });
  }

  private loadMyClaims(): void {
    this.claimsLoading = true;
    this.payrollService.getMySocialSecurityClaims({ page: 1, pageSize: 100 }).pipe(take(1)).subscribe({
      next: (result: any) => {
        this.claims = this.extractItems(result) as SocialSecurityClaim[];
        this.claimsLoading = false;
      },
      error: () => {
        this.claims = [];
        this.claimsLoading = false;
      }
    });
  }

  private mapTransaction(item: any, index: number): MySocialTransactionRow {
    const periodId = String(item.periodId ?? item.period?.id ?? '');
    const periodName = String(item.periodName ?? item.periodLabel ?? item.payrollPeriodName ?? 'Unknown period');

    return {
      id: String(item.id ?? item.socialSecurityTransactionId ?? `social-${index}`),
      periodId: periodId || periodName,
      periodName,
      configName: String(item.configName ?? item.ruleName ?? item.configRuleName ?? 'Social security rule'),
      actualSalary: Number(item.actualSalary ?? 0),
      salaryCapped: Number(item.salaryCapped ?? item.maxSalaryCap ?? 0),
      employeeAmount: Number(item.employeeAmount ?? item.employeeShare ?? 0),
      employerAmount: Number(item.employerAmount ?? item.employerShare ?? 0),
      totalAmount: Number(item.totalAmount ?? item.totalContribution ?? 0),
      requestStatus: String(item.requestStatus ?? 'deducted').toLowerCase(),
      isEnrolled: !!(item.isEnrolled ?? true)
    };
  }

  private dedupeTransactions(rows: MySocialTransactionRow[]): MySocialTransactionRow[] {
    const seen = new Set<string>();
    const output: MySocialTransactionRow[] = [];
    for (const row of rows) {
      const sig = row.id ? `id:${row.id}` : `sig:${row.periodId}|${row.configName}|${row.actualSalary}|${row.totalAmount}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      output.push(row);
    }
    return output;
  }

  private buildPeriodOptions(rows: MySocialTransactionRow[]): PeriodOption[] {
    const map = new Map<string, PeriodOption>();
    for (const row of rows) {
      const id = row.periodId || row.periodName;
      if (!id) continue;
      if (!map.has(id)) map.set(id, { id, name: row.periodName || 'Unknown period' });
    }
    return Array.from(map.values());
  }

  private extractItems(result: any): any[] {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.records)) return result.records;
    if (Array.isArray(result?.Data)) return result.Data;
    return [];
  }

  private resolveError(err: any, fallback: string): string {
    const msg = err?.error?.message ?? err?.message;
    return typeof msg === 'string' && msg.trim() ? msg : fallback;
  }
}
