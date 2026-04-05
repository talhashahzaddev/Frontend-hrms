# Attendance and Permission Impact Report

Date: 2026-04-06

## 1) Direct answer to your questions

### Q1. Were features changed other than timesheet?
Yes, but mostly inside timesheet workflows.

What was changed in Attendance module:
- Timesheet dashboard, timesheet detail dialog, approvals dashboard, employee review detail dialog.
- Timesheet APIs and backend service/repository logic for finalized calculation, late/overtime fields, request status handling, and snapshot loading.

Non-timesheet Attendance changes observed in backend contracts:
- UpdateTodayAttendanceLateStatusAsync now supports optional date input.
- UpdateOvertimeHoursAsync now supports optional date input.
- SyncPayrollCalculationsAsync was added to attendance repository interface.

These are attendance-related utility/sync changes, not a broad permission rewrite for all attendance screens.

### Q2. What changed in permissions implementation?
There are 2 permission implementation changes:

1. Backend permission handler behavior changed for multi-key checks
- File: HRMS.API/Authorization/PermissionAuthorizationHandler.cs
- Change: single-key checks are exact, but multi-key checks are now treated as OR (any key), case-insensitive.
- Why: supports safe permission key migration (legacy key or new key).

2. Frontend route and UI permission checks were strengthened for timesheet flows
- Route guard now reads route data.permissions.
- AuthService has new hasAnyActionPermission helper.
- Timesheet components now block UI actions if permission is missing.

### Q3. Is this permission implementation only timesheet-specific, or can other modules be affected?
Current direct impact is timesheet/attendance-approval flows.

Potential global effects:
- Backend handler change is global in principle, but it only changes behavior where an endpoint uses multiple permission keys.
- In current codebase, multi-key PermissionAuthorize is present only on timesheet finalize-batch endpoint.
- Frontend route-level permission checks only apply where routes define data.permissions.
- Current routes using data.permissions are only:
  - attendance/timesheet
  - attendance/approvals

So: other modules are not currently affected by route-level permission gating unless they adopt data.permissions, and are not affected by OR semantics unless they define multi-key PermissionAuthorize.

## 2) Exact permission changes found

### Backend (AttendanceController)
Updated to permission-based authorization in timesheet endpoints:
- timesheet/finalize-batch -> PermissionAuthorize(finalize_timesheet, timesheet_dashboard_finalize)
- timesheet/finalized-calculation/{timesheetId} -> PermissionAuthorize(timesheet_dashboard_view_details)
- request-update -> PermissionAuthorize(timesheet_view_details)
- process-request -> changed from role-based Authorize to PermissionAuthorize(approve_updated_timesheet)
- timesheet -> changed from role-based Authorize to PermissionAuthorize(timesheet_view_details)
- timesheet/dashboard-snapshots -> PermissionAuthorize(timesheet_dashboard_view_details)
- timesheet/submit-approvals -> changed from role-based Authorize to PermissionAuthorize(timesheet_view_details)
- timesheet/approve-all -> changed from role-based Authorize to PermissionAuthorize(approve_updated_timesheet)
- pending-requests -> PermissionAuthorize(timesheet_dashboard_view_details)
- timesheet/review-dashboard -> PermissionAuthorize(timesheet_dashboard_view_details)
- timesheet/org-progress -> PermissionAuthorize(timesheet_dashboard_view_details)

### Frontend
- auth.guard.ts: added route data.permissions validation through hasAnyActionPermission.
- auth.service.ts: added hasAnyActionPermission(actionKeys).
- attendance.routes.ts: added route permissions for timesheet and approvals pages.
- New constants file for timesheet permission keys:
  - timesheet_view_details
  - timesheet_dashboard_view_details
  - timesheet_create_new_snapshot
  - approve_updated_timesheet
  - finalize_timesheet
  - timesheet_dashboard_finalize (legacy fallback)
  - edit_or_override_attendace_recored

## 3) Scope and risk summary

### Definitely impacted now
- Attendance Timesheet page
- Attendance Approvals page
- Timesheet detail actions (submit, correction, override, finalize where applicable)
- Employee review detail actions (approve/reject/override/finalize)

### Not directly permission-impacted now
- Non-timesheet attendance endpoints that were not changed to new PermissionAuthorize keys in this diff.
- Other modules (Employee, Leave, Payroll) except normal existing permission behavior already in place.

### Important caution
If future endpoints add multiple PermissionAuthorize keys, backend will evaluate them as OR (any key). That is now the global behavior for multi-key attributes.
