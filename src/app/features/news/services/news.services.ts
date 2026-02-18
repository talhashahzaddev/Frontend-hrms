import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { NewsDto, NewsRequest } from '../../../core/models/news.models';
import { ApiResponse, PagedResult } from '../../../core/models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class NewsService {

  private readonly apiUrl = `${environment.apiUrl}/News`;
  private readonly uploadsUrl = `${environment.apiUrl}/uploads`;

  constructor(private http: HttpClient) { }

  //Create News
  createNews(request: NewsRequest | FormData): Observable<NewsDto> {
    return this.http
      .post<ApiResponse<NewsDto>>(`${this.apiUrl}/createNews`, request)
      .pipe(
        map(res => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to create news');
          }
          return res.data;
        })
      );
  }

  //edit news
  editNews(newsId: string, formData: FormData): Observable<boolean> {
    return this.http
      .put<ApiResponse<boolean>>(`${this.apiUrl}/edit/${newsId}`, formData)
      .pipe(
        map(res => {
          if (!res.success) {
            throw new Error(res.message || 'Failed to update news');
          }
          return res.data ?? false;
        })
      );
  }


  //Update status published/draft
  updateNewsStatus(newsId: string, status: string): Observable<boolean> {
    return this.http
      .patch<ApiResponse<boolean>>(
        `${this.apiUrl}/${newsId}/status`,
        null,
        { params: { status } }
      )
      .pipe(
        map(res => {
          if (!res.success) {
            throw new Error(res.message || 'Failed to update news status');
          }
          return res.data ?? false;
        })
      );
  }


  //Delete news
  deleteNews(newsId: string): Observable<boolean> {
    return this.http
      .delete<ApiResponse<boolean>>(`${this.apiUrl}/${newsId}`)
      .pipe(
        map(res => {
          if (!res.success) {
            throw new Error(res.message || 'Failed to delete news');
          }
          return res.data ?? false;
        })
      );
  }

  // Mark news as read (increments view only once per employee)
  markNewsAsRead(newsId: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/${newsId}/mark-read`, {})
      .pipe(
        map(res => {
          if (!res.success) throw new Error(res.message || 'Failed to mark news as read');
          return res.data ?? false; // true if first read, false if already read
        })
      );
  }


  //Count total news views
  addNewsView(newsId: string): Observable<boolean> {
    return this.http
      .post<ApiResponse<boolean>>(`${this.apiUrl}/${newsId}/view`, {})
      .pipe(
        map(res => {
          if (!res.success) {
            throw new Error(res.message || 'Failed to update news view count');
          }
          return res.data ?? false;
        })
      );
  }

  // GET ALL NEWS 
  getAllNews(searchModel?: { [key: string]: any }): Observable<PagedResult<NewsDto>> {
    let params = new HttpParams();

    if (searchModel) {
      Object.entries(searchModel).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value as any);
        }
      });
    }

    return this.http
      .get<ApiResponse<PagedResult<NewsDto>>>(
        `${this.apiUrl}/getAllNews`,
        { params }
      )
      .pipe(
        map(res => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'Failed to fetch news');
          }
          return res.data;
        })
      );
  }
// GET NEWS BY ID
getNewsById(id: string): Observable<NewsDto> {
  return this.http
    .get<ApiResponse<NewsDto>>(
      `${this.apiUrl}/getNewsById/${id}`
    )
    .pipe(
      map(res => {
        if (!res.success || !res.data) {
          throw new Error(res.message || 'Failed to fetch news details');
        }
        return res.data;
      })
    );
}




  /** Upload file through uploads API; returns the hosted URL. */
  uploadReceipt(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>(`${this.uploadsUrl}/files`, formData).pipe(
      map((res) => {
        if (!res?.url) {
          throw new Error('Upload failed');
        }
        return res.url;
      })
    );
  }
}
