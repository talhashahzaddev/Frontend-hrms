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
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleName: string;
}

export interface RegisterRequest {
  // Organization data
  companyName: string;
  organizationType: string;
  companySize: string;
  industry?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  zipCode?: string;
  companyPhone?: string;
  website?: string;
  
  // User data
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
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
  success: boolean;
  message: string;
  data?: T;
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
