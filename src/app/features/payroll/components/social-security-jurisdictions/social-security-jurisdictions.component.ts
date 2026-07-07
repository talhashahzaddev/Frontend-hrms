import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import {
  PayrollService,
  SocialSecurityJurisdictionOption
} from '../../services/payroll.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { hasPayrollRulePermission, watchPayrollRuleViewAccess } from '../../utils/payroll-rule-permissions';
import {
  ConfirmDeleteData,
  ConfirmDeleteDialogComponent
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import {
  AddSocialSecurityJurisdictionDialogComponent,
  SocialSecurityJurisdictionDialogPayload
} from '../dialogs/add-social-security-jurisdiction-dialog/add-social-security-jurisdiction-dialog.component';

import { SharedCommonModule } from '@shared/shared-common.module';

@Component({
  selector: 'app-social-security-jurisdictions',
  standalone: true,
  imports: [
    SharedCommonModule, CommonModule, MatIconModule, RouterModule, MatDialogModule, MatProgressSpinnerModule, MatButtonModule
  ],
  templateUrl: './social-security-jurisdictions.component.html',
  styleUrl: './social-security-jurisdictions.component.scss'
})
export class SocialSecurityJurisdictionsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly ssTabs = [
    { key: 'jurisdictions', label: 'Jurisdictions', route: '/payroll/policies/social-security-jurisdictions' },
    { key: 'authorities', label: 'Authorities', route: '/payroll/policies/social-security-authorities' },
    { key: 'schemes', label: 'Schemes', route: '/payroll/policies/social-security-schemes' },
    { key: 'rules', label: 'Rules', route: '/payroll/policies/social-security-rules' }
  ];

  readonly jurisdictions = signal<SocialSecurityJurisdictionOption[]>([]);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    watchPayrollRuleViewAccess(this.authService, 'social_security_rule_view', {
      onAllowed: () => this.fetchJurisdictions(),
      onDenied: () => this.isLoading.set(false)
    });
  }

  goBack(): void {
    this.router.navigate(['/payroll/social-security']);
  }

  navigateToTab(route: string): void {
    this.router.navigate([route]);
  }

  openCreateDialog(): void {
    if (!this.hasPermission('social_security_rule_add')) return;
    const dialogRef = this.dialog.open(AddSocialSecurityJurisdictionDialogComponent, {
      width: '560px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe((payload: SocialSecurityJurisdictionDialogPayload | undefined) => {
      if (!payload) return;
      this.payrollService.createSocialSecurityJurisdiction(payload).subscribe({
        next: () => {
          this.notification.showSuccess('Jurisdiction created successfully');
          this.fetchJurisdictions();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to create jurisdiction');
        }
      });
    });
  }

  editJurisdiction(jurisdiction: SocialSecurityJurisdictionOption): void {
    if (!this.hasPermission('social_security_rule_edit')) return;
    const dialogRef = this.dialog.open(AddSocialSecurityJurisdictionDialogComponent, {
      width: '560px',
      data: {
        mode: 'edit',
        initialValue: {
          jurisdictionCode: jurisdiction.jurisdictionCode ?? '',
          jurisdictionName: jurisdiction.jurisdictionName ?? '',
          countryCode: jurisdiction.countryCode ?? null,
          currency: jurisdiction.currency ?? null,
          isDefault: jurisdiction.isDefault ?? false
        }
      }
    });

    dialogRef.afterClosed().subscribe((payload: SocialSecurityJurisdictionDialogPayload | undefined) => {
      if (!payload) return;
      this.payrollService.updateSocialSecurityJurisdiction(jurisdiction.jurisdictionId, payload).subscribe({
        next: () => {
          this.notification.showSuccess('Jurisdiction updated successfully');
          this.fetchJurisdictions();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to update jurisdiction');
        }
      });
    });
  }

  deleteJurisdiction(jurisdiction: SocialSecurityJurisdictionOption): void {
    if (!this.hasPermission('social_security_rule_delete')) return;
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Jurisdiction',
      message: 'Are you sure you want to delete this social security jurisdiction?',
      itemName: jurisdiction.jurisdictionName || 'this jurisdiction',
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result !== true) return;
      this.payrollService.deleteSocialSecurityJurisdiction(jurisdiction.jurisdictionId).subscribe({
        next: () => {
          this.notification.showSuccess('Jurisdiction deleted successfully');
          this.fetchJurisdictions();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to delete jurisdiction');
        }
      });
    });
  }

  private fetchJurisdictions(): void {
    this.isLoading.set(true);
    this.payrollService.getSocialSecurityJurisdictions().subscribe({
      next: (jurisdictions) => {
        this.jurisdictions.set(jurisdictions || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load jurisdictions');
        this.isLoading.set(false);
      }
    });
  }

  hasPermission(actionKey: string): boolean {
    return hasPayrollRulePermission(this.authService, actionKey);
  }
}
