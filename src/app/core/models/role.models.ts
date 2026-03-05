// core/models/role.models.ts

export interface SubMenuPermission {
  subMenuId: string;
  subMenuName: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface MenuPermissionGroup {
  menuId: string;
  menuName: string;
  icon?: string;
  subMenus: SubMenuPermission[];
}

export interface RoleMenuPayload {
  menuId: string;
  subMenus: {
    subMenuId: string;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }[];
}

export interface CreateRoleRequest {
  roleName: string;
  description: string;
  isSystemRole: boolean;
  organizationId: string;
  menus: RoleMenuPayload[];
}

export interface UpdateRoleRequest extends CreateRoleRequest {}

export interface Role {
  roleId: string;
  roleName: string;
  description?: string;
  isSystemRole: boolean;
  organizationId: string;
  createdAt: string;
  menus?: RoleMenuPayload[];
}

