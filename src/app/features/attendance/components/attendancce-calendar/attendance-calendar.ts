import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AttendanceService } from '../../services/attendance.service';
import { AttendanceCalendarData } from '../../../../core/models/attendance.models';

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
  currentMonth = new Date().getMonth(); // 0 = Jan
  daysGrid: CalendarCell[] = [];
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    this.buildAndLoad(this.currentYear, this.currentMonth);
  }

  // Build & load attendance for month
  async buildAndLoad(year: number, monthIndex: number) {
    this.currentYear = year;
    this.currentMonth = monthIndex;
    this.buildEmptyGrid(year, monthIndex);
    this.loadCalendar(year, monthIndex + 1); // API expects 1-based month
  }

  // Build 6-week calendar grid
  buildEmptyGrid(year: number, monthIndex: number) {
    const firstOfMonth = new Date(year, monthIndex, 1);
    let startDayIndex = firstOfMonth.getDay(); // 0=Sun,6=Sat
    const startDate = new Date(firstOfMonth);
    startDate.setDate(firstOfMonth.getDate() - startDayIndex); // start from previous Sunday
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

  // Fetch attendance data and map it
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
              cell.isHoliday = !!found.isHoliday;
            }
          });
        },
        error: (err) => console.error('Error loading attendance calendar:', err)
      });
  }

  normalizeKey(dateInput: string | Date): string {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
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

  // Map to color classes
  getDateClass(cell: CalendarCell): string {
    
  // Not in current month (dimmed)
  if (!cell.inCurrentMonth) return 'other-month-day';

  // Force weekend to stay grey even if attendance says absent
  if (cell.isWeekend) return 'weekend-day';

  // API Holiday
  if (cell.isHoliday) return 'holiday-day';

  // Attendance status
  if (cell.attendance) {
  const status = (cell.attendance.status || '').toLowerCase();
  switch (status) {
    case 'present': return 'present-day';
    case 'absent': return 'absent-day';
    case 'leave': return 'leave-day';
    case 'half_day':
    case 'half-day':
    case 'half day': return 'half-day';
    case 'late': return 'late-day';
    case 'no record':
    case 'upcoming':
      return 'no-record-day';
    case 'weekend':
      return 'weekend-day';
    default:
      return 'working-day'; // ✅ neutral color for unknown/future statuses
  }
}


  // Default working day
  return 'working-day';
}



  // Tooltip info
  getTooltip(cell: CalendarCell): string {
    if (cell.attendance) {
      const a = cell.attendance;
      let t = `Date: ${new Date(a.date).toDateString()} | Status: ${a.status}`;
      if (a.checkInTime) t += ` | In: ${this.shortTime(a.checkInTime)}`;
      if (a.checkOutTime) t += ` | Out: ${this.shortTime(a.checkOutTime)}`;
      if (a.totalHours) t += ` | Hours: ${a.totalHours}`;
      if (a.isHoliday) t += ' | Holiday';
      return t;
    }
    if (cell.isWeekend) return `Weekend (${this.weekDays[cell.date.getDay()]})`;
    return `No record`;
  }

  shortTime(isoOrTime: string): string {
    const dt = new Date(isoOrTime);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return isoOrTime;
  }
}
