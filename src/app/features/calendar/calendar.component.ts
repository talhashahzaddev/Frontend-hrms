import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { Attendance, TimeTrackingSession } from '../../core/models/attendance.models';
// Services & Models
import { CalendarService } from './services/calendar.service';
import { CalendarEvent } from './models/calendar.models';
import { NotificationService } from '../../core/services/notification.service';
import { AttendanceService } from '../attendance/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { EmployeeService } from '../employee/services/employee.service';
import { Employee } from '../../core/models/employee.models';
import { PromptDialogComponent } from '../../shared/components/prompt-dialog/prompt-dialog.component';
// import { DayDetailsDialogComponent } from '../../shared/components/day-details-dialogs/day-details-dialog.component';
// import { CalendarDetailsDialogComponent } from '../../shared/components/calendar-details-dialog/calendar-details-dialog.component';
import { CalendarDetailsDialogueComponent } from '../../shared/components/calendar-details-dialog/view-details-dialogue.component';
import { CommentDialogComponent } from '../../shared/components/comment-dialog/comment-dialog.component';

interface CalendarDay {
    date: Date;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
    events: CalendarEvent[];
}

type EventFilter = 'ALL' | 'ATTENDANCE' | 'LEAVE' | 'HOLIDAY';

@Component({
    selector: 'app-calendar',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatSelectModule,
        MatFormFieldModule,
        MatProgressSpinnerModule,
        MatMenuModule,
        MatDividerModule
    ],
    templateUrl: './calendar.component.html',
    styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit, OnDestroy {
    @ViewChild(MatMenuTrigger) contextMenu!: MatMenuTrigger;

    private destroy$ = new Subject<void>();

    userInfo: Employee | null = null;
    hireDate: Date | null = null;

    currentMonth = new Date();
    calendarDays: CalendarDay[] = [];
    weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    allEvents: CalendarEvent[] = [];
    eventFilter: EventFilter = 'ALL';
    filterOptions: { value: EventFilter; label: string }[] = [
        { value: 'ALL', label: 'All Events' },
        { value: 'ATTENDANCE', label: 'Attendance Only' },
        { value: 'LEAVE', label: 'Leaves Only' },
        { value: 'HOLIDAY', label: 'Holidays Only' }
    ];

    isLoading = false;

    // Context Menu State
    contextMenuPosition = { x: '0px', y: '0px' };
    selectedDay: CalendarDay | null = null;

    constructor(
        private calendarService: CalendarService,
        private notificationService: NotificationService,
        private attendanceService: AttendanceService,
        private router: Router,
        private dialog: MatDialog,
        private authService: AuthService,
        private employeeService: EmployeeService
    ) { }

    ngOnInit(): void {
        this.loadUserInfo();
        this.generateCalendar();
        this.loadCalendarData();
    }

    private loadUserInfo(): void {
        const currentUser = this.authService.getCurrentUserValue();
        if (currentUser && currentUser.userId) {
            this.employeeService.getEmployee(currentUser.userId)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (employee) => {
                        this.userInfo = employee;
                        if (employee.hireDate) {
                            this.hireDate = new Date(employee.hireDate);
                            // Re-distribute to apply filter if data is already loaded
                            this.distributeEventsToCalendar();
                        }
                    },
                    error: (err) => console.error('Failed to load employee info', err)
                });
        }
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

        // Start from the Sunday before the first day of month
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // End on the Saturday after the last day of month
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
                isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
                events: []
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    private loadCalendarData(): void {
        this.isLoading = true;

        const month = this.currentMonth.getMonth() + 1; // 1-based month
        const year = this.currentMonth.getFullYear();

        this.calendarService.getCalendarEvents(month, year)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (events) => {
                    this.allEvents = events;
                    // FIX: Merge real-time session status to ensure buttons update immediately
                    this.mergeCurrentSession();
                },
                error: (error) => {
                    console.error('Error loading calendar data:', error);
                    const errorMessage = error?.error?.message || error?.message || 'Failed to load calendar data';
                    this.notificationService.showError(errorMessage);
                    this.isLoading = false;
                }
            });
    }

    private mergeCurrentSession(): void {
        this.attendanceService.getCurrentSession()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (session: TimeTrackingSession | null) => {
                    if (session && session.isActive) {
                        // Find if there's an existing attendance event for today
                        const todayStr = new Date().toDateString();
                        const existingEventIndex = this.allEvents.findIndex(e =>
                            e.type === 'ATTENDANCE' &&
                            e.details?.checkInTime &&
                            new Date(e.details.checkInTime).toDateString() === todayStr
                        );

                        if (existingEventIndex > -1) {
                            // Update existing event
                            this.allEvents[existingEventIndex].status = 'present'; // active = present
                            // Ensure checkOutTime is null if active
                            if (this.allEvents[existingEventIndex].details) {
                                this.allEvents[existingEventIndex].details!.checkOutTime = undefined;
                            }
                        } else {
                            // Create new synthetic event for immediate feedback
                            const newEvent: CalendarEvent = {
                                date: new Date(),
                                type: 'ATTENDANCE',
                                title: 'Present',
                                status: 'present',
                                color: '#16a34a', // Present green
                                details: {
                                    checkInTime: session.checkInTime,
                                    totalHours: '0'
                                }
                            };
                            this.allEvents.push(newEvent);
                        }
                    }
                    this.distributeEventsToCalendar();
                    this.isLoading = false;
                },
                error: () => {
                    // Fallback to just distributing what we have
                    this.distributeEventsToCalendar();
                    this.isLoading = false;
                }
            });
    }

    private distributeEventsToCalendar(): void {
        // Clear existing events
        this.calendarDays.forEach(day => day.events = []);

        // Filter events based on current filter
        const filteredEvents = this.eventFilter === 'ALL'
            ? this.allEvents
            : this.allEvents.filter(event => event.type === this.eventFilter);

        // Distribute events to days
        this.calendarDays.forEach(day => {
            const dayDateString = day.date.toDateString(); // e.g. "Sun Jan 26 2026"

            day.events = filteredEvents.filter(event => {
                let eventTargetDate: Date;

                // FIX: For Attendance, use the actual check-in time (Local) to determine the day
                if (event.type === 'ATTENDANCE' && event.details?.checkInTime) {
                    eventTargetDate = new Date(event.details.checkInTime);
                } else {
                    // For Leave/Holiday, rely on the date field
                    eventTargetDate = new Date(event.date);
                }

                // Compare using local date strings to ignore time/TZ offsets entirely
                const isMatch = eventTargetDate.toDateString() === dayDateString;
                if (!isMatch) return false;

                // FILTER: Hide 'Absent' status if date is before Hire Date
                if (this.hireDate && event.type === 'ATTENDANCE' && event.status.toLowerCase() === 'absent') {
                    // Normalize dates to ignore exact time
                    const eventTime = new Date(day.date);
                    eventTime.setHours(0, 0, 0, 0);
                    const hireTime = new Date(this.hireDate);
                    hireTime.setHours(0, 0, 0, 0);

                    if (eventTime < hireTime) {
                        return false;
                    }
                }

                return true;
            });
        });
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

    onFilterChange(): void {
        this.distributeEventsToCalendar();
    }

    getEventTooltip(event: CalendarEvent): string {
        let tooltip = `${event.title} - ${event.status}`;

        if (event.type === 'ATTENDANCE' && event.details) {
            if (event.details.checkInTime) tooltip += `\nCheck-in: ${this.formatTime(event.details.checkInTime)}`;
            if (event.details.checkOutTime) tooltip += `\nCheck-out: ${this.formatTime(event.details.checkOutTime)}`;
            if (event.details.totalHours) tooltip += `\nTotal: ${event.details.totalHours}`;
        } else if (event.type === 'LEAVE' && event.details) {
            if (event.details.leaveType) tooltip += `\nType: ${event.details.leaveType}`;
            if (event.details.reason) tooltip += `\nReason: ${event.details.reason}`;
        }

        return tooltip;
    }

    getEventClass(event: CalendarEvent): string {
        const baseClass = event.type.toLowerCase();
        const statusClass = event.status.toLowerCase().replace(/\s+/g, '-');
        return `${baseClass}-${statusClass}`;
    }

    private formatTime(isoOrTime: string): string {
        const dt = new Date(isoOrTime);
        if (!isNaN(dt.getTime())) {
            return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return isoOrTime;
    }

    private formatHours(hours: number): string {
        if (!hours) return '0h';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }

    get currentMonthYear(): string {
        return this.currentMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    }

    // ==================== Hybrid Icon & Badge Helpers ====================

    getAttendanceEvent(day: CalendarDay): CalendarEvent | null {
        return day.events.find(e => e.type === 'ATTENDANCE') || null;
    }

    getLeaveEvents(day: CalendarDay): CalendarEvent[] {
        return day.events.filter(e => e.type === 'LEAVE' || e.type === 'HOLIDAY');
    }

    hasHoliday(day: CalendarDay): boolean {
        return day.events.some(e => e.type === 'HOLIDAY');
    }

    getAttendanceIcon(event: CalendarEvent): string {
        const status = event.status.toLowerCase();
        switch (status) {
            case 'present': return 'check_circle';
            case 'absent': return 'cancel';
            case 'half_day':
            case 'half-day':
            case 'half day':
            case 'late': return 'schedule';
            default: return 'help_outline';
        }
    }

    getAttendanceIconClass(event: CalendarEvent): string {
        const status = event.status.toLowerCase();
        switch (status) {
            case 'present': return 'status-present';
            case 'absent': return 'status-absent';
            case 'half_day':
            case 'half-day':
            case 'half day':
            case 'late': return 'status-late';
            default: return 'status-default';
        }
    }

    getEventBadgeClass(event: CalendarEvent): string {
        if (event.type === 'HOLIDAY') {
            return 'badge-holiday';
        }

        const status = event.status.toLowerCase();
        switch (status) {
            case 'approved': return 'badge-approved';
            case 'pending': return 'badge-pending';
            case 'rejected': return 'badge-rejected';
            default: return 'badge-default';
        }
    }

    getAttendanceLabel(event: CalendarEvent): string {
        const status = event.status.toLowerCase();
        switch (status) {
            case 'present': return 'Present';
            case 'absent': return 'Absent';
            case 'half_day':
            case 'half-day':
            case 'half day': return 'Half Day';
            case 'late': return 'Late';
            default: return event.status;
        }
    }

    getEventBgColor(event: CalendarEvent): string {
        if (event.type === 'HOLIDAY') {
            return '#fbcfe8'; // Pink background for holidays
        }

        // For rejected leaves, use gray
        if (event.status.toLowerCase() === 'rejected') {
            return '#e5e7eb';
        }

        // Use the event color with reduced opacity (hex to rgba)
        if (event.color) {
            const hex = event.color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, 0.15)`; // 15% opacity
        }

        return '#f3f4f6'; // Default gray
    }

    getTransparentColor(color: string | undefined): string {
        if (!color) {
            return 'rgba(37, 99, 235, 0.12)'; // Default blue with opacity
        }

        // Convert hex to rgba
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return `rgba(${r}, ${g}, ${b}, 0.15)`; // 15% opacity for readability
    }

    // ==================== Context Menu Methods ====================

    onRightClick(event: MouseEvent, day: CalendarDay): void {
        event.preventDefault();
        this.selectedDay = day;
        this.contextMenuPosition.x = event.clientX + 'px';
        this.contextMenuPosition.y = event.clientY + 'px';
        this.contextMenu.openMenu();
    }

    // Menu Action: Apply for Leave
    applyForLeave(): void {
        if (!this.selectedDay) return;

        // Open dialog to prompt for date range
        const dialogRef = this.dialog.open(PromptDialogComponent, {
            width: '400px',
            data: {
                title: 'Apply for Leave',
                label: 'Select Date Range',
                value: this.selectedDay.date // Pass the clicked date
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result && result.start && result.end) {
                // Format dates as ISO strings
                const startDateStr = result.start.toISOString();
                const endDateStr = result.end.toISOString();

                // Navigate with query params
                this.router.navigate(['/leave/apply'], {
                    queryParams: {
                        startDate: startDateStr,
                        endDate: endDateStr
                    }
                });
            }
        });
    }

    // Menu Action: Clock In
    clockIn(): void {
        if (!this.selectedDay) return;

        const request = {
            action: 'in',
            location: {
                source: 'web_app',
                timestamp: new Date().toISOString()
            }
        };

        this.attendanceService.checkIn(request).subscribe({
            next: () => {
                this.notificationService.showSuccess('Checked in successfully!');
                this.loadCalendarData(); // Refresh calendar
            },
            error: (error: any) => {
                const errorMessage = error?.error?.message || 'Failed to check in';
                this.notificationService.showError(errorMessage);
            }
        });
    }

    // Menu Action: Clock Out
    clockOut(): void {
        if (!this.selectedDay) return;

        // Open comment dialog
        const dialogRef = this.dialog.open(CommentDialogComponent, {
            width: '400px',
            data: {
                title: 'Clock Out',
                label: 'Day Updates / Comments',
                placeholder: 'E.g., completed API integration...',
                required: false
            }
        });

        dialogRef.afterClosed().subscribe(comment => {
            // If user cancelled (undefined), do nothing. Empty string is valid.
            if (comment === undefined) return;

            const request = {
                action: 'out',
                location: {
                    source: 'web_app',
                    timestamp: new Date().toISOString()
                },
                notes: comment
            };

            this.attendanceService.checkOut(request).subscribe({
                next: () => {
                    this.notificationService.showSuccess('Checked out successfully!');
                    this.loadCalendarData(); // Refresh calendar
                },
                error: (error: any) => {
                    const errorMessage = error?.error?.message || 'Failed to check out';
                    this.notificationService.showError(errorMessage);
                }
            });
        });
    }

    // Menu Action: View Day Details
    // viewDayDetails(): void {
    //     if (!this.selectedDay) return;

    //     // Open day details dialog with selected day information
    //     this.dialog.open(CalendarDetailsDialogueComponent, {
    //         width: '600px',
    //         maxWidth: '95vw',
    //         data: {
    //             date: this.selectedDay.date,
    //             events: this.selectedDay.events
    //         }
    //     });
    // }

    viewAttendanceDetails(attendance: Attendance): void {
        this.dialog.open(CalendarDetailsDialogueComponent, {
            width: '600px',
            panelClass: 'attendance-details-dialog',
            data: {
                employeeId: attendance.employeeId,
                employeeName: attendance.employeeName,
                workDate: attendance.workDate,
                checkInTime: attendance.checkInTime,
                checkOutTime: attendance.checkOutTime,
                totalHours: this.formatHours(attendance.totalHours),
                overtimeHours: attendance.overtimeHours,
                status: attendance.status,

            }
        });
    }

    viewAttendanceDetailsFromSelectedDay(): void {
        if (!this.selectedDay) return;

        // Get local date string YYYY-MM-DD to avoid timezone shift
        const localDate = this.selectedDay.date.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD

        // Get current user info for employeeId
        const currentUser = this.authService.getCurrentUserValue();
        const employeeId = currentUser?.userId || '';

        // Open day details dialog with full event data
        this.dialog.open(CalendarDetailsDialogueComponent, {
            width: '600px',
            maxWidth: '95vw',
            data: {
                date: localDate,
                events: this.selectedDay.events || [],
                employeeId: employeeId,
                employeeName: currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : 'Employee'
            }
        });
    }


    // Menu Action: Swap Shift Request
    initiateSwapRequest(): void {
        if (!this.selectedDay) return;

        // Navigate directly to shift page with swap action
        this.router.navigate(['/attendance/shift'], {
            queryParams: {
                action: 'swap',
                date: this.selectedDay.date.toISOString()
            }
        });
    }

    // ==================== Smart Menu Logic & Helpers ====================

    // 1. Helper: Date Comparison
    private isToday(date: Date): boolean {
        const today = new Date();
        const d = new Date(date);
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    }

    // 2. Helper: Check if selected day is in the past
    isPastDate(): boolean {
        if (!this.selectedDay) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(this.selectedDay.date);
        selectedDate.setHours(0, 0, 0, 0);

        return selectedDate.getTime() < today.getTime();
    }

    // 3. Logic: Check for existing leaves (Case Insensitive)
    hasExistingLeave(day: CalendarDay | null): boolean {
        if (!day) return false;
        // Returns true if there is a leave with Approved, Pending, or Rejected status
        return day.events.some(event =>
            event.type.toUpperCase() === 'LEAVE' &&
            ['APPROVED', 'PENDING', 'REJECTED'].includes(event.status.toUpperCase())
        );
    }

    // 4. Logic: Swap Shift (Enabled for future dates)
    canSwapShift(): boolean {
        if (!this.selectedDay) return false;
        return !this.isPastDate();
    }

    // 5. Logic: Apply Leave (Enabled for future dates)
    canApplyLeave(): boolean {
        if (!this.selectedDay) return false;
        return !this.isPastDate();
    }

    // 6. Logic: Clock In (Today Only)
    // Enabled if: No record exists OR the previous session is closed (has a checkout time)
    canClockIn(): boolean {
        if (!this.selectedDay) return false;

        const isToday = this.isToday(this.selectedDay.date);
        if (!isToday) return false;

        // BLOCK if there is an APPROVED Leave for today
        const hasApprovedLeave = this.selectedDay.events.some(event =>
            event.type.toUpperCase() === 'LEAVE' &&
            event.status.toUpperCase() === 'APPROVED'
        );
        if (hasApprovedLeave) return false;

        const att = this.getAttendanceEvent(this.selectedDay);

        // 1. No event? Can clock in.
        if (!att) return true;

        // 2. If details don't exist, treat as no event
        if (!att.details) return true;

        // 3. If we have checked in, we can only check in again if we have ALSO checked out.
        // (i.e., The current session is closed).
        if (att.details.checkInTime && att.details.checkOutTime) {
            return true;
        }

        // 4. If we haven't checked in yet (edge case), can clock in.
        if (!att.details.checkInTime) {
            return true;
        }

        // Otherwise (Checked In but NOT Checked Out), disable Clock In
        return false;
    }

    // 7. Logic: Clock Out (Today Only)
    // Enabled if: User is currently "In" (Checked In + No Checkout Time)
    canClockOut(): boolean {
        if (!this.selectedDay) return false;

        const isToday = this.isToday(this.selectedDay.date);
        if (!isToday) return false;

        const att = this.getAttendanceEvent(this.selectedDay);

        // Must have an event to clock out
        if (!att || !att.details) return false;

        // Enable ONLY if we have checked in AND checkOutTime is missing/null
        return !!(att.details.checkInTime && !att.details.checkOutTime);
    }

    // Helper for role-based UI visibility
    get isSuperAdmin(): boolean {
        const user = this.authService.getCurrentUserValue();
        return user?.roleName?.toLowerCase() === 'super admin';
    }
}
