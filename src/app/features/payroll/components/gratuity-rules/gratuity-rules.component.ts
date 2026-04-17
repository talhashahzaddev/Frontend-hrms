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

@Component({
  selector: 'app-gratuity-rules',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule, MatButtonModule],
  templateUrl: './gratuity-rules.component.html',
  styleUrl: './gratuity-rules.component.scss'
})
export class GratuityRulesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly settingsService = inject(SettingsService);

  readonly gratuityRules = signal<any[]>([]);
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

  fetchRules(): void {
    this.isLoading.set(true);
    this.payrollService.getGratuityConfigs().subscribe({
      next: (data) => {
        this.gratuityRules.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load gratuity rules');
        this.isLoading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/payroll/policies']);
  }

  openRuleDialog(): void {
    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel',
      data: { policyId: 12, mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.fetchRules();
      }
    });
  }

  editRule(rule: any): void {
    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel',
      data: {
        policyId: 12,
        mode: 'edit',
        rule: {
          ruleId: rule.id,
          id: rule.id,
          ruleName: rule.configRuleName || rule.configrulename,
          description: rule.description,
          yearsRequired: rule.yearsRequired ?? rule.yearsrequired,
          calculationType: rule.calculationType ?? rule.calculationtype,
          calculationValue: rule.calculationValue ?? rule.calculationvalue,
          isActive: rule.isActive ?? rule.isactive
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.fetchRules();
      }
    });
  }

  onToggleStatus(rule: any): void {
    const updatedRule = {
      configRuleName: rule.configRuleName || rule.configrulename,
      description: rule.description,
      yearsRequired: rule.yearsRequired ?? rule.yearsrequired,
      calculationType: rule.calculationType ?? rule.calculationtype,
      calculationValue: rule.calculationValue ?? rule.calculationvalue,
      isActive: !(rule.isActive ?? rule.isactive)
    };
    this.payrollService.updateGratuityConfig(rule.id, updatedRule).subscribe({
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
      title: 'Delete Gratuity Rule',
      message: 'Are you sure you want to delete this gratuity rule?',
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
        this.payrollService.deleteGratuityConfig(id).subscribe({
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

  getCalcTypeLabel(type: string): string {
    const map: Record<string, string> = {
      peryear: 'Per Year',
      fixed: 'Fixed',
      percentage: 'Percentage'
    };
    return map[(type || '').toLowerCase()] || type;
  }

  getRuleIcon(type: string): string {
    const normalized = (type || '').toLowerCase();
    if (normalized === 'percentage') return 'percent';
    if (normalized === 'peryear') return 'timeline';
    return 'workspace_premium';
  }

  getCalcTypeClass(type: string): string {
    const normalized = (type || '').toLowerCase();
    if (normalized === 'percentage') return 'calc-percentage';
    if (normalized === 'peryear') return 'calc-peryear';
    return 'calc-fixed';
  }
}
