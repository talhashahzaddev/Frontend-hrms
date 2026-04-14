import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '@core/services/notification.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { take } from 'rxjs';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { RuleDialogComponent } from '../dialogs/rule-dialog/rule-dialog.component';

interface ProvidentFundRule {
  ruleId: string;
  ruleName: string;
  description?: string;
  basis: string;
  employeePercentage: number;
  employerPercentage: number;
  minContribution: number;
  maxContribution: number | null;
  vestingMonths: number;
  createdAt?: string;
  updatedAt?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-provident-fund-rule',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule, MatButtonModule],
  templateUrl: './provident-fund-rule.component.html',
  styleUrl: './provident-fund-rule.component.scss'
})
export class ProvidentFundRuleComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly settingsService = inject(SettingsService);

  readonly providentFundRules = signal<ProvidentFundRule[]>([]);
  readonly isLoading = signal(true);
  readonly currencySymbol = signal('$');

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

    this.fetchRules();
  }

  goBack(): void {
    this.router.navigate(['/payroll/policies']);
  }

  fetchRules(): void {
    this.isLoading.set(true);
    this.payrollService.getProvidentFundRules().subscribe({
      next: (data) => {
        const mappedRules = (data || []).map((rule: any) => ({
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          description: rule.description,
          basis: rule.contributionBasis || 'basic',
          employeePercentage: rule.defaultEmployeePct ?? 0,
          employerPercentage: rule.defaultEmployerPct ?? 0,
          minContribution: rule.minContribution ?? 0,
          maxContribution: rule.maxContribution ?? null,
          vestingMonths: rule.vestingMonths ?? 0,
          createdAt: rule.createdAt,
          updatedAt: rule.updatedAt,
          isActive: !!rule.isActive
        })) as ProvidentFundRule[];

        this.providentFundRules.set(mappedRules);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load provident fund rules');
        this.isLoading.set(false);
      }
    });
  }

  openRuleDialog(): void {
    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel',
      data: { policyId: 9, mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.fetchRules();
      }
    });
  }

  editRule(rule: ProvidentFundRule): void {
    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel',
      data: {
        policyId: 9,
        mode: 'edit',
        rule
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.fetchRules();
      }
    });
  }

  onToggleStatus(rule: ProvidentFundRule): void {
    const updatedRule = {
      ruleName: rule.ruleName,
      description: rule.description,
      defaultEmployeePct: rule.employeePercentage,
      defaultEmployerPct: rule.employerPercentage,
      contributionBasis: (rule.basis || 'basic').toLowerCase(),
      minContribution: rule.minContribution,
      maxContribution: rule.maxContribution,
      vestingMonths: rule.vestingMonths,
      allowPartialWithdraw: false,
      isActive: !rule.isActive
    };

    this.payrollService.updateProvidentFundRule(rule.ruleId, updatedRule).subscribe({
      next: () => {
        this.notification.showSuccess('Status updated successfully');
        this.fetchRules();
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to toggle status');
      }
    });
  }

  onDelete(id: string, ruleName?: string): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Rule',
      message: 'Are you sure you want to delete this provident fund rule?',
      itemName: ruleName || 'this rule',
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.payrollService.deleteProvidentFundRule(id).subscribe({
          next: () => {
            this.notification.showSuccess('Rule deleted successfully');
            this.fetchRules();
          },
          error: (err) => {
            console.error(err);
            this.notification.showError('Failed to delete rule');
          }
        });
      }
    });
  }

  getBasisLabel(basis: string | null | undefined): string {
    if (!basis) {
      return 'Basic';
    }
    return basis.toLowerCase() === 'gross' ? 'Gross' : 'Basic';
  }

  getUpdatedLabel(rule: ProvidentFundRule): string {
    const raw = rule.updatedAt || rule.createdAt;
    if (!raw) {
      return '';
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const formatted = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    return `Updated: ${formatted}`;
  }
}
