export interface SkillSet {
  skillId: string;
  skillName: string;
  category: string;
  description?: string;
  skillLevelScale: number[];
  isActive: boolean;
  createdAt: string;
}

export interface EmployeeSkill {
  employeeSkillId: string;
  employeeId: string;
  employeeName?: string;
  skillId: string;
  skillName: string;
  proficiencyLevel: number;
  assessedBy?: string;
  assessorName?: string;
  lastAssessed?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KRA {
  kraId: string;
  organizationId?: string;
  positionId?: string;
  title: string;
  description?: string;
  weight: number;
  measurementCriteria?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AppraisalCycle {
  cycleId: string;
  cycleName: string;
  description?: string;
  startDate: string;
  endDate: string;
  reviewPeriodStart?: string;
  reviewPeriodEnd?: string;
  status: AppraisalCycleStatus;
  ratingScale: RatingScale;
  selfReviewEnabled: boolean;
  peerReviewEnabled: boolean;
  managerReviewEnabled: boolean;
  createdAt: string;
}

export enum AppraisalCycleStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface RatingScale {
  type: string;
  scale: number[];
  descriptions?: { [key: number]: string };
}

export interface EmployeeAppraisal {
  appraisalId: string;
  cycleId: string;
  cycleName: string;
  employeeId: string;
  employeeName: string;
  reviewerId: string;
  reviewerName: string;
  reviewType: ReviewType;
  overallRating?: number;
  kraRatings: { [kraId: string]: number };
  skillRatings: { [skillId: string]: number };
  goalsAchieved: any;
  feedback?: string;
  improvementAreas?: string;
  developmentPlan?: string;
  status: AppraisalStatus;
  submittedAt?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeAppraisalForEmployee {
  appraisalId: string;
  cycleId: string;
  cycleName: string;
  kraName?: string;
  rating?: number;
  reviewerName?: string;
  submittedAt?: string;
}

export enum ReviewType {
  SELF = 'self',
  MANAGER = 'manager',
  PEER = 'peer',
  SUBORDINATE = 'subordinate'
}

export enum AppraisalStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  COMPLETED = 'completed',
  REJECTED = 'rejected'
}


export interface CreateAppraisal {
  cycleId: string;
  employeeId: string;
  reviewType: ReviewType;
  overallRating?: number;
  kraRatings: { [kraId: string]: number };
  skillRatings: { [skillId: string]: number };
  feedback?: string;
  improvementAreas?: string;
  developmentPlan?: string;
}

export interface PerformanceSummary {
  averageRating: number;
  totalAppraisals: number;
  pendingAppraisals: number;
  ratingDistribution: { [rating: number]: number };
  topPerformers: TopPerformer[];
}

export interface TopPerformer {
  employeeName: string;
  rating: number;
  department: string;
  position: string;
}

export interface PerformanceSearchRequest {
  cycleId?: string;
  employeeId?: string;
  reviewerId?: string;
  reviewType?: ReviewType;
  status?: AppraisalStatus;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PerformanceListResponse {
  appraisals: EmployeeAppraisal[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PerformanceReport {
  cycleId: string;
  cycleName: string;
  summary: PerformanceSummary;
  departmentSummaries: DepartmentPerformanceSummary[];
  employeePerformances: EmployeePerformanceDetail[];
  generatedAt: string;
  generatedBy: string;
}

export interface DepartmentPerformanceSummary {
  departmentId: string;
  departmentName: string;
  averageRating: number;
  employeeCount: number;
  completedAppraisals: number;
  pendingAppraisals: number;
}

export interface EmployeePerformanceDetail {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  overallRating: number;
  kraAverage: number;
  skillAverage: number;
  feedback: string;
  developmentPlan: string;
}

export interface CreateKRARequest {
  positionId: string;
  title: string;
  description?: string;
  weight: number;
  measurementCriteria?: string;
  isActive?: boolean;
}

export interface UpdateKRARequest {
  title?: string;
  description?: string;
  weight?: number;
  measurementCriteria?: string;
  isActive?: boolean;
}

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
export interface CreateSkillSetRequest {
  skillName: string;
  category: string;
  description?: string;
  skillLevelScale: number[];
  isActive?: boolean;
}

export interface PerformanceReportFilter {
  appraisalCycleId?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  rating?: number;
}

export interface UpdateSkillSetRequest {
  skillName?: string;
  category?: string;
  description?: string;
  skillLevelScale?: number[];
  isActive?: boolean;
}

export interface CreateEmployeeSkillRequest {
  employeeId: string;
  skillId: string;
  proficiencyLevel: number;
  assessedBy?: string;
  notes?: string;
}

export interface UpdateEmployeeSkillRequest {
  proficiencyLevel?: number;
  assessedBy?: string;
  notes?: string;
  lastAssessed?: string;
}

// export interface CreateAppraisalCycleRequest {
//   cycleName: string;
//   description?: string;
//   startDate: string;
//   endDate: string;
//   reviewPeriodStart?: string;
//   reviewPeriodEnd?: string;
//   ratingScale: RatingScale;
//   selfReviewEnabled: boolean;
//   peerReviewEnabled: boolean;
//   managerReviewEnabled: boolean;
// }

export interface CreateAppraisalCycleRequest {
  cycleName: string;
  description?: string;
  startDate: string;
  endDate: string;
}






export interface UpdateAppraisalCycleRequest {
  cycleName?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  reviewPeriodStart?: string;
  reviewPeriodEnd?: string;
  status?: AppraisalCycleStatus;
  ratingScale?: RatingScale;
  selfReviewEnabled?: boolean;
  peerReviewEnabled?: boolean;
  managerReviewEnabled?: boolean;
}

export interface SubmitAppraisalRequest {
  overallRating?: number;
  kraRatings: { [kraId: string]: number };
  skillRatings: { [skillId: string]: number };
  goalsAchieved: any;
  feedback?: string;
  improvementAreas?: string;
  developmentPlan?: string;
}

export interface ReviewAppraisalRequest {
  overallRating?: number;
  kraRatings?: { [kraId: string]: number };
  skillRatings?: { [skillId: string]: number };
  feedback?: string;
  improvementAreas?: string;
  developmentPlan?: string;
  status: AppraisalStatus;
}

export interface SkillAssessment {
  assessmentId: string;
  employeeId: string;
  skillId: string;
  skillName: string;
  currentLevel: number;
  targetLevel: number;
  assessedBy: string;
  assessmentDate: string;
  notes?: string;
  developmentPlan?: string;
}

export interface CreateSkillAssessment {
  employeeId: string;
  skillId: string;
  proficiencyLevel: number;
  notes?: string;
}

export interface PerformanceMetrics {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  currentRating: number;
  previousRating?: number;
  ratingTrend: 'up' | 'down' | 'stable';
  skillsCount: number;
  lastAppraisalDate?: string;
  nextAppraisalDate?: string;
}

// Self-Assessment Interfaces
export interface SelfAssessment {
  selfAssessmentId: string;
  employeeId: string;
  cycleId: string;
  kraId?: string;
  skillId?: string;
  rating: number;
  comments?: string;
  evidenceUrls?: string[];
  status: 'draft' | 'submitted';
  createdAt: string;
  updatedAt: string;
  cycleName?: string;
  kraName?: string;
  employeeName?: string;
}

export interface CreateSelfAssessmentRequest {
  employeeId: string;
  cycleId: string;
  kraId?: string;
  skillId?: string;
  rating: number;
  comments?: string;
  evidenceUrls?: string[];
  status?: 'draft' | 'submitted';
}

// Manager Review Interfaces
export interface ManagerReview {
  reviewId: string;
  managerId: string;
  employeeId: string;
  cycleId: string;
  overallRating: number;
  feedback?: string;
  improvementAreas?: string;
  developmentPlan?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManagerReviewRequest {
  managerId: string;
  employeeId: string;
  cycleId: string;
  overallRating: number;
  feedback?: string;
  improvementAreas?: string;
  developmentPlan?: string;
  kraRatings?: { [kraId: string]: number };
  skillRatings?: { [skillId: string]: number };
}

// Appraisal Consolidation
export interface ConsolidateAppraisalRequest {
  employeeId: string;
  cycleId: string;
  reviewerId?: string;
}

// Employee Performance History
export interface EmployeePerformanceHistory {
  employeeId: string;
  employeeName: string;
  appraisals: EmployeeAppraisal[];
  averageRating?: number;
  totalAppraisals: number;
  completedAppraisals: number;
  skillGaps: SkillGapAnalysis[];
}

export interface SkillGapAnalysis {
  skillId: string;
  skillName: string;
  requiredLevel: number;
  currentLevel: number;
  gap: number;
}