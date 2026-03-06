// core/models/role.models.ts

// ── Menu API Response Models ──────────────────────────────────────────────────

export interface ApiAction {
  actionId: string;
  actionName: string;
  actionKey: string;
}

export interface ApiSubMenu {
  subMenuId: string;
  subMenuName: string;
  icon: string | null;
  actions: ApiAction[];
}

export interface ApiMenu {
  menuId: string;
  menuName: string;
  icon: string;
  subMenus: ApiSubMenu[];
}

export interface MenusResponse {
  success: boolean;
  data: ApiMenu[];
  message: string;
  errors: null | any;
}

// ── Permission Group Models (used in dialog UI) ───────────────────────────────

export interface ActionPermission {
  actionId: string;
  actionName: string;
  actionKey: string;
  hasPermission: boolean;
}

export interface SubMenuPermissionGroup {
  subMenuId: string;
  subMenuName: string;
  actions: ActionPermission[];
}

export interface MenuPermissionGroup {
  menuId: string;
  menuName: string;
  icon?: string;
  subMenus: SubMenuPermissionGroup[];
  // For menus with no submenus
  grantFullAccess?: boolean;
}

// ── API Request Models ────────────────────────────────────────────────────────

export interface CreateRoleActionPayload {
  actionId: string;
  hasPermission: boolean;
}

export interface CreateRoleSubMenuPayload {
  subMenuId: string;
  actions: CreateRoleActionPayload[];
}

export interface CreateRoleMenuPayload {
  menuId: string;
  subMenus: CreateRoleSubMenuPayload[];
}

export interface CreateRoleRequest {
  roleName: string;
  description: string;
  isSystemRole: boolean;
  menus: CreateRoleMenuPayload[];
}

export interface UpdateRoleRequest extends CreateRoleRequest {}

// ── Role List Response Model ──────────────────────────────────────────────────

export interface RoleActionResponse {
  actionId: string;
  actionName: string;
  actionKey: string;
  hasPermission: boolean;
}

export interface RoleSubMenuResponse {
  subMenuId: string;
  subMenuName: string;
  actions: RoleActionResponse[];
}

export interface RoleMenuResponse {
  menuId: string;
  menuName: string;
  subMenus: RoleSubMenuResponse[];
}

export interface Role {
  roleId: string;
  roleName: string;
  description?: string;
  isSystemRole: boolean;
  organizationId: string;
  createdAt: string;
  menus?: RoleMenuResponse[];
}
