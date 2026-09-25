import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import {
  PayrollService,
  SocialSecuritySchemeOption,
  SocialSecurityJurisdictionOption,
  SocialSecurityAuthorityOption
} from '../../services/payroll.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { hasPayrollRulePermission, watchPayrollRuleViewAccess } from '../../utils/payroll-rule-permissions';
import {
  ConfirmDeleteData,
  ConfirmDeleteDialogComponent
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import {
  AddSocialSecuritySchemeDialogComponent,
  SocialSecuritySchemeDialogPayload
} from '../dialogs/add-social-security-scheme-dialog/add-social-security-scheme-dialog.component';

import { SharedCommonModule } from '@shared/shared-common.module';

@Component({
  selector: 'app-social-security-schemes',
  standalone: true,
  imports: [
    SharedCommonModule, CommonModule, MatIconModule, RouterModule, MatDialogModule, MatProgressSpinnerModule, MatButtonModule
  ],
  templateUrl: './social-security-schemes.component.html',
  styleUrl: './social-security-schemes.component.scss'
})
export class SocialSecuritySchemesComponent implements OnInit {
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

  readonly schemes = signal<SocialSecuritySchemeOption[]>([]);
  readonly jurisdictions = signal<SocialSecurityJurisdictionOption[]>([]);
  readonly authorities = signal<SocialSecurityAuthorityOption[]>([]);
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
    const dialogRef = this.dialog.open(AddSocialSecuritySchemeDialogComponent, {
      width: '560px',
      data: {
        mode: 'create',
        jurisdictions: this.jurisdictions(),
        authorities: this.authorities()
      }
    });

    dialogRef.afterClosed().subscribe((payload: SocialSecuritySchemeDialogPayload | undefined) => {
      if (!payload) return;
      this.payrollService.createSocialSecurityScheme(payload).subscribe({
        next: () => {
          this.notification.showSuccess('Scheme created successfully');
          this.fetchSchemes();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to create scheme');
        }
      });
    });
  }

  editScheme(scheme: SocialSecuritySchemeOption): void {
    if (!this.hasPermission('social_security_rule_edit')) return;
    const dialogRef = this.dialog.open(AddSocialSecuritySchemeDialogComponent, {
      width: '560px',
      data: {
        mode: 'edit',
        jurisdictions: this.jurisdictions(),
        authorities: this.authorities(),
        initialValue: {
          jurisdictionId: scheme.jurisdictionId ?? '',
          authorityId: scheme.authorityId ?? null,
          schemeCode: scheme.schemeCode ?? '',
          schemeName: scheme.schemeName ?? '',
          schemeType: scheme.schemeType ?? null,
          mandatoryMode: scheme.mandatoryMode ?? null
        }
      }
    });

    dialogRef.afterClosed().subscribe((payload: SocialSecuritySchemeDialogPayload | undefined) => {
      if (!payload) return;
      this.payrollService.updateSocialSecurityScheme(scheme.schemeId, payload).subscribe({
        next: () => {
          this.notification.showSuccess('Scheme updated successfully');
          this.fetchSchemes();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to update scheme');
        }
      });
    });
  }

  deleteScheme(scheme: SocialSecuritySchemeOption): void {
    if (!this.hasPermission('social_security_rule_delete')) return;
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Scheme',
      message: 'Are you sure you want to delete this social security scheme?',
      itemName: scheme.schemeName || 'this scheme',
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result !== true) return;
      this.payrollService.deleteSocialSecurityScheme(scheme.schemeId).subscribe({
        next: () => {
          this.notification.showSuccess('Scheme deleted successfully');
          this.fetchSchemes();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to delete scheme');
        }
      });
    });
  }

  getJurisdictionName(jurisdictionId?: string): string {
    if (!jurisdictionId) return '-';
    const j = this.jurisdictions().find(x => x.jurisdictionId === jurisdictionId);
    return j?.jurisdictionName ?? '-';
  }

  getAuthorityName(authorityId?: string): string {
    if (!authorityId) return '-';
    const a = this.authorities().find(x => x.authorityId === authorityId);
    return a?.authorityName ?? '-';
  }

  private fetchData(): void {
    this.isLoading.set(true);
    this.payrollService.getSocialSecurityJurisdictions().subscribe({
      next: (jurisdictions) => {
        this.jurisdictions.set(jurisdictions || []);
        this.payrollService.getSocialSecurityAuthorities().subscribe({
          next: (authorities) => {
            this.authorities.set(authorities || []);
            this.fetchSchemes();
          },
          error: () => {
            this.fetchSchemes();
          }
        });
      },
      error: () => {
        this.fetchSchemes();
      }
    });
  }

  private fetchSchemes(): void {
    this.payrollService.getSocialSecuritySchemes().subscribe({
      next: (schemes) => {
        this.schemes.set(schemes || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load schemes');
        this.isLoading.set(false);
      }
    });
  }

  hasPermission(actionKey: string): boolean {
    return hasPayrollRulePermission(this.authService, actionKey);
  }
}
