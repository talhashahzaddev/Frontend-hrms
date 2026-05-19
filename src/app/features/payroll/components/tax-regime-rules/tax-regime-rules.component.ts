import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { PayrollService, TaxRegimeDto } from '../../services/payroll.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { hasPayrollRulePermission, watchPayrollRuleViewAccess } from '../../utils/payroll-rule-permissions';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { RuleDialogComponent } from '../dialogs/rule-dialog/rule-dialog.component';

@Component({
  selector: 'app-tax-regime-rules',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule, MatButtonModule, RouterModule],
  templateUrl: './tax-regime-rules.component.html',
  styleUrl: './tax-regime-rules.component.scss'
})
export class TaxRegimeRulesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly taxRegimes = signal<TaxRegimeDto[]>([]);
  readonly isLoading = signal(true);
  readonly taxTabs = [
    { key: 'regime', label: 'Tax Regime', route: '/payroll/policies/tax-regime-rules' },
    { key: 'categories', label: 'Tax Categories', route: '/payroll/policies/tax-categories' },
    { key: 'slabs', label: 'Tax Slabs', route: '/payroll/policies/tax-slabs' },
    { key: 'rules', label: 'Tax Rules', route: '/payroll/policies/tax-rules' }
  ];

  ngOnInit(): void {
    watchPayrollRuleViewAccess(this.authService, 'tax_regime_view', {
      onAllowed: () => this.fetchTaxRegimes(),
      onDenied: () => this.isLoading.set(false)
    });
  }

  fetchTaxRegimes(): void {
    if (!this.hasPermission('tax_regime_view')) return;
    this.isLoading.set(true);
    this.payrollService.getTaxRegimes().subscribe({
      next: (data) => {
        this.taxRegimes.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load tax regimes');
        this.isLoading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/payroll/policies']);
  }

  navigateToTab(route: string): void {
    this.router.navigate([route]);
  }

  openRuleDialog(): void {
    if (!this.hasPermission('tax_regime_add')) return;
    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel',
      data: { policyId: 10, mode: 'create' }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        this.fetchTaxRegimes();
      }
    });
  }

  editRule(regime: TaxRegimeDto): void {
    if (!this.hasPermission('tax_regime_edit')) return;
    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel',
      data: {
        policyId: 10,
        mode: 'edit',
        rule: {
          ruleId: regime.regimeId,
          regimeId: regime.regimeId,
          country: regime.country,
          regimeName: regime.regimeName,
          startDate: regime.startDate,
          endDate: regime.endDate,
          isActive: regime.isActive
        }
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        this.fetchTaxRegimes();
      }
    });
  }

  onToggleStatus(regime: TaxRegimeDto): void {
    if (!this.hasPermission('tax_regime_edit')) return;
    const regimeId = String(regime.regimeId ?? '');
    if (!regimeId) {
      this.notification.showError('Unable to update status for this tax regime');
      return;
    }

    const payload = {
      country: regime.country ?? '',
      regimeName: regime.regimeName ?? '',
      startDate: regime.startDate,
      endDate: regime.endDate,
      isActive: !regime.isActive
    };

    this.payrollService.updateTaxRegime(regimeId, payload).subscribe({
      next: () => {
        this.notification.showSuccess('Status updated successfully');
        this.fetchTaxRegimes();
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to toggle status');
      }
    });
  }

  onDelete(regime: TaxRegimeDto): void {
    if (!this.hasPermission('tax_regime_delete')) return;
    const regimeId = String(regime.regimeId ?? '');
    if (!regimeId) {
      this.notification.showError('Unable to delete this tax regime');
      return;
    }

    const dialogData: ConfirmDeleteData = {
      title: 'Delete Tax Regime',
      message: 'Are you sure you want to delete this tax regime?',
      itemName: regime.regimeName || 'this tax regime',
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.payrollService.deleteTaxRegime(regimeId).subscribe({
          next: () => {
            this.notification.showSuccess('Tax regime deleted successfully');
            this.fetchTaxRegimes();
          },
          error: (err) => {
            console.error(err);
            this.notification.showError('Failed to delete tax regime');
          }
        });
      }
    });
  }

  hasPermission(actionKey: string): boolean {
    return hasPayrollRulePermission(this.authService, actionKey);
  }
}
