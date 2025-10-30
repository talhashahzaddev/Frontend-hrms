export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName: string;
  organizationName: string;
  token: string;
  refreshToken: string;
  tokenExpiration: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName: string;
  organizationName: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  role?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
 profilePictureUrl?: string;

}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleName: string;
}

export interface RegisterRequest {
  // Organization data (maps to auth.organizations table)
  companyName: string;
  website?: string;
  companySize: string; // Used to determine subscription type
  
  // User data (maps to auth.users table)
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ApiResponse<T> {
   data?: T;
  success: boolean;
  message: string;
  errors?: string[];
}

export interface PagedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
