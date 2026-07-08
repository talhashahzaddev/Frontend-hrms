import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';

import { RoleService } from '../../services/role.service';
import { MenuService } from '../../services/menu.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  Role,
  MenuPermissionGroup,
  ActionPermission,
  CreateRoleRequest,
  ApiMenu
} from '../../../../core/models/role.models';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSelectModule
  ],
  templateUrl: './role-form.component.html',
  styleUrls: ['./role-form.component.scss']
})
export class RoleFormComponent implements OnInit {
  roleForm!: FormGroup;
  permissionGroups: MenuPermissionGroup[] = [];
  availableRoles: Role[] = [];
  isLoadingMenus = false;
  isSaving = false;
  grantFullAccess = false;

  mode: 'add' | 'edit' | 'view' = 'add';
  role?: Role;

  get isViewMode(): boolean { return this.mode === 'view'; }
  get isEditMode(): boolean { return this.mode === 'edit'; }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private roleService: RoleService,
    private menuService: MenuService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    const state = history.state as { mode?: 'add' | 'edit' | 'view'; role?: Role };
    this.mode = state?.mode || (this.route.snapshot.data['mode'] as any) || 'add';
    this.role = state?.role;

    this.buildForm();
    this.loadMenus();
  }

  private buildForm(): void {
    this.roleForm = this.fb.group({
      baseRole: [{ value: '', disabled: this.isViewMode }],
      roleName: [
        { value: this.role?.roleName || '', disabled: this.isViewMode },
        [Validators.required, Validators.minLength(2)]
      ],
      description: [{ value: this.role?.description || '', disabled: this.isViewMode }]
    });
  }

  private loadMenus(): void {
    this.isLoadingMenus = true;
    this.menuService.getMenus().subscribe({
      next: (response) => {
        this.buildPermissionGroups(response.data);
        if ((this.isEditMode || this.isViewMode) && this.role?.menus) {
          this.populateExistingPermissions(this.role.menus);
        }
        // Also load base roles for dropdown
        this.loadBaseRoles();
      },
      error: () => {
        this.notificationService.showError('Failed to load menu permissions');
        this.isLoadingMenus = false;
      }
    });
  }

  private loadBaseRoles(): void {
    this.roleService.getRoles().subscribe({
      next: (roles) => {
        this.availableRoles = roles.filter(r => !r.roleId?.startsWith('temp-'));
        this.isLoadingMenus = false;
      },
      error: () => {
        this.notificationService.showError('Failed to load base roles');
        this.isLoadingMenus = false;
      }
    });
  }

  private buildPermissionGroups(menus: ApiMenu[]): void {
    this.permissionGroups = menus.map(menu => ({
      menuId: menu.menuId,
      menuName: menu.menuName,
      icon: menu.icon,
      subMenus: (menu.subMenus || []).map(sub => ({
        subMenuId: sub.subMenuId,
        subMenuName: sub.subMenuName,
        actions: (sub.actions || []).map(action => ({
          actionId: action.actionId,
          actionName: action.actionName,
          actionKey: action.actionKey,
          hasPermission: false
        }))
      }))
    }));
  }

  onBaseRoleChange(selectedRoleId: string): void {
    if (!selectedRoleId) {
      // Reset permissions if no base role selected
      this.resetPermissions();
      return;
    }

    // Find the selected role
    const selectedRole = this.availableRoles.find(r => r.roleId === selectedRoleId);
    if (selectedRole && selectedRole.menus) {
      this.applyRolePermissions(selectedRole);
    }
  }

  private applyRolePermissions(role: Role): void {
    if (!role.menus || role.menus.length === 0) {
      this.resetPermissions();
      return;
    }
    // Reset first
    this.resetPermissions();

    // Apply permissions from the selected role
    role.menus.forEach(roleMenu => {
      const group = this.permissionGroups.find(g => g.menuId === roleMenu.menuId);
      if (!group) return;

      roleMenu.subMenus?.forEach(roleSub => {
        const sub = group.subMenus.find(s => s.subMenuId === roleSub.subMenuId);
        if (!sub) return;

        roleSub.actions?.forEach(roleAction => {
          // Match by actionId first, then by actionKey as fallback
          const action = sub.actions.find(
            a => a.actionId === roleAction.actionId || a.actionKey === roleAction.actionKey
          );
          if (action) {
            action.hasPermission = roleAction.hasPermission;
          }
        });
      });
    });

    // Force UI update
    this.permissionGroups = [...this.permissionGroups];
  }

  private resetPermissions(): void {
    this.permissionGroups.forEach(group =>
      group.subMenus.forEach(sub =>
        sub.actions.forEach(action => action.hasPermission = false)
      )
    );
  }

  private populateExistingPermissions(existingMenus: any[]): void {
    existingMenus.forEach(existingMenu => {
      const group = this.permissionGroups.find(g => g.menuId === existingMenu.menuId);
      if (!group) return;

      existingMenu.subMenus?.forEach((existingSub: any) => {
        const sub = group.subMenus.find(s => s.subMenuId === existingSub.subMenuId);
        if (!sub) return;

        existingSub.actions?.forEach((existingAction: any) => {
          const action = sub.actions.find(a => a.actionKey === existingAction.actionKey);
          if (action) action.hasPermission = existingAction.hasPermission;
        });
      });
    });
  }

  // ─── Toggle helpers ────────────────────────────────────────────

  private getAllActionsForMenu(group: MenuPermissionGroup): ActionPermission[] {
    return group.subMenus.flatMap(sub => sub.actions);
  }

  isMenuFullyEnabled(group: MenuPermissionGroup): boolean {
    const all = this.getAllActionsForMenu(group);
    return all.length > 0 && all.every(a => a.hasPermission);
  }

  isMenuPartiallyEnabled(group: MenuPermissionGroup): boolean {
    const all = this.getAllActionsForMenu(group);
    const enabled = all.filter(a => a.hasPermission).length;
    return enabled > 0 && enabled < all.length;
  }

  toggleAllMenuActions(group: MenuPermissionGroup, event: Event): void {
    if (this.isViewMode) return;
    const checked = (event.target as HTMLInputElement).checked;
    this.getAllActionsForMenu(group).forEach(a => a.hasPermission = checked);
  }

  onGrantFullAccessChange(): void {
    this.permissionGroups.forEach(group =>
      this.getAllActionsForMenu(group).forEach(a => a.hasPermission = this.grantFullAccess)
    );
  }

  // ─── Count helpers ─────────────────────────────────────────────

  getEnabledCount(group: MenuPermissionGroup): number {
    return this.getAllActionsForMenu(group).filter(a => a.hasPermission).length;
  }

  getTotalCount(group: MenuPermissionGroup): number {
    return this.getAllActionsForMenu(group).length;
  }

  // ─── Icon map ──────────────────────────────────────────────────

  getMenuIcon(menuName: string): string {
    const iconMap: Record<string, string> = {
      'Employee Management': 'people',
      'Attendance': 'schedule',
      'Timesheet': 'date_range',
      'Leave Management': 'event_available',
      'Assets Management': 'inventory_2',
      'Performance': 'trending_up',
      'Expense': 'receipt_long',
      'News': 'rss_feed',
      'Jobs': 'work',
      'Settings': 'settings',
      'Dashboard': 'dashboard',
      'Subscription': 'credit_card',
      'AI Assistant': 'smart_toy',
      'Calendar': 'calendar_month',
      'Recruitment': 'person_add'
    };
    return iconMap[menuName] || 'widgets';
  }

  // ─── Navigation ────────────────────────────────────────────────

  onBack(): void {
    this.router.navigate(['/settings/roles']);
  }

  // ─── Submit ────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.roleForm.invalid || this.isSaving) return;
    this.isSaving = true;

    // Build the menus array — shape matches MenuPermissionDto on the backend
    const menus = this.permissionGroups
      .map(group => ({
        menuId: group.menuId,
        subMenus: group.subMenus
          .filter(sub => sub.actions.length > 0)
          .map(sub => ({
            subMenuId: sub.subMenuId,
            actions: sub.actions.map(action => ({
              actionId: action.actionId,      // Guid required by ActionPermissionDto
              hasPermission: action.hasPermission
            }))
          }))
      }))
      .filter(m => m.subMenus.length > 0);

    // Base payload shared by both create and update
    const payload: CreateRoleRequest = {
      roleName: this.roleForm.get('roleName')!.value,
      description: this.roleForm.get('description')!.value || '',
      isSystemRole: false,
      menus
    };

    // For edit: roleService.updateRole injects roleId into the body automatically
    const request$ = this.isEditMode
      ? this.roleService.updateRole(this.role!.roleId, payload)
      : this.roleService.createRole(payload);

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.notificationService.showSuccess(
          this.isEditMode ? 'Role updated successfully' : 'Role created successfully'
        );
        this.onBack();
      },
      error: (err) => {
        this.isSaving = false;
        const message = err?.message
          || (this.isEditMode ? 'Failed to update role' : 'Failed to create role');
        this.notificationService.showError(message);
      }
    });
  }
}

