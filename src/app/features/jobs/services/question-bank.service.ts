import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  QuestionCategoryDto,
  CreateQuestionCategoryRequest,
  QuestionDto,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  JobQuestionDto,
  ServiceResponse,
  ParsedResumeDto
} from '../../../core/models/jobs.models';

@Injectable({
  providedIn: 'root'
})
export class QuestionBankService {
  private readonly apiUrl = `${environment.apiUrl}/QuestionBank`;

  constructor(private http: HttpClient) {}

  // ==================== Categories ====================
  getCategories(): Observable<QuestionCategoryDto[]> {
    return this.http
      .get<ServiceResponse<QuestionCategoryDto[]>>(`${this.apiUrl}/categories`)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) return [];
          return res.data;
        })
      );
  }

  createCategory(request: CreateQuestionCategoryRequest): Observable<QuestionCategoryDto> {
    return this.http
      .post<ServiceResponse<QuestionCategoryDto>>(`${this.apiUrl}/categories`, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) throw new Error(res.message || 'Failed to create category');
          return res.data;
        })
      );
  }

  // ==================== Questions ====================
  getQuestionsByCategory(categoryId: string): Observable<QuestionDto[]> {
    return this.http
      .get<ServiceResponse<QuestionDto[]>>(`${this.apiUrl}/categories/${categoryId}/questions`)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) return [];
          return res.data;
        })
      );
  }

  createQuestion(categoryId: string, request: CreateQuestionRequest): Observable<QuestionDto> {
    const payload = { ...request, categoryId };
    return this.http
      .post<ServiceResponse<QuestionDto>>(`${this.apiUrl}/questions`, payload)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) throw new Error(res.message || 'Failed to create question');
          return res.data;
        })
      );
  }

  updateQuestion(questionId: string, request: UpdateQuestionRequest): Observable<QuestionDto> {
    return this.http
      .put<ServiceResponse<QuestionDto>>(`${this.apiUrl}/questions/${questionId}`, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) throw new Error(res.message || 'Failed to update question');
          return res.data;
        })
      );
  }

  deleteQuestion(questionId: string): Observable<boolean> {
    return this.http
      .delete<ServiceResponse<boolean>>(`${this.apiUrl}/questions/${questionId}`)
      .pipe(map(res => res.success));
  }

  // ==================== Job Questions ====================
  getJobQuestions(jobId: string, domain?: string): Observable<JobQuestionDto[]> {
    const params: any = {};
    if (domain) params.domain = domain;

    return this.http
      .get<ServiceResponse<JobQuestionDto[]>>(`${this.apiUrl}/jobs/${jobId}/questions`, { params })
      .pipe(
        map((res) => {
          if (!res.success || !res.data) return [];
          return res.data;
        })
      );
  }

  attachQuestionsToJob(jobId: string, questionIds: string[]): Observable<boolean> {
    const payload = { jobId, questionIds };
    return this.http
      .post<ServiceResponse<boolean>>(`${this.apiUrl}/jobs/attach-questions`, payload)
      .pipe(map(res => res.success));
  }

  // ==================== Parsed Resumes ====================
  getParsedResume(jobApplyId: string): Observable<ParsedResumeDto | null> {
    return this.http
      .get<ServiceResponse<ParsedResumeDto>>(`${this.apiUrl}/parsed-resumes/${jobApplyId}`)
      .pipe(
        map((res) => (res.success && res.data ? res.data : null))
      );
  }
}
