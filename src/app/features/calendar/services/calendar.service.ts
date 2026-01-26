import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { AttendanceService } from '../../attendance/services/attendance.service';
import { LeaveService } from '../../leave/services/leave.service';
import { CalendarEvent } from '../models/calendar.models';

@Injectable({
    providedIn: 'root'
})
export class CalendarService {

    constructor(
        private attendanceService: AttendanceService,
        private leaveService: LeaveService
    ) { }

    /**
     * Fetches and aggregates calendar events from multiple sources
     * @param month - Month (1-12)
     * @param year - Year
     * @returns Observable<CalendarEvent[]>
     */
    getCalendarEvents(month: number, year: number): Observable<CalendarEvent[]> {
        // Calculate date range for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month

        // For calendar view, we need to show previous/next month days too
        const firstDay = new Date(startDate);
        firstDay.setDate(firstDay.getDate() - startDate.getDay()); // Go back to Sunday

        const lastDay = new Date(endDate);
        lastDay.setDate(lastDay.getDate() + (6 - endDate.getDay())); // Go forward to Saturday

        const startDateISO = firstDay.toISOString();
        const endDateISO = lastDay.toISOString();

        // Fetch data from all sources concurrently
        return forkJoin({
            attendance: this.attendanceService.getAttendanceCalendar(undefined, year, month).pipe(
                catchError(error => {
                    console.error('Failed to fetch attendance:', error);
                    return of([]);
                })
            ),
            leaves: this.leaveService.getLeaveCalendar(startDateISO, endDateISO).pipe(
                catchError(error => {
                    console.error('Failed to fetch leaves:', error);
                    return of([]);
                })
            ),
            leaveTypes: this.leaveService.getLeaveTypes().pipe(
                catchError(error => {
                    console.error('Failed to fetch leave types:', error);
                    return of([]);
                })
            )
        }).pipe(
            map(({ attendance, leaves, leaveTypes }) => {
                const events: CalendarEvent[] = [];

                // Create a Color Map for robust lookup
                const colorMap = new Map<string, string>();
                leaveTypes.forEach(type => colorMap.set(type.leaveTypeId, type.color));

                // Map attendance data to CalendarEvents
                attendance.forEach(att => {
                    const status = (att.status || '').toLowerCase();

                    // Skip weekends and no-record days
                    if (status === 'weekend' || status === 'no record' || status === 'upcoming') {
                        return;
                    }

                    events.push({
                        date: new Date(att.date),
                        type: 'ATTENDANCE',
                        title: this.getAttendanceTitle(status),
                        status: status,
                        color: this.getAttendanceColor(status),
                        details: {
                            checkInTime: att.checkInTime,
                            checkOutTime: att.checkOutTime,
                            totalHours: att.totalHours?.toString()
                        }
                    });
                });

                // Map leave data to CalendarEvents
                leaves.forEach(leave => {
                    const status = (leave.status || '').toLowerCase();
                    const leaveStart = new Date(leave.startDate);
                    const leaveEnd = new Date(leave.endDate);

                    // Robust color lookup
                    const typeColor = colorMap.get(leave.leaveTypeId);
                    const finalColor = typeColor || '#2563eb'; // Fallback only if type not found

                    // Create events for each day in the leave range
                    for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
                        events.push({
                            date: new Date(d),
                            type: 'LEAVE',
                            title: leave.leaveTypeName || 'Leave',
                            status: status,
                            color: finalColor,
                            details: {
                                leaveType: leave.leaveTypeName,
                                reason: leave.reason,
                                employeeName: leave.employeeName,
                                startDate: leave.startDate,
                                endDate: leave.endDate
                            }
                        });
                    }
                });

                // Sort events by date
                return events.sort((a, b) => a.date.getTime() - b.date.getTime());
            })
        );
    }

    private getAttendanceTitle(status: string): string {
        switch (status) {
            case 'present': return 'Present';
            case 'absent': return 'Absent';
            case 'half_day':
            case 'half-day':
            case 'half day': return 'Half Day';
            case 'late': return 'Late';
            case 'leave':
            case 'on_leave': return 'On Leave';
            default: return status.charAt(0).toUpperCase() + status.slice(1);
        }
    }

    private getAttendanceColor(status: string): string {
        switch (status) {
            case 'present': return '#16a34a'; // Green
            case 'absent': return '#dc2626'; // Red
            case 'half_day':
            case 'half-day':
            case 'half day':
            case 'late': return '#f59e0b'; // Amber
            case 'leave':
            case 'on_leave': return '#2563eb'; // Blue
            default: return '#6b7280'; // Gray
        }
    }

    private getLeaveColor(status: string): string {
        switch (status) {
            case 'approved': return '#2563eb'; // Blue (distinct from green)
            case 'pending': return '#0891b2'; // Cyan (distinct from all others)
            case 'rejected': return '#4b5563'; // Dark Gray (distinct from red)
            default: return '#6b7280'; // Gray
        }
    }
}
