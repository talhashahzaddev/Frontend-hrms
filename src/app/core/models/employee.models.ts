export interface Employee {
  employeeId: string;
  organizationId: string;
  userId?: string;
  employeeCode: string;
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
  hireDate: string;
  terminationDate?: string;
  status: string;
  profilePictureUrl?: string;
  createdAt: string;
  updatedAt: string;
  
  // Related data
  employmentDetails?: EmploymentDetail;
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
  name: string;
  description?: string;
  managerId?: string;
  parentDepartmentId?: string;
  isActive: boolean;
  createdAt: string;
  
  // Related data
  manager?: Employee;
  employeeCount?: number;
  subDepartments?: Department[];
}

export interface Position {
  positionId: string;
  title: string;
  description?: string;
  departmentId?: string;
  level: number;
  minSalary?: number;
  maxSalary?: number;
  requiredSkills?: string[];
  responsibilities?: string[];
  qualifications?: string[];
  isActive: boolean;
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
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  hireDate: string;
  probationEndDate?: string;
  employmentStatus: string;
  
  // Employment details
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