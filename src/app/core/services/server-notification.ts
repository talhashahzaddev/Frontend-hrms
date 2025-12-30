import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; 
import {ServerNotification} from '../models/common.models'
import { environment } from '../../../environments/environment';
import { BehaviorSubject } from 'rxjs';

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
   private notificationsSubject = new BehaviorSubject<ServerNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();
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
 /** 🔥 ADD THIS */
  loadNotifications(userId: string): void {
    if (!userId) return;

    this.getNotifications(userId).subscribe({
      next: (data) => this.notificationsSubject.next(data || []),
      error: (err) => console.error('Failed to load notifications', err)
    });
  }


  sendNotification(payload: SendNotificationDto): Observable<ServerNotificationDto> {
    return this.http.post<ServerNotificationDto>(`${this.apiUrl}/sendNotification`, payload);
  }
}
