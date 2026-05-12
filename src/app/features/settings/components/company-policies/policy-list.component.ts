import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SettingsService, CompanyPolicy } from '../../services/settings.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { PolicyDialogComponent } from '../policy-dialog/policy-dialog.component';

@Component({
  selector: 'app-policy-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDialogModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './policy-list.component.html',
  styleUrls: ['./policy-list.component.scss']
})
export class PolicyListComponent implements OnInit, OnDestroy {
  policiesList: CompanyPolicy[] = [];
  dataSource = new MatTableDataSource<CompanyPolicy>();
  displayedColumns: string[] = ['policyName', 'category', 'isPublished', 'updatedAt', 'actions'];
  isLoading = false;
  isSuperAdmin = false;

  private destroy$ = new Subject<void>();

  constructor(
    private settingsService: SettingsService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.checkSuperAdminAccess();
    this.loadPolicies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkSuperAdminAccess(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isSuperAdmin = user?.roleName?.toLowerCase() === 'super admin';
      });
  }

  loadPolicies(): void {
    this.isLoading = true;
    this.settingsService.getPolicies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: policies => {
          this.policiesList = policies;
          this.dataSource.data = [...policies];
          this.isLoading = false;
        },
        error: () => {
          this.notificationService.showError('Failed to load policies');
          this.isLoading = false;
        }
      });
  }

  openAddDialog(): void {
    const ref = this.dialog.open(PolicyDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      panelClass: 'policy-dialog-panel',
      data: { mode: 'add', policy: null }
    });

    ref.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result === 'saved') {
          this.loadPolicies();
        }
      });
  }

  openEditDialog(policy: CompanyPolicy): void {
    const ref = this.dialog.open(PolicyDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      panelClass: 'policy-dialog-panel',
      data: { mode: 'edit', policy }
    });

    ref.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result === 'saved') {
          this.loadPolicies();
        }
      });
  }

  openViewDialog(policy: CompanyPolicy): void {
    this.dialog.open(PolicyDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      panelClass: 'policy-dialog-panel',
      data: { mode: 'view', policy }
    });
  }

  deletePolicy(policy: CompanyPolicy): void {
    const ref = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Policy',
        message: `Are you sure you want to delete "${policy.policyName}"? This action cannot be undone.`
      } as ConfirmDeleteData
    });

    ref.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(confirmed => {
        if (confirmed) {
          this.settingsService.deletePolicy(policy.policyId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.notificationService.showSuccess('Policy deleted successfully');
                this.loadPolicies();
              },
              error: () => this.notificationService.showError('Failed to delete policy')
            });
        }
      });
  }
}