import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
  selector: 'app-leave-deduction-rules',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './leave-deduction-rules.component.html',
  styleUrl: './leave-deduction-rules.component.scss'
})
export class LeaveDeductionRulesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly settingsService = inject(SettingsService);

  readonly leaveRules = signal<any[]>([]);
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
    this.payrollService.getLeaveRules().subscribe({
      next: (data) => {
        this.leaveRules.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load leave deduction rules');
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
      data: { policyId: 4, mode: 'create' } // Leave Deduction Policy ID is 4
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
        policyId: 4,
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
    const rule = this.leaveRules().find(r => r.ruleId === id);
    if (!rule) return;

    const updatedRule = { ...rule, isActive: !rule.isActive };
    this.payrollService.updateLeaveRule(id, updatedRule).subscribe({
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
      message: 'Are you sure you want to delete this leave deduction rule?',
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
        this.payrollService.deleteLeaveRule(id).subscribe({
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
}
