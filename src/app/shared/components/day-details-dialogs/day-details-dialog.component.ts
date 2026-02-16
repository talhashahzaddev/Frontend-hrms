import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AttendanceService } from '../../../features/attendance/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';

export interface DayDetailsDialogData {
    date: Date;
    events: any[];
}

@Component({
    selector: 'app-day-details-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule, MatProgressSpinnerModule],
    templateUrl: './day-details-dialog.component.html',
    styleUrls: ['./day-details-dialog.component.scss']
})
export class DayDetailsDialogComponent implements OnInit {
    isLoading = true;
    userName: string = '';

    // Data Model for UI
    details: any = {
        summary: { firstCheckIn: '--:--', lastCheckOut: '--:--', totalHours: '0h 0m', overtime: '0h 0m', status: 'Absent' },
        sessions: [],
        shift: 'General Shift'
    };

    constructor(
        public dialogRef: MatDialogRef<DayDetailsDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DayDetailsDialogData,
        private attendanceService: AttendanceService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        const user = this.authService.getCurrentUserValue();
        this.userName = user?.firstName ? `${user.firstName} ${user.lastName}` : 'Employee';

        // 1. Robust ID Check
        const userId = user?.userId;

        // 2. Local Date Format
        const d = new Date(this.data.date);
        const offset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - offset);
        const dateStr = localDate.toISOString().split('T')[0];

        if (userId) {
            this.fetchData(userId, dateStr);
        } else {
            this.isLoading = false;
        }
    }

    private fetchData(userId: string, date: string): void {
        // Fork calls or sequential? Sequential is safer for simple logic
        this.attendanceService.getTodaySessionsById(userId, date).subscribe({
            next: (sessions) => {
                this.processSessions(sessions);
                this.isLoading = false;
            },
            error: (err) => {
                console.error(err);
                this.isLoading = false;
            }
        });

        // Optional: Get Shift Name
        this.attendanceService.getCurrentShift(userId).subscribe({
            next: (shift) => { if (shift) this.details.shift = shift.shiftName; },
            error: () => { } // Ignore shift errors
        });
    }

    private processSessions(sessions: any[]): void {
        if (!sessions || sessions.length === 0) return;

        // Sort
        const sorted = sessions.sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());

        let totalMs = 0;
        const now = new Date();

        this.details.sessions = sorted.map(s => {
            const inTime = new Date(s.checkInTime);
            const outTime = s.checkOutTime ? new Date(s.checkOutTime) : null;
            let diff = 0;

            if (outTime) {
                diff = outTime.getTime() - inTime.getTime();
            } else {
                // Active session calculation
                const isToday = new Date().toDateString() === inTime.toDateString();
                if (isToday) diff = now.getTime() - inTime.getTime();
            }

            if (diff > 0) totalMs += diff;

            // Format duration
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);

            return {
                checkIn: inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                checkOut: outTime ? outTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active',
                duration: `${h}h ${m}m`
            };
        });

        // Summary
        this.details.summary.firstCheckIn = new Date(sorted[0].checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const last = sorted[sorted.length - 1];
        this.details.summary.lastCheckOut = last.checkOutTime ? new Date(last.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active';
        this.details.summary.status = 'Present';

        const totalMins = Math.floor(totalMs / 60000);
        const th = Math.floor(totalMins / 60);
        const tm = totalMins % 60;
        this.details.summary.totalHours = `${th}h ${tm}m`;

        if (totalMins > 480) {
            const oh = Math.floor((totalMins - 480) / 60);
            const om = (totalMins - 480) % 60;
            this.details.summary.overtime = `${oh}h ${om}m`;
        }
    }

    get formattedDate(): string {
        return this.data.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    onClose(): void {
        this.dialogRef.close();
    }
}
