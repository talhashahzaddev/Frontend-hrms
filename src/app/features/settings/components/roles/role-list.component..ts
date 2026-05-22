import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { RoleService } from '../../services/role.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Role } from '../../../../core/models/role.models';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatDialogModule
  ],
  templateUrl: './role-list.component.html',
  styleUrls: ['./role-list.component.scss']
})
export class RoleListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  roles: Role[] = [];
  filteredRoles: Role[] = [];
  isLoading = false;
  pageSize = 10;

  displayedColumns: string[] = ['roleName', 'description', 'menusCount', 'createdAt', 'actions'];

  searchControl = new FormControl('');

  constructor(
    private roleService: RoleService,
    private notificationService: NotificationService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute
    , private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadRoles();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.applyFilter(value || '');
    });
  }

  private applyFilter(searchTerm: string): void {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredRoles = [...this.roles];
    } else {
      this.filteredRoles = this.roles.filter(role =>
        role.roleName.toLowerCase().includes(term) ||
        (role.description && role.description.toLowerCase().includes(term))
      );
    }
  }

  loadRoles(): void {
    this.isLoading = true;
    this.roleService.getRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (roles) => {
          this.roles = roles;
          this.filteredRoles = [...roles];
          this.isLoading = false;
        },
        error: () => {
          this.notificationService.showError('Failed to load roles');
          this.isLoading = false;
        }
      });
  }

  // ─── Navigation to full-page form ─────────────────────────────

  openAddRoleDialog(): void {
    this.router.navigate(['add'], {
      relativeTo: this.route,
      state: { mode: 'add' }
    });
  }

  viewRole(role: Role): void {
    this.router.navigate([role.roleId, 'view'], {
      relativeTo: this.route,
      state: { mode: 'view', role }
    });
  }

  editRole(role: Role): void {
    this.router.navigate([role.roleId, 'edit'], {
      relativeTo: this.route,
      state: { mode: 'edit', role }
    });
  }

  // ─── Delete (keep as dialog) ───────────────────────────────────

  deleteRole(role: Role): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Role',
      message: 'Are you sure you want to delete this role? This action cannot be undone.',
      itemName: role.roleName,
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.roleService.deleteRole(role.roleId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Role deleted successfully');
              this.loadRoles();
            },
            error: () => {
              this.notificationService.showError('Failed to delete role');
            }
          });
      }
    });
  }

  clearFilters(): void {
    this.searchControl.setValue('');
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Settings', 'Roles', actionKey);
  }

  formatDate(date: string): string {
    if (!date) return '—';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
}
