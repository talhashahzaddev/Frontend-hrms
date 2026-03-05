import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { RoleService } from '../../services/role.service';
import { MenuService } from '../../services/menu.service';
import { Role, MenuPermissionGroup, SubMenuPermission } from '../../../../core/models/role.models';

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
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './role-dialog.component.html',
  styleUrls: ['./role-dialog.component.scss']
})
export class RoleDialogComponent implements OnInit {
  roleForm!: FormGroup;
  permissionGroups: MenuPermissionGroup[] = [];
  isLoadingMenus = false;
  isSaving = false;

  get isViewMode(): boolean { return this.data.mode === 'view'; }
  get isEditMode(): boolean { return this.data.mode === 'edit'; }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RoleDialogData,
    private roleService: RoleService,
    private menuService: MenuService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadMenus();
  }

  private buildForm(): void {
    const role = this.data.role;
    this.roleForm = this.fb.group({
      roleName: [{ value: role?.roleName || '', disabled: this.isViewMode }, [Validators.required, Validators.minLength(2)]],
      description: [{ value: role?.description || '', disabled: this.isViewMode }]
    });
  }

  private loadMenus(): void {
    this.isLoadingMenus = true;
    this.menuService.getMenus().subscribe({
      next: (response) => {
        this.buildPermissionGroups(response.data);
        // If editing or viewing, populate existing permissions
        if ((this.isEditMode || this.isViewMode) && this.data.role?.menus) {
          this.populatePermissions(this.data.role.menus);
        }
        this.isLoadingMenus = false;
      },
      error: () => {
        this.isLoadingMenus = false;
      }
    });
  }

  private buildPermissionGroups(menus: any[]): void {
    this.permissionGroups = menus.map(menu => {
      const subMenus: SubMenuPermission[] = menu.subMenus?.length
        ? menu.subMenus.map((sub: any) => ({
            subMenuId: sub.subMenuId,
            subMenuName: sub.subMenuName,
            canView: false,
            canAdd: false,
            canEdit: false,
            canDelete: false
          }))
        : [{
            subMenuId: menu.menuId + '_none',
            subMenuName: '__none__',
            canView: false,
            canAdd: false,
            canEdit: false,
            canDelete: false
          }];

      return {
        menuId: menu.menuId,
        menuName: menu.menuName,
        icon: menu.icon,
        subMenus
      };
    });
  }

  private populatePermissions(existingMenus: any[]): void {
    existingMenus.forEach(existingMenu => {
      const group = this.permissionGroups.find(g => g.menuId === existingMenu.menuId);
      if (!group) return;
      existingMenu.subMenus?.forEach((existingSub: any) => {
        const sub = group.subMenus.find(s => s.subMenuId === existingSub.subMenuId);
        if (sub) {
          sub.canView = existingSub.canView;
          sub.canAdd = existingSub.canAdd;
          sub.canEdit = existingSub.canEdit;
          sub.canDelete = existingSub.canDelete;
        }
      });
    });
  }

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

  onSubmit(): void {
    if (this.roleForm.invalid || this.isSaving) return;

    this.isSaving = true;

    // Build menus payload – only include menus that have at least one sub with a permission
    const menus = this.permissionGroups
      .map(group => {
        const validSubs = group.subMenus
          .filter(s => s.subMenuName !== '__none__')
          .map(sub => ({
            subMenuId: sub.subMenuId,
            canView: sub.canView,
            canAdd: sub.canAdd,
            canEdit: sub.canEdit,
            canDelete: sub.canDelete
          }));

        return {
          menuId: group.menuId,
          subMenus: validSubs
        };
      })
      .filter(m => m.subMenus.length > 0);

    const payload = {
      roleName: this.roleForm.get('roleName')!.value,
      description: this.roleForm.get('description')!.value || '',
      isSystemRole: false,
      organizationId: '00000000-0000-0000-0000-000000000000', // Backend overwrites with token org
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
      }
    });
  }

  onClose(): void {
    this.dialogRef.close(null);
  }
}
