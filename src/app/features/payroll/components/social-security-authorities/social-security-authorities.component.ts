import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import {
  PayrollService,
  SocialSecurityAuthorityOption,
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
  AddSocialSecurityAuthorityDialogComponent,
  SocialSecurityAuthorityDialogPayload
} from '../dialogs/add-social-security-authority-dialog/add-social-security-authority-dialog.component';

import { SharedCommonModule } from '@shared/shared-common.module';

@Component({
  selector: 'app-social-security-authorities',
  standalone: true,
  imports: [
    SharedCommonModule, CommonModule, MatIconModule, RouterModule, MatDialogModule, MatProgressSpinnerModule, MatButtonModule
  ],
  templateUrl: './social-security-authorities.component.html',
  styleUrl: './social-security-authorities.component.scss'
})
export class SocialSecurityAuthoritiesComponent implements OnInit {
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

  readonly authorities = signal<SocialSecurityAuthorityOption[]>([]);
  readonly jurisdictions = signal<SocialSecurityJurisdictionOption[]>([]);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    watchPayrollRuleViewAccess(this.authService, 'social_security_rule_view', {
      onAllowed: () => this.fetchData(),
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
    const dialogRef = this.dialog.open(AddSocialSecurityAuthorityDialogComponent, {
      width: '560px',
      data: {
        mode: 'create',
        jurisdictions: this.jurisdictions()
      }
    });

    dialogRef.afterClosed().subscribe((payload: SocialSecurityAuthorityDialogPayload | undefined) => {
      if (!payload) return;
      this.payrollService.createSocialSecurityAuthority(payload).subscribe({
        next: () => {
          this.notification.showSuccess('Authority created successfully');
          this.fetchAuthorities();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to create authority');
        }
      });
    });
  }

  editAuthority(authority: SocialSecurityAuthorityOption): void {
    if (!this.hasPermission('social_security_rule_edit')) return;
    const dialogRef = this.dialog.open(AddSocialSecurityAuthorityDialogComponent, {
      width: '560px',
      data: {
        mode: 'edit',
        jurisdictions: this.jurisdictions(),
        initialValue: {
          jurisdictionId: authority.jurisdictionId ?? '',
          authorityCode: authority.authorityCode ?? '',
          authorityName: authority.authorityName ?? '',
          portalUrl: authority.portalUrl ?? null,
          remittanceFrequency: authority.remittanceFrequency ?? null
        }
      }
    });

    dialogRef.afterClosed().subscribe((payload: SocialSecurityAuthorityDialogPayload | undefined) => {
      if (!payload) return;
      this.payrollService.updateSocialSecurityAuthority(authority.authorityId, payload).subscribe({
        next: () => {
          this.notification.showSuccess('Authority updated successfully');
          this.fetchAuthorities();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to update authority');
        }
      });
    });
  }

  deleteAuthority(authority: SocialSecurityAuthorityOption): void {
    if (!this.hasPermission('social_security_rule_delete')) return;
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Authority',
      message: 'Are you sure you want to delete this social security authority?',
      itemName: authority.authorityName || 'this authority',
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result !== true) return;
      this.payrollService.deleteSocialSecurityAuthority(authority.authorityId).subscribe({
        next: () => {
          this.notification.showSuccess('Authority deleted successfully');
          this.fetchAuthorities();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to delete authority');
        }
      });
    });
  }

  getJurisdictionName(jurisdictionId?: string): string {
    if (!jurisdictionId) return '-';
    const j = this.jurisdictions().find(x => x.jurisdictionId === jurisdictionId);
    return j?.jurisdictionName ?? '-';
  }

  private fetchData(): void {
    this.isLoading.set(true);
    this.payrollService.getSocialSecurityJurisdictions().subscribe({
      next: (jurisdictions) => {
        this.jurisdictions.set(jurisdictions || []);
        this.fetchAuthorities();
      },
      error: () => {
        this.fetchAuthorities();
      }
    });
  }

  private fetchAuthorities(): void {
    this.payrollService.getSocialSecurityAuthorities().subscribe({
      next: (authorities) => {
        this.authorities.set(authorities || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load authorities');
        this.isLoading.set(false);
      }
    });
  }

  hasPermission(actionKey: string): boolean {
    return hasPayrollRulePermission(this.authService, actionKey);
  }
}
