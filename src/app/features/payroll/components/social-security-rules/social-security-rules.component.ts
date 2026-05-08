import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import {
  PayrollService,
  SocialSecurityRuleOption,
  SocialSecuritySchemeOption
} from '../../services/payroll.service';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { RuleDialogComponent } from '../dialogs/rule-dialog/rule-dialog.component';

@Component({
  selector: 'app-social-security-rules',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './social-security-rules.component.html',
  styleUrl: './social-security-rules.component.scss'
})
export class SocialSecurityRulesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);

  readonly rules = signal<SocialSecurityRuleOption[]>([]);
  readonly schemes = signal<SocialSecuritySchemeOption[]>([]);
  readonly isLoading = signal(true);

  readonly schemeMap = computed(() => {
    const map = new Map<string, string>();
    for (const scheme of this.schemes()) {
      map.set(String(scheme.schemeId), String(scheme.schemeName));
    }
    return map;
  });

  ngOnInit(): void {
    this.fetchRules();
  }

  fetchRules(): void {
    this.isLoading.set(true);

    this.payrollService.getSocialSecuritySchemes().pipe(take(1)).subscribe({
      next: (schemes) => {
        this.schemes.set(schemes ?? []);
      },
      error: () => {
        this.schemes.set([]);
      }
    });

    this.payrollService.getSocialSecurityRules().pipe(take(1)).subscribe({
      next: (rules) => {
        this.rules.set(rules ?? []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.rules.set([]);
        this.notification.showError('Failed to load social security rules');
        this.isLoading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/payroll/policies']);
  }

  getSchemeName(schemeId?: string): string {
    if (!schemeId) {
      return '-';
    }
    return this.schemeMap().get(String(schemeId)) ?? '-';
  }

  openRuleDialog(): void {
    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel',
      data: { policyId: 11, mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.fetchRules();
      }
    });
  }

  editRule(rule: SocialSecurityRuleOption): void {
    if (!(rule.isActive ?? true)) {
      this.notification.showError('Enable this rule before editing.');
      return;
    }

    const dialogRef = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      panelClass: 'rule-dialog-panel',
      data: {
        policyId: 11,
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

  isRuleActive(rule: SocialSecurityRuleOption): boolean {
    return rule.isActive ?? true;
  }

  onToggleStatus(rule: SocialSecurityRuleOption): void {
    if (!rule?.ruleId) {
      this.notification.showError('Unable to toggle status for this rule.');
      return;
    }

    const payload = {
      schemeId: String(rule.schemeId ?? ''),
      ruleName: String(rule.ruleName ?? '').trim(),
      description: rule.description ? String(rule.description).trim() : null,
      contributionBasis: String(rule.contributionBasis ?? 'gross').toLowerCase(),
      employeeDefaultPct: Number(rule.employeeDefaultPct ?? 0),
      employerDefaultPct: Number(rule.employerDefaultPct ?? 0),
      employeeFixedAmount: rule.employeeFixedAmount == null ? null : Number(rule.employeeFixedAmount),
      employerFixedAmount: rule.employerFixedAmount == null ? null : Number(rule.employerFixedAmount),
      minSalaryLimit: rule.minSalaryLimit == null ? null : Number(rule.minSalaryLimit),
      maxSalaryLimit: rule.maxSalaryLimit == null ? null : Number(rule.maxSalaryLimit),
      annualSalaryCap: rule.annualSalaryCap == null ? null : Number(rule.annualSalaryCap),
      effectiveFrom: rule.effectiveFrom ? String(rule.effectiveFrom).slice(0, 10) : null,
      effectiveTo: rule.effectiveTo ? String(rule.effectiveTo).slice(0, 10) : null,
      isActive: !(rule.isActive ?? true)
    };

    this.payrollService.updateSocialSecurityRule(rule.ruleId, payload).pipe(take(1)).subscribe({
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

  onDelete(rule: SocialSecurityRuleOption): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Rule',
      message: 'Are you sure you want to delete this social security rule?',
      itemName: rule.ruleName || 'this rule',
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result !== true) {
        return;
      }

      this.payrollService.deleteSocialSecurityRule(rule.ruleId).pipe(take(1)).subscribe({
        next: () => {
          this.notification.showSuccess('Rule deleted successfully');
          this.fetchRules();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to delete rule');
        }
      });
    });
  }
}
