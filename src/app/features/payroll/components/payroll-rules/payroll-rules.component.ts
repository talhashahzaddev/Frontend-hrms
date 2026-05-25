import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PayrollService, PayRollRulesGroupedDto } from '../../services/payroll.service';
import { RuleDialogComponent } from '../dialogs/rule-dialog/rule-dialog.component';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import {
  canCreateAnyPayrollPolicy,
  hasPayrollRulePermission,
  PAYROLL_POLICY_VIEW_KEYS,
  watchPayrollRuleViewAccess
} from '../../utils/payroll-rule-permissions';

@Component({
  selector: 'app-payroll-rules',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule],
  templateUrl: './payroll-rules.component.html',
  styleUrl: './payroll-rules.component.scss'
})
export class PayrollRulesComponent implements OnInit {
  private readonly payrollService = inject(PayrollService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);

  policyCards: { key: string; title: string; rulesCount: number }[] = [];
  groupedRulesData: PayRollRulesGroupedDto | null = null;
  isLoading = true;
  error: string | null = null;

  readonly policyPermissionMap = PAYROLL_POLICY_VIEW_KEYS;

  ngOnInit(): void {
    watchPayrollRuleViewAccess(this.authService, 'payroll_rules_view', {
      onAllowed: () => this.fetchRules(),
      onDenied: () => {
        this.isLoading = false;
      }
    });
  }

  fetchRules(): void {
    this.isLoading = true;
    this.payrollService.getAllRules().subscribe({
      next: (data) => {
        this.groupedRulesData = data || null;
        this.policyCards = this.toPolicyCards(data);
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load rules.';
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  get totalModules(): number {
    return this.policyCards.length;
  }

  get totalRulesConfigured(): number {
    return this.policyCards.reduce((acc, current) => acc + current.rulesCount, 0);
  }

  get activeRulesCount(): number {
    if (!this.groupedRulesData) return 0;

    const sections = Object.values(this.groupedRulesData as any);
    return sections.reduce((total: number, section: any) => {
      const rules = section?.rules ?? [];
      return total + rules.filter((r: any) => r?.isActive === true).length;
    }, 0);
  }

  get inactiveRulesCount(): number {
    if (!this.groupedRulesData) return 0;

    const sections = Object.values(this.groupedRulesData as any);
    return sections.reduce((total: number, section: any) => {
      const rules = section?.rules ?? [];
      return total + rules.filter((r: any) => r?.isActive === false).length;
    }, 0);
  }

  getIconName(policyTitle: string): string {
    const config: Record<string, string> = {
      'Overtime Policy': 'timer',
      'Attendance Deduction Policy': 'event_busy',
      'Late Arrival Policy': 'schedule',
      'Leave Deduction Policy': 'flight_takeoff',
      'Performance Bonus Policy': 'military_tech',
      'Employee Loan Policy': 'account_balance',
      'Salary Advance Policy': 'payments',
      'Provident Fund Policy': 'savings',
      'Income Tax Policy': 'request_quote',
      'Social Security Policy': 'shield_person',
      'Gratuity Policy': 'emoji_events',
      'Bonus Policy': 'redeem'
    };
    return config[policyTitle] || 'settings';
  }

  getIconColorClass(policyTitle: string): string {
    const config: Record<string, string> = {
      'Overtime Policy': 'color-primary',
      'Attendance Deduction Policy': 'color-slate',
      'Late Arrival Policy': 'color-amber',
      'Leave Deduction Policy': 'color-emerald',
      'Performance Bonus Policy': 'color-purple',
      'Employee Loan Policy': 'color-orange',
      'Salary Advance Policy': 'color-pink',
      'Provident Fund Policy': 'color-indigo',
      'Income Tax Policy': 'color-teal',
      'Social Security Policy': 'color-red',
      'Gratuity Policy': 'color-amber',
      'Bonus Policy': 'color-primary'
    };
    return config[policyTitle] || 'color-default';
  }

  private toPolicyCards(data: PayRollRulesGroupedDto | null | undefined): { key: string; title: string; rulesCount: number }[] {
    if (!data) return [];

    const labels: Record<string, string> = {
      overtimePolicy: 'Overtime Policy',
      attendanceDeductionPolicy: 'Attendance Deduction Policy',
      lateArrivalPolicy: 'Late Arrival Policy',
      leaveDeductionPolicy: 'Leave Deduction Policy',
      performanceBonusPolicy: 'Performance Bonus Policy',
      employeeLoanPolicy: 'Employee Loan Policy',
      salaryAdvancePolicy: 'Salary Advance Policy',
      providentFundPolicy: 'Provident Fund Policy',
      incomeTaxPolicy: 'Income Tax Policy',
      socialSecurityPolicy: 'Social Security Policy',
      gratuityPolicy: 'Gratuity Policy',
      bonusPolicy: 'Bonus Policy'
    };

    const entries = Object.entries(labels).map(([key, title]) => {
      const section = (data as any)[key];
      return {
        key,
        title,
        rulesCount: section?.rulesCount ?? 0
      };
    });

    return entries.filter(x => this.hasPermission(this.policyPermissionMap[x.key]));
  }

  openRuleDialog(): void {
    if (!this.canCreateAnyPolicy) {
      this.notification.showError('You do not have permission to create any policies.');
      return;
    }

    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.redirectTo) {
        this.router.navigateByUrl(result.redirectTo);
        return;
      }

      if (result?.success) {
        this.fetchRules();
      }
    });
  }

  onPolicyClick(policy: { key: string; title: string; rulesCount: number }): void {
    const permission = this.policyPermissionMap[policy.key];
    if (permission && !this.hasPermission(permission)) {
      this.notification.showError('You do not have permission to view this policy.');
      return;
    }

    switch (policy.key) {
      case 'overtimePolicy':
        this.router.navigate(['/payroll/policies/overtime-rules']);
        break;
      case 'attendanceDeductionPolicy':
        this.router.navigate(['/payroll/policies/attendance-deduction-rules']);
        break;
      case 'lateArrivalPolicy':
        this.router.navigate(['/payroll/policies/late-arrival-rules']);
        break;
      case 'leaveDeductionPolicy':
        this.router.navigate(['/payroll/policies/leave-deduction-rules']);
        break;
      case 'performanceBonusPolicy':
        this.router.navigate(['/payroll/policies/performance-rules']);
        break;
      case 'bonusPolicy':
        this.router.navigate(['/payroll/policies/bonus-rules']);
        break;
      case 'employeeLoanPolicy':
        this.router.navigate(['/payroll/policies/loan-rules']);
        break;
      case 'providentFundPolicy':
        this.router.navigate(['/payroll/policies/provident-fund-rule']);
        break;
      case 'salaryAdvancePolicy':
        this.router.navigate(['/payroll/policies/salary-advance-rules']);
        break;
      case 'incomeTaxPolicy':
        this.router.navigate(['/payroll/policies/tax-regime-rules']);
        break;
      case 'socialSecurityPolicy':
        this.router.navigate(['/payroll/social-security']);
        break;
      case 'gratuityPolicy':
        this.router.navigate(['/payroll/policies/gratuity-rules']);
        break;
      default:
        break;
    }
  }

  hasPermission(actionKey: string): boolean {
    return hasPayrollRulePermission(this.authService, actionKey);
  }

  get canCreateAnyPolicy(): boolean {
    return canCreateAnyPayrollPolicy(this.authService);
  }
}
