// ========== Global Role API Response Models ==========

export interface GlobalRoleAction {
  actionId: string;
  actionName: string;
  actionKey: string;
  hasPermission: boolean;
}

export interface GlobalRoleSubMenu {
  subMenuId: string;
  subMenuName: string;
  actions: GlobalRoleAction[];
}

export interface GlobalRoleMenu {
  menuId: string;
  menuName: string;
  subMenus: GlobalRoleSubMenu[];
}

export interface GlobalRole {
  roleId: string;
  roleName: string;
  description?: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissionsCount: number;
  menus?: GlobalRoleMenu[];
}

// ========== Create / Update Request Models ==========

export interface CreateGlobalRoleActionPayload {
  actionId: string;
  hasPermission: boolean;
}

export interface CreateGlobalRoleSubMenuPayload {
  subMenuId: string;
  actions: CreateGlobalRoleActionPayload[];
}

export interface CreateGlobalRoleMenuPayload {
  menuId: string;
  subMenus: CreateGlobalRoleSubMenuPayload[];
}

export interface CreateGlobalRoleRequest {
  roleName: string;
  description: string;
  menus: CreateGlobalRoleMenuPayload[];
}

export interface UpdateGlobalRoleRequest extends CreateGlobalRoleRequest {
  roleId: string;
}
