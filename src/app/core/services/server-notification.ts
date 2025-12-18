import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; 
import {ServerNotification} from '../models/common.models'
import { environment } from '../../../environments/environment';

export interface ServerNotificationDto {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface SendNotificationDto {
  employeeId: string;
  type: string; // e.g., 'shift-swap', 'announcement'
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServerNotificationService {

  private readonly apiUrl = `${environment.apiUrl}/Notification`;
  // private apiUrl = 'https://localhost:60485/api/Notification';

  constructor(private http: HttpClient) {}


getNotifications(userId: string): Observable<ServerNotification[]> {
  return this.http
    .get<{ data: ServerNotification[] }>(`${this.apiUrl}/user?userid=${userId}`)
    .pipe(map(res => res.data));
}



 markAsRead(notificationId: string): Observable<void> {
  return this.http.put<void>(
    `${this.apiUrl}/NotificationMark-read?notificationId=${notificationId}`,
    {}
  );
}


  sendNotification(payload: SendNotificationDto): Observable<ServerNotificationDto> {
    return this.http.post<ServerNotificationDto>(`${this.apiUrl}/sendNotification`, payload);
  }
}
