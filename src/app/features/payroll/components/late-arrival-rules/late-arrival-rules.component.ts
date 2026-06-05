import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '@core/services/notification.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { AuthService } from '@core/services/auth.service';
import { take } from 'rxjs';
import { hasPayrollRulePermission, watchPayrollRuleViewAccess } from '../../utils/payroll-rule-permissions';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { RuleDialogComponent } from '../dialogs/rule-dialog/rule-dialog.component';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-late-arrival-rules',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './late-arrival-rules.component.html',
  styleUrl: './late-arrival-rules.component.scss'
})
export class LateArrivalRulesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly settingsService = inject(SettingsService);
  private readonly authService = inject(AuthService);

  readonly lateArrivalRules = signal<any[]>([]);
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

    watchPayrollRuleViewAccess(this.authService, 'late_arrival_rule_view', {
      onAllowed: () => this.fetchRules(),
      onDenied: () => this.isLoading.set(false)
    });
  }

  fetchRules(): void {
    if (!this.hasPermission('late_arrival_rule_view')) return;
    this.isLoading.set(true);
    this.payrollService.getLateArrivalRules().subscribe({
      next: (data) => {
        this.lateArrivalRules.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load late arrival rules');
        this.isLoading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/payroll/policies']);
  }

  openRuleDialog(): void {
    if (!this.hasPermission('late_arrival_rule_add')) return;
    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel',
      data: { policyId: 3, mode: 'create' } // Late Arrival Policy ID is 3
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.fetchRules();
      }
    });
  }

  editRule(rule: any): void {
    if (!this.hasPermission('late_arrival_rule_edit')) return;
    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel',
      data: {
        policyId: 3,
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

  onToggleStatus(id: string): void {
    if (!this.hasPermission('late_arrival_rule_edit')) return;
    const rule = this.lateArrivalRules().find(r => r.ruleId === id);
    if (!rule) return;

    const updatedRule = { ...rule, isActive: !rule.isActive };
    this.payrollService.updateLateArrivalRule(id, updatedRule).subscribe({
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
    if (!this.hasPermission('late_arrival_rule_delete')) return;
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Rule',
      message: 'Are you sure you want to delete this late arrival rule?',
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
        this.payrollService.deleteLateArrivalRule(id).subscribe({
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

  hasPermission(actionKey: string): boolean {
    return hasPayrollRulePermission(this.authService, actionKey);
  }
}
