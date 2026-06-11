// Job opening - matches API DTOs
export interface JobOpeningDto {
  jobId: string;
  organizationId: string;
  jobRoleName: string;
  jobCode?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  ctcMin?: number | null;
  ctcMax?: number | null;
  currency?: string | null;
  vacancies: number;
  location?: string | null;
  workMode?: string | null;
  employmentType?: string | null;
  jobIntroduction?: string | null;
  responsibilities?: string | null;
  skillset?: string | null;
  lastDate?: string | null;
  postedDate?: string | null;
  postedAs: string;
  externalLink?: string | null;
  status: string;
  mandatorySkills?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface JobOpeningStatsDto {
  totalJobs: number;
  openPositions: number;
  closedPositions: number;
  totalVacancies: number;
}

export interface CreateJobOpeningRequest {
  jobRoleName: string;
  jobCode: string;
  departmentId?: string | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  ctcMin?: number | null;
  ctcMax?: number | null;
  currency?: string | null;
  vacancies: number;
  location?: string | null;
  workMode?: string | null;
  employmentType?: string | null;
  jobIntroduction?: string | null;
  responsibilities?: string | null;
  skillset?: string | null;
  lastDate?: string | null;
  postedAs: string;
  externalLink?: string | null;
  status?: string | null;
  mandatorySkills?: string | null;
}

export interface UpdateJobOpeningRequest {
  jobRoleName?: string | null;
  jobCode?: string | null;
  departmentId?: string | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  ctcMin?: number | null;
  ctcMax?: number | null;
  currency?: string | null;
  vacancies?: number | null;
  location?: string | null;
  workMode?: string | null;
  employmentType?: string | null;
  jobIntroduction?: string | null;
  responsibilities?: string | null;
  skillset?: string | null;
  lastDate?: string | null;
  postedAs?: string | null;
  externalLink?: string | null;
  status?: string | null;
  mandatorySkills?: string | null;
}

export interface ServiceResponse<T> {
  success: boolean;
  message?: string;
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

export interface JobOpeningsFilterParams {
  search?: string;
  status?: string;
  lastDateFrom?: string; // ISO date string
  lastDateTo?: string;   // ISO date string
  page?: number;
  pageSize?: number;
}

// Job application - matches API DTOs
export interface JobApplicationDto {
  jobApplyId: string;
  jobId: string;
  jobRoleName?: string | null;
  jobCode?: string | null;
  organizationId: string;
  employeeId?: string | null;
  employeeName?: string | null;
  candidateId?: string | null;
  candidateName?: string | null;
  candidateEmail?: string | null;
  linkedInUrl?: string | null;
  resumeUrl?: string | null;
  phone?: string | null;
  coverLetter?: string | null;
  currentStageId?: string | null;
  currentStageName?: string | null;
  applicationSource?: string | null;
  status: string;
  createdDate?: string | null;
  updatedDate?: string | null;
  passedKnockout?: boolean | null;
  matchScore?: number | null;
}

export interface CreateJobApplicationRequest {
  jobId: string;
  candidateName?: string | null;
  candidateEmail?: string | null;
  linkedInUrl?: string | null;
  resumeUrl?: string | null;
  phone?: string | null;
  coverLetter?: string | null;
  currentStageId?: string | null;
  applicationSource?: string | null;
  status?: string | null;
  answers?: SubmitCandidateAnswerRequest[] | null;
}

/** Request for applying to a job as the current user (self). Name, email, phone come from employee record. */
export interface ApplyForMySelfRequest {
  jobId: string;
  linkedInUrl?: string | null;
  resumeUrl: string;
  coverLetter?: string | null;
  applicationSource?: string | null;
  answers?: SubmitCandidateAnswerRequest[] | null;
}

export interface UpdateJobApplicationRequest {
  candidateName?: string | null;
  candidateEmail?: string | null;
  linkedInUrl?: string | null;
  resumeUrl?: string | null;
  phone?: string | null;
  coverLetter?: string | null;
  currentStageId?: string | null;
  applicationSource?: string | null;
  status?: string | null;
}

export interface StageMasterDto {
  stageId: string;
  organizationId: string;
  stageName: string;
  stageOrder?: number | null;
  isInterviewStage: boolean;
  createdAt?: string | null;
}

export interface CreateStageMasterRequest {
  stageName: string;
  stageOrder?: number | null;
  isInterviewStage: boolean;
}

export interface UpdateStageMasterRequest {
  stageName: string;
  stageOrder?: number | null;
  isInterviewStage: boolean;
}

export interface MyJobApplicationsFilterParams {
  page?: number;
  pageSize?: number;
  search?: string | null;
  stageId?: string | null;
  status?: string | null;
}

export interface ReceivedJobApplicationsFilterParams {
  page?: number;
  pageSize?: number;
  search?: string | null;
  applyDateFrom?: string | null; // ISO date string
  applyDateTo?: string | null;   // ISO date string
  stageId?: string | null;
  jobIds?: string[] | null;
}

/** Application stage (movement of a job application to a stage) */
export interface InterviewerInfoDto {
  employeeId: string;
  employeeName: string;
  positionTitle?: string | null;
}

export interface ApplicationStageDto {
  applicationStageId: string;
  jobApplyId: string;
  jobId?: string | null;
  jobRoleName?: string | null;
  candidateName?: string | null;
  stageId: string;
  stageName?: string | null;
  isInterviewStage: boolean;
  notes?: string | null;
  type?: string | null;
  updatedOn?: string | null;
  updatedBy?: string | null;
  updatedByName?: string | null;
  interviewers?: InterviewerInfoDto[];
  interviewDate?: string | null;
  interviewPlace?: string | null;
}

/** Request to add a stage to a job application (only jobApplyId + stageId required for now) */
export interface CreateApplicationStageRequest {
  jobApplyId: string;
  stageId: string;
  notes?: string | null;
  type?: string | null;
  interviewerIds?: string[] | null;
  interviewDate?: string | null;
  interviewPlace?: string | null;
}

export interface UpdateApplicationStageRequest {
  notes?: string | null;
  type?: string | null;
  interviewerIds?: string[] | null;
  interviewDate?: string | null;
  interviewPlace?: string | null;
}

// ==================== ATS Knockout & Question Bank DTOs ====================

export interface QuestionCategoryDto {
  categoryId: string;
  organizationId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateQuestionCategoryRequest {
  name: string;
  description?: string | null;
}

export interface QuestionDto {
  questionId: string;
  categoryId: string;
  organizationId: string;
  questionText: string;
  questionType: string;
  options?: string | null;
  expectedAnswer?: string | null;
  isKnockout: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateQuestionRequest {
  categoryId: string;
  questionText: string;
  questionType: string;
  options?: string | null;
  expectedAnswer?: string | null;
  isKnockout: boolean;
}

export interface UpdateQuestionRequest {
  categoryId?: string | null;
  questionText?: string | null;
  questionType?: string | null;
  options?: string | null;
  expectedAnswer?: string | null;
  isKnockout?: boolean | null;
}

export interface JobQuestionDto {
  jobQuestionId: string;
  jobId: string;
  questionId: string;
  isRequired: boolean;
  questionText: string;
  questionType: string;
  options?: string | null;
  expectedAnswer?: string | null;
  isKnockout: boolean;
}

export interface SubmitCandidateAnswerRequest {
  questionId: string;
  answerText: string;
}

export interface ParsedResumeDto {
  parsedResumeId: string;
  jobApplyId: string;
  contactDetails?: string | null;
  skills?: string | null;
  workExperience?: string | null;
  education?: string | null;
  parseStatus: string;
  parseError?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
