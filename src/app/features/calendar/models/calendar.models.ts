export interface CalendarEvent {
    date: Date;
    type: 'ATTENDANCE' | 'LEAVE' | 'HOLIDAY';
    title: string;
    status: string;
    color?: string;
    details?: CalendarEventDetails;
}

export interface CalendarEventDetails {
    // Attendance details
    checkInTime?: string;
    checkOutTime?: string;
    totalHours?: string;
    overtimeHours?: number;
    sessionsCount?: number;
    notes?: string;

    // Leave details
    leaveType?: string;
    reason?: string;
    employeeName?: string;
    startDate?: string;
    endDate?: string;

    // Holiday details
    holidayName?: string;
    isOptional?: boolean;
}
