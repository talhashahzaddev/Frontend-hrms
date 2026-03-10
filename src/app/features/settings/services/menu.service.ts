// core/services/menu.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MenusResponse } from '../../../core/models/role.models';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private apiUrl = `${environment.apiUrl}/Auth`;

  constructor(private http: HttpClient) {}

  /** GET /Auth/menus - Retrieve all menus, submenus and their actions */
  getMenus(): Observable<MenusResponse> {
    return this.http.get<MenusResponse>(`${this.apiUrl}/menus`);
  }
}
