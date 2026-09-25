export interface InviteUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  organizationName?: string | null;
}

export interface UserInvitation {
  invitationId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
  status: 'Pending' | 'Expired' | 'Completed';
  createdAt: string;
  expiresAt: string;
}

export interface UserInvitationFilter {
  search?: string;
  status?: string;
  page: number;
  pageSize: number;
}

export interface SetPasswordRequest {
  token: string;
  password: string;
  organizationName: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  firstName?: string;
  email?: string;
  organizationName?: string;
  requiresOrganization?: boolean;
  message?: string;
}
