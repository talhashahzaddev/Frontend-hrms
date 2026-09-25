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
  selector: 'app-attendance-deduction-rules',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './attendance-deduction-rules.component.html',
  styleUrl: './attendance-deduction-rules.component.scss'
})
export class AttendanceDeductionRulesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly settingsService = inject(SettingsService);
  private readonly authService = inject(AuthService);

  readonly deductionRules = signal<any[]>([]);
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

    watchPayrollRuleViewAccess(this.authService, 'attendance_deduction_rule_view', {
      onAllowed: () => this.fetchRules(),
      onDenied: () => this.isLoading.set(false)
    });
  }

  fetchRules(): void {
    if (!this.hasPermission('attendance_deduction_rule_view')) return;
    this.isLoading.set(true);
    this.payrollService.getAttendanceDeductionRules().subscribe({
      next: (data) => {
        this.deductionRules.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load attendance deduction rules');
        this.isLoading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/payroll/policies']);
  }

  openRuleDialog(): void {
    if (!this.hasPermission('attendance_deduction_rule_add')) return;
    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel',
      data: { policyId: 2, mode: 'create' } // Attendance Deduction Policy ID is 2
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.fetchRules();
      }
    });
  }

  editRule(rule: any): void {
    if (!this.hasPermission('attendance_deduction_rule_edit')) return;
    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel',
      data: {
        policyId: 2,
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
    if (!this.hasPermission('attendance_deduction_rule_edit')) return;
    const rule = this.deductionRules().find(r => r.ruleId === id);
    if (!rule) return;

    const updatedRule = { ...rule, isActive: !rule.isActive };
    this.payrollService.updateAttendanceDeductionRule(id, updatedRule).subscribe({
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
    if (!this.hasPermission('attendance_deduction_rule_delete')) return;
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Rule',
      message: 'Are you sure you want to delete this attendance deduction rule?',
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
        this.payrollService.deleteAttendanceDeductionRule(id).subscribe({
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
