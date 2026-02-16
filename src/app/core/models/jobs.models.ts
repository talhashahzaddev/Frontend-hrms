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
