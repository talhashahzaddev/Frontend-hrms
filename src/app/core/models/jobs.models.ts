// Job opening - matches API DTOs
export interface JobOpeningDto {
  jobId: string;
  organizationId: string;
  jobRoleName: string;
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
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateJobOpeningRequest {
  jobRoleName: string;
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
}

export interface UpdateJobOpeningRequest {
  jobRoleName?: string | null;
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
  createdAt?: string | null;
}

export interface CreateStageMasterRequest {
  stageName: string;
  stageOrder?: number | null;
}

export interface UpdateStageMasterRequest {
  stageName: string;
  stageOrder?: number | null;
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
}
