import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { RoleService } from '../../services/role.service';
import { MenuService } from '../../services/menu.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  Role,
  MenuPermissionGroup,
  SubMenuPermissionGroup,
  ActionPermission,
  CreateRoleRequest,
  ApiMenu
} from '../../../../core/models/role.models';

export interface RoleDialogData {
  mode: 'add' | 'edit' | 'view';
  role?: Role;
}

@Component({
  selector: 'app-role-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './role-dialog.component.html',
  styleUrls: ['./role-dialog.component.scss']
})
export class RoleDialogComponent implements OnInit {
  roleForm!: FormGroup;
  permissionGroups: MenuPermissionGroup[] = [];
  isLoadingMenus = false;
  isSaving = false;
  grantFullAccess = false;

  get isViewMode(): boolean { return this.data.mode === 'view'; }
  get isEditMode(): boolean { return this.data.mode === 'edit'; }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RoleDialogData,
    private roleService: RoleService,
    private menuService: MenuService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadMenus();
  }

  private buildForm(): void {
    const role = this.data.role;
    this.roleForm = this.fb.group({
      roleName: [
        { value: role?.roleName || '', disabled: this.isViewMode },
        [Validators.required, Validators.minLength(2)]
      ],
      description: [{ value: role?.description || '', disabled: this.isViewMode }]
    });
  }

  private loadMenus(): void {
    this.isLoadingMenus = true;
    this.menuService.getMenus().subscribe({
      next: (response) => {
        this.buildPermissionGroups(response.data);
        if ((this.isEditMode || this.isViewMode) && this.data.role?.menus) {
          this.populateExistingPermissions(this.data.role.menus);
        }
        this.isLoadingMenus = false;
      },
      error: () => {
        this.notificationService.showError('Failed to load menu permissions');
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

  private populateExistingPermissions(existingMenus: any[]): void {
  existingMenus.forEach(existingMenu => {
    const group = this.permissionGroups.find(g => g.menuId === existingMenu.menuId);
    if (!group) return;

    existingMenu.subMenus?.forEach((existingSub: any) => {
      const sub = group.subMenus.find(s => s.subMenuId === existingSub.subMenuId);
      if (!sub) return;

      existingSub.actions?.forEach((existingAction: any) => {
        // FIX: match by actionKey instead of actionId
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

  // ─── Count helpers (for card footer) ──────────────────────────

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
      'Leave Management': 'event_available',
      'Payroll': 'payments',
      'Assets Management': 'inventory_2',
      'Performance': 'trending_up',
      'Expense': 'receipt_long',
      'News': 'rss_feed',
      'Jobs': 'work',
      'Settings': 'settings',
      'Dashboard': 'dashboard',
      'Subscription': 'credit_card',
      'AI Assistant': 'smart_toy',
      'Calendar': 'calendar_month'
    };
    return iconMap[menuName] || 'widgets';
  }

  // ─── Submit ────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.roleForm.invalid || this.isSaving) return;
    this.isSaving = true;

    const menus = this.permissionGroups
      .map(group => ({
        menuId: group.menuId,
        subMenus: group.subMenus
          .filter(sub => sub.actions.length > 0)
          .map(sub => ({
            subMenuId: sub.subMenuId,
            actions: sub.actions.map(action => ({
              actionId: action.actionId,
              hasPermission: action.hasPermission
            }))
          }))
      }))
      .filter(m => m.subMenus.length > 0);

    const payload: CreateRoleRequest = {
      roleName: this.roleForm.get('roleName')!.value,
      description: this.roleForm.get('description')!.value || '',
      isSystemRole: false,
      menus
    };

    const request$ = this.isEditMode
      ? this.roleService.updateRole(this.data.role!.roleId, payload)
      : this.roleService.createRole(payload);

    request$.subscribe({
      next: (result) => {
        this.isSaving = false;
        this.dialogRef.close(result);
      },
      error: () => {
        this.isSaving = false;
        this.notificationService.showError(
          this.isEditMode ? 'Failed to update role' : 'Failed to create role'
        );
      }
    });
  }

  onClose(): void {
    this.dialogRef.close(null);
  }
}
