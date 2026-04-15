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

// export interface KRA {
//   kraId: string;
//   organizationId?: string;
//   cycleId: string;
//   positionId?: string;
//   title: string;
//   description?: string;
//   weight: number;
//   measurementCriteria?: string;
//   isActive: boolean;
//   createdAt: string;
// }

export interface KRA {
  kraId: string;
  organizationId: string;
  cycleId: string;
  cycleName: string;
  title: string;
  kraDescription: string;
  kraRate: string; // varchar from DB
  isActive: boolean;
  createdAt: string;
  createdByName: string;
}


export interface AppraisalCycle {
  cycleId: string;                 // CycleId
  cycleName: string;               // CycleName
  cycleType?: string;              // CycleType (optional)
  description?: string;            // optional description
  startDate: string;               // StartDate
  endDate: string;                 // EndDate
  reviewStartDate?: string;        // ReviewStartDate (optional)
  reviewEndDate?: string;          // ReviewEndDate (optional)
  status: string;                  // Status
  selfReviewEnabled: boolean;      // SelfReviewEnabled
  managerReviewEnabled: boolean;   // ManagerReviewEnabled
  appraisalEnabled: boolean;       // AppraisalEnabled
  organizationId: string;          // OrganizationId
  createdBy?: string;              // CreatedBy (optional)
  createdAt?: string;              // CreatedAt (optional)
  updatedAt?: string;              // UpdatedAt (optional)
  totalAppraisals?: number;        // TotalAppraisals (optional)
  completedAppraisals?: number;    // CompletedAppraisals (optional)
  ratingScale?: any;               // keep as any if needed, or define RatingScale interface
//  peerReviewEnabled: boolean;   // optionally add forinital later its being removed PeerReviewEnabled,

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
  currentRating?: number;
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

// models/appraisal-cycle.model.ts
export interface AppraisalCycleDto {
  cycleId: string;
  cycleName: string;
  cycleType?: string;               // nullable
  startDate: string;                // ISO string
  reviewStartDate?: string;         // nullable
  reviewEndDate?: string;           // nullable
  endDate: string;                  // you had endDate in backend
  status: string;

  selfReviewEnabled: boolean;       // maps to isselfassessmentenable
  managerReviewEnabled: boolean;    // maps to managerreview
  appraisalEnabled: boolean;        // maps to isappraisalenable

  organizationId: string;
  createdBy?: string;               // nullable
  createdAt?: string;               // nullable
  updatedAt?: string;               // nullable

  totalAppraisals: number;
  completedAppraisals: number;
}


export interface EmployeeAppraisalForEmployee {
  appraisalId: string;
  cycleId: string;
  cycleName: string;
  reviewerName?: string;
  reviewType: ReviewType;
  overallRating?: number;
  currentRating?: number;
  kraRatings: { [kraId: string]: number };
  skillRatings: { [skillId: string]: number };
  feedback?: string;
  improvementAreas?: string;
  developmentPlan?: string;
  status: AppraisalStatus;
  submittedAt?: string;
  reviewedAt?: string;
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

// export interface CreateKRARequest {
//   positionId: string;
//   title: string;
//   description?: string;
//   weight: number;
//   measurementCriteria?: string;
//   isActive?: boolean;
// }

// export interface UpdateKRARequest {
//   title?: string;
//   description?: string;
//   weight?: number;
//   measurementCriteria?: string;
//   isActive?: boolean;
// }

export interface CreateKRARequest {
  title: string;
  kraDescription?: string;
  cycleId: string;
  isActive?: boolean;
}

export interface UpdateKRARequest {
  title: string;
  kraDescription?: string;
  cycleId: string;
  isActive: boolean;
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

// export interface CreateAppraisalCycleRequest {
//   cycleName: string;
//   description?: string;
//   startDate: string;
//   endDate: string;
// }

export interface CreateAppraisalCycleRequest {
  cycleName: string;
  cycleType?: string;
  description?: string;
  startDate: string;
  endDate: string;
  reviewStartDate?: string;
  reviewEndDate?: string;
  isSelfAssessmentEnable: boolean;
  managerReview: boolean;
  isAppraisalEnable: boolean;
  status?: string; // upcoming, inprogress, concluded
}






// export interface UpdateAppraisalCycleRequest {
//   cycleName?: string;
//   description?: string;
//   startDate?: string;
//   endDate?: string;
//   reviewPeriodStart?: string;
//   reviewPeriodEnd?: string;
//   status?: AppraisalCycleStatus;
//   ratingScale?: RatingScale;
//   selfReviewEnabled?: boolean;
//   peerReviewEnabled?: boolean;
//   managerReviewEnabled?: boolean;
// }

export interface UpdateAppraisalCycleRequest {
  cycleName: string;
  cycleType?: string;
  startDate: string; // ISO string
  endDate: string;
  reviewStartDate?: string;
  reviewEndDate?: string;
  status?: string;
  isSelfAssessmentEnable: boolean;
  managerReview: boolean;
  isAppraisalEnable: boolean;
  description?: string;
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
  goalId: string;
  kraId: string;
  organizationId: string;
  selfRating: number;
  selfComment?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  employeeId?: string;
  goalName?: string;
  kraName?: string;
  employeeName?: string;
  cycleId?: string;
  cycleName?: string;
}

export interface CreateSelfAssessmentRequest {
  goalId: string;
  kraId: string;
  selfRating: number;
  selfComment?: string;
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
  employeeId: string;
  cycleId: string;
  kraId: string;
  goalId: string;
  rating: number;
  feedback?: string;
  improvementArea?: string;
  status?: string;
}

export interface ManagerReviewDto {
  managerReviewId: string;
  organizationId: string;
  managerId: string;
  managerName: string;
  employeeId: string;
  employeeName: string;
  cycleId: string;
  cycleName: string;
  kraId: string;
  kraName: string;
  goalId: string;
  goalName: string;
  rating: number;
  feedback?: string;
  improvementArea?: string;
  status: string;
  createdAt: string;
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

// Team Performance Overview
export interface TeamPerformanceOverview {
  employees: TeamPerformanceEmployee[];
}

export interface TeamPerformanceEmployee {
  employeeId: string;
  employeeName: string;
  cycleRatings: CycleRating[];
  assessedSkills: string[];
}

export interface CycleRating {
  cycleId: string;
  cycleName: string;
  rating?: number;
}

// Goals (for Goals & KRAs component; backend API may be added later)
export enum GoalStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Goal {
  goalId: string;
  organizationId: string;
  title: string;
  description?: string;
  kraId?: string;
  kraName?: string;
  progress: string;
  startDate?: string;
  endDate?: string;
  assignedTo?: string;
  assignedtoName?: string;
  createdBy?: string;
  createdByName?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalDto {
  goalId: string;
  title: string;
  description: string;
  organizationId: string;
  progress: string;
  startDate?: string;
  endDate?: string;
  kraId?: string;
  kraName?: string;
  assignedTo?: string;
  createdBy?: string;
  createdByName?: string;
  assignedtoName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateGoalRequest {
  title: string;
  description: string;
  kraId: string;
  progress: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateGoalRequest {
  goalId: string;
  title: string;
  description: string;
  kraId: string;
  progress: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

// HR Review DTO
export interface HrReviewDto {
  hrReviewId: string;
  organizationId: string;
  cycleId: string;
  cycleName: string;
  kraId: string;
  kraName: string;
  goalId: string;
  goalName: string;
  employeeId: string;
  employeeName: string;
  finalRating: number;
  hrComments?: string;
  improvementArea?: string;
  feedback?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}