// core/services/menu.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ApiMenu {
  menuId: string;
  menuName: string;
  icon: string;
  subMenus: {
    subMenuId: string;
    subMenuName: string;
    icon: string | null;
  }[];
}

export interface MenusResponse {
  data: ApiMenu[];
  success: boolean;
  message: string;
  errors: null | any;
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private apiUrl = `${environment.apiUrl}/Auth`;

  constructor(private http: HttpClient) {}

  /** GET /api/menus - Retrieve all menus and submenus */
  getMenus(): Observable<MenusResponse> {
    return this.http.get<MenusResponse>(`${this.apiUrl}/menus`);
  }
}
