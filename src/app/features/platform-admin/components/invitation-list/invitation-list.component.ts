import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

import { SuperAdminService } from '../../services/super-admin.service';
import { UserInvitation, UserInvitationFilter } from '../../models/user-invitation.models';
import { InviteUserDialogComponent } from '../invite-user-dialog/invite-user-dialog.component';
import { NotificationService } from '../../../../core/services/notification.service';

import { SharedCommonModule } from '@shared/shared-common.module';

@Component({
  selector: 'app-invitation-list',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule
  ],
  templateUrl: './invitation-list.component.html',
  styleUrls: ['./invitation-list.component.scss']
})
export class InvitationListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['name', 'email', 'organizationName', 'status', 'createdAt', 'actions'];

  invitations: UserInvitation[] = [];
  totalCount = 0;
  isLoading = true;

  // Filters
  searchTerm = '';
  statusFilter = '';

  // Pagination
  pageIndex = 0;
  pageSize = 15;

  statusOptions = ['Pending', 'Expired', 'Completed'];

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private superAdminService: SuperAdminService,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadInvitations();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.pageIndex = 0;
      this.loadInvitations();
    });
  }

  loadInvitations(): void {
    this.isLoading = true;

    const filter: UserInvitationFilter = {
      search: this.searchTerm || undefined,
      status: this.statusFilter || undefined,
      page: this.pageIndex + 1,
      pageSize: this.pageSize
    };

    this.superAdminService.getInvitations(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.data) {
            this.invitations = response.data.data;
            this.totalCount = response.data.totalCount;
          }
        },
        error: () => {
          this.isLoading = false;
          this.notificationService.showError('Failed to load invitations.');
        }
      });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  onStatusFilter(): void {
    this.pageIndex = 0;
    this.loadInvitations();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadInvitations();
  }

  openInviteDialog(): void {
    const dialogRef = this.dialog.open(InviteUserDialogComponent, {
      width: '480px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInvitations();
      }
    });
  }

  resendInvitation(invitation: UserInvitation): void {
    this.superAdminService.resendInvitation(invitation.invitationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess(`Invitation resent to ${invitation.email}`);
            this.loadInvitations();
          } else {
            this.notificationService.showError(response.message || 'Failed to resend invitation.');
          }
        },
        error: (error) => {
          this.notificationService.showError(error?.error?.message || 'Failed to resend invitation.');
        }
      });
  }

  deleteInvitation(invitation: UserInvitation): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Invitation',
        message: 'Are you sure you want to delete the invitation for',
        itemName: invitation.email,
        confirmButtonText: 'Delete'
      } as ConfirmDeleteData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.superAdminService.deleteInvitation(invitation.invitationId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.notificationService.showSuccess('Invitation deleted.');
                this.loadInvitations();
              } else {
                this.notificationService.showError(response.message || 'Failed to delete invitation.');
              }
            },
            error: (error) => {
              this.notificationService.showError(error?.error?.message || 'Failed to delete invitation.');
            }
          });
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed': return 'status-completed';
      case 'pending': return 'status-pending';
      case 'expired': return 'status-expired';
      default: return '';
    }
  }

  canResend(status: string): boolean {
    return status === 'Pending' || status === 'Expired';
  }

  canDelete(status: string): boolean {
    return status === 'Pending' || status === 'Expired';
  }
}
