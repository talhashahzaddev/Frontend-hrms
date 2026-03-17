import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  HolidayCatalog,
  CatalogCountry,
  CompanyHoliday,
  CreateCompanyHoliday,
  UpdateCompanyHoliday,
  ImportFromCatalog,
  EmployeeRestrictedHoliday,
  SelectRestrictedHoliday,
  HolidayRange,
  HolidaySummary,
  HolidayApiResponse
} from '../../../core/models/holiday.models';

@Injectable({
  providedIn: 'root'
})
export class HolidayService {
  private readonly apiUrl = `${environment.apiUrl}/Holiday`;

  constructor(private http: HttpClient) {}

  // ========================
  // Catalog
  // ========================

  getAvailableCountries(): Observable<CatalogCountry[]> {
    return this.http.get<HolidayApiResponse<CatalogCountry[]>>(`${this.apiUrl}/catalog/countries`)
      .pipe(map(res => res.data || []));
  }

  getCatalogByCountry(countryCode: string): Observable<HolidayCatalog[]> {
    return this.http.get<HolidayApiResponse<HolidayCatalog[]>>(`${this.apiUrl}/catalog/${countryCode}`)
      .pipe(map(res => res.data || []));
  }

  // ========================
  // Company Holidays (CRUD)
  // ========================

  getCompanyHolidays(year?: number): Observable<CompanyHoliday[]> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    return this.http.get<HolidayApiResponse<CompanyHoliday[]>>(this.apiUrl, { params })
      .pipe(map(res => res.data || []));
  }

  getCompanyHoliday(id: string): Observable<CompanyHoliday> {
    return this.http.get<HolidayApiResponse<CompanyHoliday>>(`${this.apiUrl}/${id}`)
      .pipe(map(res => res.data));
  }

  createCompanyHoliday(dto: CreateCompanyHoliday): Observable<CompanyHoliday> {
    return this.http.post<HolidayApiResponse<CompanyHoliday>>(this.apiUrl, dto)
      .pipe(map(res => {
        if (!res.success) throw new Error(res.message);
        return res.data;
      }));
  }

  updateCompanyHoliday(id: string, dto: UpdateCompanyHoliday): Observable<CompanyHoliday> {
    return this.http.put<HolidayApiResponse<CompanyHoliday>>(`${this.apiUrl}/${id}`, dto)
      .pipe(map(res => {
        if (!res.success) throw new Error(res.message);
        return res.data;
      }));
  }

  deleteCompanyHoliday(id: string): Observable<boolean> {
    return this.http.delete<HolidayApiResponse<boolean>>(`${this.apiUrl}/${id}`)
      .pipe(map(res => res.success));
  }

  importFromCatalog(dto: ImportFromCatalog): Observable<CompanyHoliday[]> {
    return this.http.post<HolidayApiResponse<CompanyHoliday[]>>(`${this.apiUrl}/import-from-catalog`, dto)
      .pipe(map(res => {
        if (!res.success) throw new Error(res.message);
        return res.data || [];
      }));
  }

  // ========================
  // Holiday Queries (Calendar/Attendance integration)
  // ========================

  getHolidaysInRange(start: string, end: string): Observable<HolidayRange[]> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get<HolidayApiResponse<HolidayRange[]>>(`${this.apiUrl}/range`, { params })
      .pipe(map(res => res.data || []));
  }

  getMyHolidaysInRange(start: string, end: string): Observable<HolidayRange[]> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get<HolidayApiResponse<HolidayRange[]>>(`${this.apiUrl}/range/my`, { params })
      .pipe(map(res => res.data || []));
  }

  getEmployeeAssignments(holidayId: string): Observable<string[]> {
    return this.http.get<HolidayApiResponse<string[]>>(`${this.apiUrl}/${holidayId}/assignments`)
      .pipe(map(res => res.data || []));
  }

  isHoliday(date: string): Observable<boolean> {
    const params = new HttpParams().set('date', date);
    return this.http.get<HolidayApiResponse<boolean>>(`${this.apiUrl}/check`, { params })
      .pipe(map(res => res.data));
  }

  getHolidaySummary(year?: number): Observable<HolidaySummary> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    return this.http.get<HolidayApiResponse<HolidaySummary>>(`${this.apiUrl}/summary`, { params })
      .pipe(map(res => res.data));
  }

  // ========================
  // Employee Restricted Holidays
  // ========================

  getAvailableRestrictedHolidays(year?: number): Observable<CompanyHoliday[]> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    return this.http.get<HolidayApiResponse<CompanyHoliday[]>>(`${this.apiUrl}/restricted`, { params })
      .pipe(map(res => res.data || []));
  }

  getMyAvailableRestrictedHolidays(year?: number): Observable<CompanyHoliday[]> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    return this.http.get<HolidayApiResponse<CompanyHoliday[]>>(`${this.apiUrl}/restricted/available/my`, { params })
      .pipe(map(res => res.data || []));
  }

  getMyRestrictedHolidays(year?: number): Observable<EmployeeRestrictedHoliday[]> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    return this.http.get<HolidayApiResponse<EmployeeRestrictedHoliday[]>>(`${this.apiUrl}/my-holidays`, { params })
      .pipe(map(res => res.data || []));
  }

  selectRestrictedHoliday(dto: SelectRestrictedHoliday): Observable<EmployeeRestrictedHoliday> {
    return this.http.post<HolidayApiResponse<EmployeeRestrictedHoliday>>(`${this.apiUrl}/restricted/select`, dto)
      .pipe(map(res => {
        if (!res.success) throw new Error(res.message);
        return res.data;
      }));
  }

  cancelRestrictedHoliday(id: string): Observable<boolean> {
    return this.http.delete<HolidayApiResponse<boolean>>(`${this.apiUrl}/restricted/${id}`)
      .pipe(map(res => res.success));
  }
}
