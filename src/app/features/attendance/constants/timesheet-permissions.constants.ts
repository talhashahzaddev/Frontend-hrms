export const TIMESHEET_MENU = {
  ATTENDANCE: 'Attendance',
  TIMESHEET: 'Timesheet',
  TIMESHEET_DASHBOARD: 'Timesheet Dashboard'
} as const;

export const TIMESHEET_PERMISSIONS = {
  VIEW_DETAILS: 'timesheet_view_details',
  VIEW_DASHBOARD: 'timesheet_dashboard_view_details',
  CREATE_SNAPSHOT: 'timesheet_create_new_snapshot',
  APPROVE_REQUESTS: 'approve_updated_timesheet',
  FINALIZE: 'finalize_timesheet',
  FINALIZE_LEGACY: 'timesheet_dashboard_finalize',
  OVERRIDE_RECORD: 'edit_or_override_attendace_recored'
} as const;

export const TIMESHEET_FINALIZE_KEYS: readonly string[] = [
  TIMESHEET_PERMISSIONS.FINALIZE,
  TIMESHEET_PERMISSIONS.FINALIZE_LEGACY
];
