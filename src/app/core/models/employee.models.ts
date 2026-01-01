export interface Employee {
  employeeId: string;
  organizationId: string;
  departmentId?:String;
  positionId?:string;
  reportingManagerId?:string;
  reportingManagerName?:string;
  departmentName?: string;
  positionTitle?:string;
  payType?:string;
  employmentType?:string;
  roleId?:string;
  userId?: string;
  employeeCode: string;
  employeeNumber:string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  address?: any;
  emergencyContact?: any;
  maritalstatus?:string;
 emergencycontact?:any;
  hireDate: string;
  terminationDate?: string;
  status: string;
  profilePictureUrl?: string;
  createdAt: string;
  updatedAt: string;
  workLocation:string;
  basicSalary:number;
  // Related data
  employmentDetails?: EmploymentDetail;
  paytype?:string;

  department?: Department;
  position?: Position;
  manager?: Employee;
  skills?: EmployeeSkill[];
}

export interface EmploymentDetail {
  employmentDetailId: string;
  employeeId: string;
  departmentId?: string;
  positionId?: string;
  managerId?: string;
  workLocation?: string;
  employmentType: string;
  workSchedule?: string;
  baseSalary: number;
  currency: string;
  payFrequency: string;
  overtimeEligible: boolean;
  benefitsEligible: boolean;
  vacationDaysPerYear: number;
  sickDaysPerYear: number;
  effectiveDate: string;
  endDate?: string;
  isActive: boolean;
}

export interface Department {
  departmentId: string;
  organizationId: string;
  departmentName: string;
  description?: string;
  managerId?: string;
  managerName?: string;
  isActive: boolean;
  employeeCount: number;
  createdAt: string;
}

export interface Position {
  positionId: string;
  organizationId: string;
  positionTitle: string;
  departmentId?: string;
  departmentName?: string;
  description?: string;
  roleId?: string;
  roleName?: string;
  isActive: boolean;
  employeeCount: number;
  createdAt: string;
}

//Employee by Position 
export interface PositionEmployeeDto {
  positionId: string;
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  hireDate: string; // ISO string from backend
  positionTitle: string;
}

export interface PositionEmployeesMainDto {
  positionId: string;
  positionTitle: string;
  employeeCount: number;
  employees: PositionEmployeeDto[];
}


export interface Role {
  roleId: string;
  organizationId: string;
  roleName: string;
  description?: string;
  permissions?: { [key: string]: any };
  isSystemRole: boolean;
  createdAt: string;
}

export interface SkillSet {
  skillSetId: string;
  name: string;
  description?: string;
  category?: string;
  isActive: boolean;
}

export interface EmployeeSkill {
  employeeSkillId: string;
  employeeId: string;
  skillSetId: string;
  proficiencyLevel: number;
  certificationDate?: string;
  certificationExpiry?: string;
  notes?: string;
  
  // Related data
  skillSet?: SkillSet;
}

// DTOs for API requests/responses
export interface CreateEmployeeRequest {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  address?: any;
  emergencyContact?: any;
  hireDate: string;
  probationEndDate?: string;
  employmentStatus: string;
  
  // Employment details
  departmentId?: string;
  positionId?: string;
  reportingManagerId?: string;
  workLocation?: string;
  employmentType?: string;
  workSchedule?: string;
  basicSalary?: number;
  currency?: string;
  payFrequency?: string;
  overtimeEligible?: boolean;
  benefitsEligible?: boolean;
  vacationDaysPerYear?: number;
  sickDaysPerYear?: number;
  effectiveDate?: string;
}

export interface UpdateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  employmentStatus: string;
}

export interface EmployeeSearchRequest {
  searchTerm?: string;
  departmentId?: string;
  positionId?: string;
  managerId?: string;
  employmentStatus?: string;
  employmentType?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface EmployeeListResponse {
  employees: Employee[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface EmployeeStatistics {
  totalEmployees: number;
  activeEmployees: number;
  newHiresThisMonth: number;
  employeesByDepartment: { [key: string]: number };
  employeesByPosition: { [key: string]: number };
  averageTenure: number;
  turnoverRate: number;
}

// Department DTOs
export interface CreateDepartmentRequest {
  departmentName: string;
  description?: string;
  managerId?: string;
}

export interface UpdateDepartmentRequest {
  departmentName: string;
  description?: string;
  managerId?: string;
}

// Position DTOs
export interface CreatePositionRequest {
  positionTitle: string;
  description?: string;
  departmentId?: string;
  roleId?: string;
}

export interface UpdatePositionRequest {
  positionTitle: string;
  description?: string;
  departmentId?: string;
  roleId?: string;
}