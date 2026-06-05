import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AttendanceService } from '../../services/attendance.service';
import { AttendanceCalendarData } from '../../../../core/models/attendance.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { DateTimeFormatService } from '@core/services/date-time-format.service';
import { SharedCommonModule } from '@shared/shared-common.module';
interface CalendarCell {
  date: Date;
  inCurrentMonth: boolean;
  attendance?: AttendanceCalendarData;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
}


@Component({
  selector: 'app-attendance-calendar',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    MatTooltipModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './attendance-calendar.html',
  styleUrls: ['./attendance-calendar.scss']
})
export class AttendanceCalendarComponent implements OnInit {

  attendanceData: AttendanceCalendarData[] = [];
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  daysGrid: CalendarCell[] = [];
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  constructor(private attendanceService: AttendanceService, private notification: NotificationService, private dateTimeFormat: DateTimeFormatService) {}

  ngOnInit(): void {
    this.buildAndLoad(this.currentYear, this.currentMonth);
  }

  async buildAndLoad(year: number, monthIndex: number) {
    this.currentYear = year;
    this.currentMonth = monthIndex;
    this.buildEmptyGrid(year, monthIndex);
    this.loadCalendar(year, monthIndex + 1);
  }

  buildEmptyGrid(year: number, monthIndex: number) {
    const firstOfMonth = new Date(year, monthIndex, 1);
    let startDayIndex = firstOfMonth.getDay();
    const startDate = new Date(firstOfMonth);
    startDate.setDate(firstOfMonth.getDate() - startDayIndex);
    startDate.setHours(0, 0, 0, 0);

    const cells: CalendarCell[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      d.setHours(0, 0, 0, 0);

      cells.push({
        date: d,
        inCurrentMonth: d.getMonth() === monthIndex,
        attendance: undefined,
        isToday: d.getTime() === today.getTime(),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isHoliday: false
      });
    }

    this.daysGrid = cells;
  }

  loadCalendar(year: number, monthOneBased: number) {
    this.attendanceService.getAttendanceCalendar(undefined, year, monthOneBased)
      .subscribe({
        next: (data: AttendanceCalendarData[]) => {
          this.attendanceData = data || [];
          const map = new Map<string, AttendanceCalendarData>();

          for (const a of this.attendanceData) {
            map.set(this.normalizeKey(a.date), a);
          }

          this.daysGrid.forEach(cell => {
            const found = map.get(this.normalizeKey(cell.date));
            if (found) {
              cell.attendance = found;
              cell.isHoliday = !!found.isHoliday && found.status?.toLowerCase() !== 'weekend';
            }
          });
        },
        error: (error) => {
          const errorMessage = error?.error?.message || error?.message || 'Failed to load attendance calendar';
          this.notification.showError(errorMessage);
        }
      });
  }

  normalizeKey(dateInput: string | Date): string {
    let d: Date;
    if (typeof dateInput === 'string') {
      const dateStr = dateInput.split('T')[0];
      d = new Date(dateStr);
    } else {
      d = dateInput;
    }

    if (isNaN(d.getTime())) {
      console.error('Invalid date:', dateInput);
      return '';
    }

    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

get currentMonthYear(): string {
  return new Date(this.currentYear, this.currentMonth)
    .toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

  previousMonth() {
    const newMonth = new Date(this.currentYear, this.currentMonth - 1, 1);
    this.buildAndLoad(newMonth.getFullYear(), newMonth.getMonth());
  }

  nextMonth() {
    const newMonth = new Date(this.currentYear, this.currentMonth + 1, 1);
    this.buildAndLoad(newMonth.getFullYear(), newMonth.getMonth());
  }

  goToCurrentMonth() {
    const now = new Date();
    this.buildAndLoad(now.getFullYear(), now.getMonth());
  }

  getDateClass(cell: CalendarCell): string {
    if (!cell.inCurrentMonth) return 'other-month-day';

    if (cell.isWeekend) {
      return 'weekend-day';
    }

    if (cell.attendance) {
      const status = (cell.attendance.status || '').toLowerCase().trim();

      if (status === 'weekend') {
        return 'weekend-day';
      }

      if (status === 'holiday') {
        return 'holiday-day';
      }

      if (status === 'leave' || status === 'on_leave') {
        return 'leave-day';
      }

      switch (status) {
        case 'present':
          return 'present-day';
        case 'half_day':
        case 'half-day':
        case 'half day':
          return 'half-day';
        case 'late':
          return 'late-day';
        case 'no record':
        case 'upcoming':
        case 'norecord':
        case 'no_record':
          return 'no-record-day';
        case 'absent':
          return 'absent-day';
        default:
          return 'working-day';
      }
    }

    if (cell.isHoliday) return 'holiday-day';

    return 'working-day';
  }

  getStatusDotClass(cell: CalendarCell): string {
  if (!cell.inCurrentMonth) return '';
  if (cell.isWeekend) return 'dot-weekend';
  if (cell.isHoliday) return 'dot-holiday';

  if (cell.attendance) {
    const status = (cell.attendance.status || '').toLowerCase().trim();
    if (status === 'weekend') return 'dot-weekend';
    if (status === 'present') return 'dot-present';
    if (status === 'absent') return 'dot-absent';
    if (status === 'late') return 'dot-late';
    if (status === 'leave' || status === 'on_leave') return 'dot-leave';
    if (['half_day', 'half-day', 'half day'].includes(status)) return 'dot-half';
    if (['no record', 'norecord', 'no_record', 'upcoming'].includes(status)) return 'dot-norecord';
  }

  return '';
}


  getTooltip(cell: CalendarCell): string {
    if (cell.attendance) {
      const a = cell.attendance;
      let t = `Date: ${new Date(a.date).toDateString()} | Status: ${a.status}`;
      if (a.checkInTime) t += ` | In: ${this.shortTime(a.checkInTime)}`;
      if (a.checkOutTime) t += ` | Out: ${this.shortTime(a.checkOutTime)}`;
      if (a.totalHours) t += ` | Hours: ${a.totalHours}`;
      if (a.isHoliday) t += ` | Holiday${a.holidayName ? ': ' + a.holidayName : ''}`;
      return t;
    }
    if (cell.isWeekend) return `Weekend (${this.weekDays[cell.date.getDay()]})`;
    return `No record`;
  }

  shortTime(isoOrTime: string): string {
    return this.dateTimeFormat.formatTime(isoOrTime, { fallback: isoOrTime });
  }
}
