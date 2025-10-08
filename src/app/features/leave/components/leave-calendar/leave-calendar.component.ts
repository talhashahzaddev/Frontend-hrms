import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Subject, takeUntil } from 'rxjs';

import { LeaveService } from '../../services/leave.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LeaveCalendarEvent } from '../../../../core/models/leave.models';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: LeaveCalendarEvent[];
}

@Component({
  selector: 'app-leave-calendar',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  template: `
    <div class="leave-calendar-container">
      
      <!-- Header -->
      <div class="calendar-header">
        <h1 class="page-title">
          <mat-icon>calendar_month</mat-icon>
          Leave Calendar
        </h1>
        <div class="calendar-controls">
          <button mat-icon-button (click)="previousMonth()" [disabled]="isLoading">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <h2 class="month-year">{{ currentMonth | date:'MMMM yyyy' }}</h2>
          <button mat-icon-button (click)="nextMonth()" [disabled]="isLoading">
            <mat-icon>chevron_right</mat-icon>
          </button>
          <button mat-stroked-button (click)="goToToday()" [disabled]="isLoading">
            <mat-icon>today</mat-icon>
            Today
          </button>
        </div>
      </div>

      <!-- Legend -->
      <mat-card class="legend-card">
        <div class="legend-items">
          <div class="legend-item">
            <div class="legend-indicator approved"></div>
            <span>Approved</span>
          </div>
          <div class="legend-item">
            <div class="legend-indicator pending"></div>
            <span>Pending</span>
          </div>
          <div class="legend-item">
            <div class="legend-indicator rejected"></div>
            <span>Rejected</span>
          </div>
          <div class="legend-item">
            <div class="legend-indicator current-day"></div>
            <span>Today</span>
          </div>
        </div>
      </mat-card>

      <!-- Calendar -->
      <mat-card class="calendar-card">
        <div *ngIf="!isLoading" class="calendar-grid">
          
          <!-- Day Headers -->
          <div class="calendar-header-row">
            <div class="day-header" *ngFor="let day of weekDays">{{ day }}</div>
          </div>

          <!-- Calendar Days -->
          <div class="calendar-body">
            <div *ngFor="let day of calendarDays" 
                 class="calendar-day"
                 [class.other-month]="!day.isCurrentMonth"
                 [class.today]="day.isToday"
                 [class.has-events]="day.events.length > 0">
              
              <div class="day-number">{{ day.dayNumber }}</div>
              
              <div class="day-events" *ngIf="day.events.length > 0">
                <div *ngFor="let event of day.events | slice:0:3" 
                  class="event-item"
                  [class.approved]="event.status === 'approved'"
                  [class.pending]="event.status === 'pending'"
                  [class.rejected]="event.status === 'rejected'"
                  [matTooltip]="getEventTooltip(event)">
                  <div class="event-dot" [style.background-color]="event.leaveTypeColor || '#2196F3'"></div>
                  <span class="event-name">{{ event.employeeName }}</span>
                </div>
                
                <div *ngIf="day.events.length > 3" class="more-events">
                  +{{ day.events.length - 3 }} more
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
          <p>Loading calendar...</p>
        </div>
      </mat-card>

      <!-- Upcoming Leaves -->
      <mat-card class="upcoming-card">
        <mat-card-header>
          <mat-card-title>Upcoming Leaves</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="upcoming-list">
            <div *ngFor="let event of upcomingLeaves" class="upcoming-item">
              <div class="upcoming-date">
                <div class="date-day">{{ event.startDate | date:'d' }}</div>
                <div class="date-month">{{ event.startDate | date:'MMM' }}</div>
              </div>
              <div class="upcoming-details">
                <h4>{{ event.employeeName }}</h4>
                <p>{{ event.leaveTypeName }}</p>
                <span class="duration">{{ event.startDate | date:'mediumDate' }} - {{ event.endDate | date:'mediumDate' }}</span>
              </div>
              <div class="upcoming-status">
                <mat-icon 
                  [class.approved]="event.status === 'approved'" 
                  [class.pending]="event.status === 'pending'" 
                  [class.rejected]="event.status === 'rejected'">
                  {{ event.status === 'approved' ? 'check_circle' : event.status === 'pending' ? 'schedule' : 'cancel' }}
                </mat-icon>
              </div>
            </div>

            <div *ngIf="upcomingLeaves.length === 0" class="empty-upcoming">
              <mat-icon>event_available</mat-icon>
              <p>No upcoming leaves</p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

    </div>
  `,
  styles: [`
    .leave-calendar-container {
      padding: var(--spacing-lg);
      min-height: calc(100vh - 64px);
      background: var(--gray-50);
    }

    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-xl);
      flex-wrap: wrap;
      gap: var(--spacing-lg);

      .page-title {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        font-size: 2rem;
        font-weight: 700;
        color: var(--gray-900);
        margin: 0;

        mat-icon {
          color: var(--primary-600);
          font-size: 2rem;
          width: 2rem;
          height: 2rem;
        }
      }

      .calendar-controls {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);

        .month-year {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--gray-900);
          margin: 0;
          min-width: 200px;
          text-align: center;
        }

        button {
          border-radius: var(--radius-lg);
          font-weight: 600;
        }
      }
    }

    .legend-card {
      margin-bottom: var(--spacing-lg);
      border-radius: var(--radius-xl);

      .legend-items {
        display: flex;
        gap: var(--spacing-xl);
        padding: var(--spacing-md);
        flex-wrap: wrap;

        .legend-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);

          .legend-indicator {
            width: 16px;
            height: 16px;
            border-radius: var(--radius-sm);

            &.approved {
              background: #16a34a;
            }

            &.pending {
              background: #ffc107;
            }

            &.rejected {
              background: #dc2626;
            }

            &.current-day {
              background: var(--primary-500);
            }
          }

          span {
            font-size: 0.875rem;
            color: var(--gray-700);
            font-weight: 500;
          }
        }
      }
    }

    .calendar-card {
      margin-bottom: var(--spacing-xl);
      border-radius: var(--radius-xl);

      ::ng-deep .mat-mdc-card-content {
        padding: var(--spacing-lg);
      }
    }

    .calendar-grid {
      width: 100%;
    }

    .calendar-header-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1px;
      background: var(--gray-200);
      border: 1px solid var(--gray-200);
      border-bottom: none;

      .day-header {
        background: var(--gray-100);
        padding: var(--spacing-md);
        text-align: center;
        font-weight: 600;
        color: var(--gray-700);
        font-size: 0.875rem;
        text-transform: uppercase;
      }
    }

    .calendar-body {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1px;
      background: var(--gray-200);
      border: 1px solid var(--gray-200);

      .calendar-day {
        background: white;
        min-height: 120px;
        padding: var(--spacing-sm);
        position: relative;
        transition: all 0.2s ease;

        &:hover {
          background: var(--gray-50);
        }

        &.other-month {
          background: var(--gray-50);

          .day-number {
            color: var(--gray-400);
          }
        }

        &.today {
          background: var(--primary-50);
          border: 2px solid var(--primary-500);

          .day-number {
            background: var(--primary-500);
            color: white;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }

        .day-number {
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: var(--spacing-sm);
          font-size: 0.875rem;
        }

        .day-events {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .event-item {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 6px;
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;

            .event-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              flex-shrink: 0;
            }

            .event-name {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              flex: 1;
              font-weight: 500;
            }

            &.approved {
              background: #e6f4ea;
              border-left: 3px solid #16a34a;
            }

            &.pending {
              background: #fff8e1;
              border-left: 3px solid #ffc107;
            }

            &.rejected {
              background: #fee2e2;
              border-left: 3px solid #dc2626;
            }
          }

          .more-events {
            font-size: 0.7rem;
            color: var(--gray-600);
            padding: 2px 6px;
            text-align: center;
            cursor: pointer;
            
            &:hover {
              color: var(--primary-600);
            }
          }
        }
      }
    }

    .upcoming-card {
      border-radius: var(--radius-xl);

      ::ng-deep {
        .mat-mdc-card-header {
          padding: var(--spacing-lg);
          border-bottom: 1px solid var(--gray-200);

          .mat-mdc-card-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--gray-900);
            margin: 0;
          }
        }

        .mat-mdc-card-content {
          padding: var(--spacing-lg);
        }
      }
    }

    .upcoming-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);

      .upcoming-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        border: 1px solid var(--gray-200);
        border-radius: var(--radius-lg);
        transition: all 0.2s ease;

        &:hover {
          border-color: var(--primary-300);
          background: var(--primary-25);
        }

        .upcoming-date {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--spacing-sm);
          background: var(--primary-50);
          border-radius: var(--radius-md);
          min-width: 60px;

          .date-day {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--primary-700);
            line-height: 1;
          }

          .date-month {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--primary-600);
            text-transform: uppercase;
          }
        }

        .upcoming-details {
          flex: 1;

          h4 {
            font-size: 1rem;
            font-weight: 600;
            color: var(--gray-900);
            margin: 0 0 4px;
          }

          p {
            font-size: 0.875rem;
            color: var(--gray-600);
            margin: 0 0 4px;
          }

          .duration {
            font-size: 0.75rem;
            color: var(--gray-500);
          }
        }

        .upcoming-status {
          mat-icon {
            font-size: 1.5rem;
            width: 1.5rem;
            height: 1.5rem;

            &.approved {
              color: #16a34a;
            }

            &.pending {
              color: #ffc107;
            }

            &.rejected {
              color: #dc2626;
            }
          }
        }
      }

      .empty-upcoming {
        text-align: center;
        padding: var(--spacing-3xl);

        mat-icon {
          font-size: 3rem;
          width: 3rem;
          height: 3rem;
          color: var(--gray-400);
          margin-bottom: var(--spacing-md);
        }

        p {
          color: var(--gray-600);
          margin: 0;
        }
      }
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-4xl);
      gap: var(--spacing-lg);

      p {
        color: var(--gray-600);
      }
    }

    @media (max-width: 1024px) {
      .calendar-header {
        flex-direction: column;
        align-items: flex-start;

        .calendar-controls {
          width: 100%;
          justify-content: space-between;
        }
      }

      .calendar-body .calendar-day {
        min-height: 80px;
      }
    }

    @media (max-width: 768px) {
      .leave-calendar-container {
        padding: var(--spacing-md);
      }

      .calendar-header-row .day-header {
        font-size: 0.75rem;
        padding: var(--spacing-sm);
      }

      .calendar-body .calendar-day {
        min-height: 60px;
        padding: 4px;

        .day-number {
          font-size: 0.75rem;
        }

        .day-events .event-item {
          font-size: 0.65rem;
          padding: 2px 4px;

          .event-name {
            display: none;
          }
        }
      }
    }
  `]
})
export class LeaveCalendarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  currentMonth = new Date();
  calendarDays: CalendarDay[] = [];
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  calendarEvents: LeaveCalendarEvent[] = [];
  upcomingLeaves: LeaveCalendarEvent[] = [];
  
  isLoading = false;

  constructor(
    private leaveService: LeaveService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.generateCalendar();
    this.loadCalendarData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    this.calendarDays = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayDate = new Date(currentDate);
      dayDate.setHours(0, 0, 0, 0);
      
      this.calendarDays.push({
        date: dayDate,
        dayNumber: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: dayDate.getTime() === today.getTime(),
        events: []
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  private loadCalendarData(): void {
    this.isLoading = true;
    
    const startDate = this.calendarDays[0].date.toISOString();
    const endDate = this.calendarDays[this.calendarDays.length - 1].date.toISOString();
    
    this.leaveService.getLeaveCalendar(startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.calendarEvents = response.map(event => ({
            ...event,
            status: event.status.toLowerCase(),
            leaveTypeColor: this.getStatusColor(event.status)
          }));

          this.distributeEventsToCalendar();
          this.loadUpcomingLeaves();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading calendar data:', error);
          this.notificationService.showError('Failed to load calendar data');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private getStatusColor(status: string): string {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'approved':
        return '#16a34a'; // green-600
      case 'pending':
        return '#ffc107'; // yellow/amber
      case 'rejected':
        return '#dc2626'; // red-600
      default:
        return '#2196F3'; // blue (fallback)
    }
  }

  private distributeEventsToCalendar(): void {
    this.calendarDays.forEach(day => {
      day.events = this.calendarEvents.filter(event => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        const dayDate = new Date(day.date);
        
        eventStart.setHours(0, 0, 0, 0);
        eventEnd.setHours(0, 0, 0, 0);
        dayDate.setHours(0, 0, 0, 0);
        
        return dayDate >= eventStart && dayDate <= eventEnd;
      });
    });
  }

  private loadUpcomingLeaves(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    this.upcomingLeaves = this.calendarEvents
      .filter(event => {
        const eventStart = new Date(event.startDate);
        eventStart.setHours(0, 0, 0, 0);
        return eventStart >= today;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);
  }

  previousMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
    this.generateCalendar();
    this.loadCalendarData();
  }

  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    this.generateCalendar();
    this.loadCalendarData();
  }

  goToToday(): void {
    this.currentMonth = new Date();
    this.generateCalendar();
    this.loadCalendarData();
  }

  getEventTooltip(event: LeaveCalendarEvent): string {
    return `${event.employeeName} - ${event.leaveTypeName}\n${event.startDate} to ${event.endDate}\nStatus: ${event.status}`;
  }
}