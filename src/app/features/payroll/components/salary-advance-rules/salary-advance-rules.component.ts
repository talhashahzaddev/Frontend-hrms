import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { PayrollService } from '../../services/payroll.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { hasPayrollRulePermission, watchPayrollRuleViewAccess } from '../../utils/payroll-rule-permissions';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { RuleDialogComponent } from '../dialogs/rule-dialog/rule-dialog.component';

@Component({
  selector: 'app-salary-advance-rules',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule, MatButtonModule],
  templateUrl: './salary-advance-rules.component.html',
  styleUrl: './salary-advance-rules.component.scss'
})
export class SalaryAdvanceRulesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly salaryAdvanceRules = signal<any[]>([]);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    watchPayrollRuleViewAccess(this.authService, 'salary_advance_rule_view', {
      onAllowed: () => this.fetchRules(),
      onDenied: () => this.isLoading.set(false)
    });
  }

  fetchRules(): void {
    if (!this.hasPermission('salary_advance_rule_view')) return;
    this.isLoading.set(true);
    this.payrollService.getSalaryAdvanceRules().subscribe({
      next: (data) => {
        this.salaryAdvanceRules.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load salary advance rules');
        this.isLoading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/payroll/policies']);
  }

  openRuleDialog(): void {
    if (!this.hasPermission('salary_advance_rule_add')) return;
    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel',
      data: { policyId: 8, mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.fetchRules();
      }
    });
  }

  editRule(rule: any): void {
    if (!this.hasPermission('salary_advance_rule_edit')) return;
    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel',
      data: {
        policyId: 8,
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

  onToggleStatus(rule: any): void {
    if (!this.hasPermission('salary_advance_rule_edit')) return;
    const ruleId = this.resolveRuleId(rule);
    if (!ruleId) {
      this.notification.showError('Unable to update status for this rule');
      return;
    }

    const updatedRule = {
      ruleName: rule?.ruleName,
      description: rule?.description ?? null,
      maxPercentage: this.getMaxPercentage(rule),
      isActive: !rule?.isActive
    };
    this.payrollService.updateSalaryAdvanceRule(ruleId, updatedRule).subscribe({
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

  onDelete(rule: any): void {
    if (!this.hasPermission('salary_advance_rule_delete')) return;
    const ruleId = this.resolveRuleId(rule);
    if (!ruleId) {
      this.notification.showError('Unable to delete this rule');
      return;
    }

    const dialogData: ConfirmDeleteData = {
      title: 'Delete Rule',
      message: 'Are you sure you want to delete this salary advance rule?',
      itemName: rule?.ruleName || 'this rule',
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.payrollService.deleteSalaryAdvanceRule(ruleId).subscribe({
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

  trackByRuleId(index: number, rule: any): string {
    return this.resolveRuleId(rule) || String(index);
  }

  getMaxPercentage(rule: any): number | null {
    const rawValue = rule?.maxPercentage;
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return null;
    }

    const value = Number(rawValue);
    return Number.isFinite(value) ? value : null;
  }

  private resolveRuleId(rule: any): string {
    return String(rule?.ruleId ?? rule?.id ?? '');
  }

  hasPermission(actionKey: string): boolean {
    return hasPayrollRulePermission(this.authService, actionKey);
  }
}
