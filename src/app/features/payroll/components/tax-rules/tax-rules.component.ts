import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { PayrollService, TaxComponentRuleDto, TaxRegimeDto } from '../../services/payroll.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { hasPayrollRulePermission, watchPayrollRuleViewAccess } from '../../utils/payroll-rule-permissions';
import {
  ConfirmDeleteData,
  ConfirmDeleteDialogComponent
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { TaxEntityDialogComponent } from '../dialogs/tax-entity-dialog/tax-entity-dialog.component';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-tax-rules',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, MatIconModule, RouterModule, MatDialogModule, MatProgressSpinnerModule, MatButtonModule],
  templateUrl: './tax-rules.component.html',
  styleUrl: './tax-rules.component.scss'
})
export class TaxRulesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly taxTabs = [
    { key: 'regime', label: 'Tax Regime', route: '/payroll/policies/tax-regime-rules' },
    { key: 'categories', label: 'Tax Categories', route: '/payroll/policies/tax-categories' },
    { key: 'slabs', label: 'Tax Slabs', route: '/payroll/policies/tax-slabs' },
    { key: 'rules', label: 'Tax Rules', route: '/payroll/policies/tax-rules' }
  ];
  readonly taxRules = signal<TaxComponentRuleDto[]>([]);
  readonly taxRegimes = signal<TaxRegimeDto[]>([]);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    watchPayrollRuleViewAccess(this.authService, 'tax_component_rule_view', {
      onAllowed: () => this.fetchData(),
      onDenied: () => this.isLoading.set(false)
    });
  }

  goBack(): void {
    this.router.navigate(['/payroll/policies']);
  }

  navigateToTab(route: string): void {
    this.router.navigate([route]);
  }

  openCreateDialog(): void {
    if (!this.hasPermission('tax_component_rule_add')) return;
    const dialogRef = this.dialog.open(TaxEntityDialogComponent, {
      width: '620px',
      data: {
        entityType: 'rule',
        mode: 'create',
        title: 'Create Tax Rule',
        submitText: 'Create Rule',
        regimes: this.regimeOptions()
      }
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.payrollService.createTaxComponentRule(payload).subscribe({
        next: () => {
          this.notification.showSuccess('Tax rule created successfully');
          this.fetchRules();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to create tax rule');
        }
      });
    });
  }

  editRule(rule: TaxComponentRuleDto): void {
    if (!this.hasPermission('tax_component_rule_edit')) return;
    const dialogRef = this.dialog.open(TaxEntityDialogComponent, {
      width: '620px',
      data: {
        entityType: 'rule',
        mode: 'edit',
        title: 'Edit Tax Rule',
        submitText: 'Save Changes',
        regimes: this.regimeOptions(),
        initialValue: {
          regimeId: rule.regimeId,
          componentName: rule.componentName ?? '',
          taxability: rule.taxability ?? 'taxable',
          limitAmount: rule.limitAmount,
          limitPercentage: rule.limitPercentage,
          applyStage: rule.applyStage ?? 'monthly'
        }
      }
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.payrollService.updateTaxComponentRule(rule.componentRuleId, payload).subscribe({
        next: () => {
          this.notification.showSuccess('Tax rule updated successfully');
          this.fetchRules();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to update tax rule');
        }
      });
    });
  }

  deleteRule(rule: TaxComponentRuleDto): void {
    if (!this.hasPermission('tax_component_rule_delete')) return;
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Tax Rule',
      message: 'Are you sure you want to delete this tax rule?',
      itemName: rule.componentName || 'this rule',
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result !== true) return;
      this.payrollService.deleteTaxComponentRule(rule.componentRuleId).subscribe({
        next: () => {
          this.notification.showSuccess('Tax rule deleted successfully');
          this.fetchRules();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to delete tax rule');
        }
      });
    });
  }

  private fetchData(): void {
    this.isLoading.set(true);
    this.payrollService.getActiveTaxRegimes().subscribe({
      next: (regimes) => {
        this.taxRegimes.set(regimes || []);
        this.fetchRules();
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load tax regimes');
        this.isLoading.set(false);
      }
    });
  }

  private fetchRules(): void {
    this.payrollService.getTaxComponentRules().subscribe({
      next: (rules) => {
        this.taxRules.set(rules || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load tax rules');
        this.isLoading.set(false);
      }
    });
  }

  private regimeOptions(): Array<{ id: string; label: string }> {
    return this.taxRegimes().map((regime) => ({
      id: regime.regimeId,
      label: `${regime.regimeName || 'Unnamed Regime'}${regime.country ? ` (${regime.country})` : ''}`
    }));
  }

  hasPermission(actionKey: string): boolean {
    return hasPayrollRulePermission(this.authService, actionKey);
  }
}
