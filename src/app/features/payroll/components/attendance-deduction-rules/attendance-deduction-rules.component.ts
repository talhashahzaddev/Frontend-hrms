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
import { RuleDialogComponent } from '../rule-dialog/rule-dialog.component';

@Component({
  selector: 'app-attendance-deduction-rules',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './attendance-deduction-rules.component.html',
  styleUrl: './attendance-deduction-rules.component.scss'
})
export class AttendanceDeductionRulesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly settingsService = inject(SettingsService);

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

    this.fetchRules();
  }

  fetchRules(): void {
    this.isLoading.set(true);
    // Note: Since deduction rule specific API methods are not yet in PayrollService, 
    // we use mock data for now to match the provided stitch design.
    setTimeout(() => {
      this.deductionRules.set([
        { 
          ruleId: '1', 
          ruleName: 'Standard Deduction', 
          fixedDeduction: 1000, 
          percentageDeduction: null, 
          halfDayMultiplier: 0.50, 
          isActive: true 
        },
        { 
          ruleId: '2', 
          ruleName: 'Strict Deduction', 
          fixedDeduction: null, 
          percentageDeduction: 10, 
          halfDayMultiplier: 0.50, 
          isActive: true 
        },
        { 
          ruleId: '3', 
          ruleName: 'Lenient Deduction', 
          fixedDeduction: 500, 
          percentageDeduction: null, 
          halfDayMultiplier: 0.25, 
          isActive: false 
        }
      ]);
      this.isLoading.set(false);
    }, 800);

    /* 
    // Real implementation would look like this:
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
    */
  }

  goBack(): void {
    this.router.navigate(['/payroll/policies']);
  }

  openRuleDialog(): void {
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
    // Mock status toggle
    const currentRules = this.deductionRules();
    const ruleIndex = currentRules.findIndex(r => r.ruleId === id);
    if (ruleIndex !== -1) {
      currentRules[ruleIndex].isActive = !currentRules[ruleIndex].isActive;
      this.deductionRules.set([...currentRules]);
      this.notification.showSuccess('Status updated successfully');
    }
    
    /*
    this.payrollService.toggleAttendanceDeductionRuleStatus(id).subscribe({
      next: () => {
        this.notification.showSuccess('Status updated successfully');
        this.fetchRules();
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to toggle status');
      }
    });
    */
  }

  onDelete(id: string, ruleName?: string): void {
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
        // Mock delete
        this.deductionRules.set(this.deductionRules().filter(r => r.ruleId !== id));
        this.notification.showSuccess('Rule deleted successfully');

        /*
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
        */
      }
    });
  }
}
