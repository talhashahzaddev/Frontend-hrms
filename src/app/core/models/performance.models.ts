// Performance Management Models

export interface SkillSet {
  skillSetId: string;
  name: string;
  description?: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
}

export interface EmployeeSkill {
  employeeSkillId: string;
  employeeId: string;
  skillSetId: string;
  proficiencyLevel: number; // 1-5 scale
  certifiedDate?: string;
  expiryDate?: string;
  comments?: string;
  skillSet?: SkillSet;
  employee?: {
    employeeId: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    department?: string;
  };
}

export enum AppraisalStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  REVIEWED = 'reviewed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface KRA {
  kraId: string;
  title: string;
  description: string;
  weightage: number;
  measurementCriteria: string;
  targetValue: string;
  organizationId: string;
  isActive: boolean;
  createdAt: string;
}

export interface AppraisalCycle {
  appraisalCycleId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  reviewStartDate: string;
  reviewEndDate: string;
  status: AppraisalStatus;
  organizationId: string;
  totalEmployees: number;
  completedAppraisals: number;
  createdAt: string;
}

export interface EmployeeAppraisal {
  employeeAppraisalId: string;
  employeeId: string;
  appraisalCycleId: string;
  kraId: string;
  selfRating: number;
  managerRating?: number;
  achievements: string;
  challenges: string;
  developmentPlan: string;
  managerComments?: string;
  status: AppraisalStatus;
  submittedAt?: string;
  reviewedAt?: string;
  employee?: {
    employeeId: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    department?: string;
    managerId?: string;
  };
  appraisalCycle?: AppraisalCycle;
  kra?: KRA;
}

export interface PerformanceMetrics {
  averageRating: number;
  totalAppraisals: number;
  completionRate: number;
  topPerformers: number;
  improvementNeeded: number;
}

export interface DepartmentPerformance {
  department: string;
  averageRating: number;
  totalEmployees: number;
  completedAppraisals: number;
  completionRate: number;
}

export interface SkillGap {
  skillName: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  employeeCount: number;
}

export interface PerformanceSummary {
  metrics: PerformanceMetrics;
  departmentPerformance: DepartmentPerformance[];
  skillGaps: SkillGap[];
  recentAppraisals: EmployeeAppraisal[];
  upcomingReviews: EmployeeAppraisal[];
}

// DTOs for API requests
export interface CreateSkillSetRequest {
  name: string;
  description?: string;
  category?: string;
}

export interface UpdateSkillSetRequest {
  name: string;
  description?: string;
  category?: string;
  isActive: boolean;
}

export interface CreateEmployeeSkillRequest {
  employeeId: string;
  skillSetId: string;
  proficiencyLevel: number;
  certifiedDate?: string;
  expiryDate?: string;
  comments?: string;
}

export interface UpdateEmployeeSkillRequest {
  proficiencyLevel: number;
  certifiedDate?: string;
  expiryDate?: string;
  comments?: string;
}

export interface CreateAppraisalCycleRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  reviewStartDate: string;
  reviewEndDate: string;
}

export interface UpdateAppraisalCycleRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  reviewStartDate: string;
  reviewEndDate: string;
  status: AppraisalStatus;
}

export interface SubmitAppraisalRequest {
  kraId: string;
  selfRating: number;
  achievements: string;
  challenges: string;
  developmentPlan: string;
}

export interface ReviewAppraisalRequest {
  managerRating: number;
  managerComments: string;
}

export interface CreateKRARequest {
  title: string;
  description: string;
  weightage: number;
  measurementCriteria: string;
  targetValue: string;
}

export interface UpdateKRARequest {
  title: string;
  description: string;
  weightage: number;
  measurementCriteria: string;
  targetValue: string;
  isActive: boolean;
}

// Search and filter models
export interface SkillSetFilter {
  category?: string;
  isActive?: boolean;
  search?: string;
}

export interface EmployeeSkillFilter {
  employeeId?: string;
  skillSetId?: string;
  department?: string;
  proficiencyLevel?: number;
  search?: string;
}

export interface AppraisalFilter {
  appraisalCycleId?: string;
  status?: AppraisalStatus;
  department?: string;
  employeeId?: string;
  managerId?: string;
  search?: string;
}

export interface PerformanceReportFilter {
  startDate?: string;
  endDate?: string;
  department?: string;
  appraisalCycleId?: string;
  rating?: number;
}