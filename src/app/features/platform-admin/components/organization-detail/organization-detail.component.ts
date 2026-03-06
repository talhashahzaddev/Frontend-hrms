import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SuperAdminService } from '../../services/super-admin.service';
import { OrganizationDetail, SubscriptionHistoryItem } from '../../models/super-admin.models';
import { ManageSubscriptionDialogComponent } from '../manage-subscription-dialog/manage-subscription-dialog.component';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './organization-detail.component.html',
  styleUrls: ['./organization-detail.component.scss']
})
export class OrganizationDetailComponent implements OnInit, OnDestroy {
  orgId!: string;
  org: OrganizationDetail | null = null;
  isLoading = true;
  errorMessage = '';

  historyColumns = ['action', 'oldPlan', 'newPlan', 'performedBy', 'createdAt'];
  subscriptionHistory: SubscriptionHistoryItem[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private superAdminService: SuperAdminService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.orgId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.orgId) {
      this.router.navigate(['/platform-admin/organizations']);
      return;
    }
    this.loadOrganization();
  }

  loadOrganization(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.superAdminService.getOrganizationDetail(this.orgId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.org = res.data;
            this.subscriptionHistory = res.data.subscriptionHistory || [];
          } else {
            this.errorMessage = 'Organization not found.';
          }
          this.isLoading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load organization details.';
          this.isLoading = false;
        }
      });
  }

  openManageSubscription(): void {
    if (!this.org) return;

    const dialogRef = this.dialog.open(ManageSubscriptionDialogComponent, {
      width: '520px',
      data: {
        organizationId: this.orgId,
        organizationName: this.org.name,
        currentSubscription: this.org.subscription
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result === 'success') {
          this.loadOrganization();
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/platform-admin/organizations']);
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: '#4caf50',
      trial: '#9c27b0',
      expired: '#f44336',
      cancelled: '#757575',
      pending: '#ff9800'
    };
    return colors[status?.toLowerCase()] || '#bdbdbd';
  }

  getActionColor(action: string): string {
    const colors: Record<string, string> = {
      upgrade: '#4caf50',
      downgrade: '#ff9800',
      extend: '#2196f3',
      cancel: '#f44336',
      create: '#9c27b0'
    };
    return colors[action?.toLowerCase()] || '#757575';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
