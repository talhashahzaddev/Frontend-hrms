# Timesheet Refinement Plan (Permission-First, Payroll-Ready)

## 1. Goal
Build a clean, predictable, permission-first timesheet flow where:
- one data contract drives UI, approvals, finalization, and payroll
- permissions (not role names) are the single access model
- payroll derives from finalized effective attendance values
- managers and employees see only scoped data

## 2. Current Findings Summary

### 2.1 Authorization is mixed (permissions + roles)
- Some attendance endpoints use permission attributes.
- Other attendance endpoints in the same flow still use role-based attributes.
- Payroll endpoints are role-based.
- Some frontend routes and many components still use role checks.

Result: access behavior can drift between UI and API, and migration to permissions remains incomplete.

### 2.2 Timesheet API surface is duplicated in frontend service
The attendance frontend service currently has multiple wrappers for the same endpoint families (submit/finalize/override), with different return-shape assumptions.

Result: hard to reason about behavior and easy to regress.

### 2.3 DTO and naming normalization is doing too much in UI layer
The frontend service performs heavy snake/camel/Pascal fallback mapping for records.

Result: backend contract instability is hidden and defects become harder to catch.

### 2.4 Manager data-scope controls need hardening
A global-view bypass path exists in manager review flow.

Result: high-risk data exposure path if not corrected.

### 2.5 Payroll is not yet a strict consumer of timesheet finalization output
Overtime and attendance summary flows still support manual entry patterns and are not fully anchored to finalized effective attendance records.

Result: payroll consistency can diverge from finalized timesheet reality.

## 3. Desired End-to-End Canonical Flow

1) Attendance capture:
- clock in/out, shift assignment, manual corrections

2) Correction lifecycle:
- draft -> pending -> approved/rejected

3) Manager override:
- allowed only before employee package is fully finalized
- creates effective values for the day

4) Finalization:
- employee package or monthly batch finalization
- frozen effective values per day for payroll consumption

5) Payroll generation:
- late and overtime entries derived from finalized effective values
- attendance summary derived from finalized totals
- manual payroll adjustments handled as explicit adjustments, not primary source

## 4. Permission-First Access Model

## 4.1 Build one canonical permission matrix
Create a single source of truth (action key matrix) for:
- route access
- page-level visibility
- action-level buttons
- API endpoint authorization

Start with timesheet + payroll actions:
- timesheet_view
- timesheet_create_snapshot
- timesheet_submit_for_review
- timesheet_approve_requests
- timesheet_override_record
- timesheet_finalize
- payroll_view
- payroll_manage_periods
- payroll_manage_overtime_rules
- payroll_manage_overtime_entries
- payroll_generate_from_timesheet

Note: keep temporary backward-compatible aliases for existing keys with typos or legacy naming until migration completes.

## 4.2 Frontend migration
- Add a PermissionGuard using route data permissions array.
- Replace route role data usage with permissions.
- Replace direct hasRole/hasAnyRole checks in timesheet/payroll screens with permission checks.
- Keep role checks only where they are business concepts, not access control.

## 4.3 Backend migration
- Convert timesheet and payroll endpoints to permission attributes.
- Remove role-only authorization from those endpoint groups after parity checks.
- Ensure manager scope restrictions are enforced server-side independent of UI.

## 5. Timesheet Contract Simplification

## 5.1 Define one strict response contract per endpoint
For each key endpoint, freeze the schema and naming style (camelCase only).

Key endpoints:
- GET timesheet list
- GET timesheet details
- GET manager review dashboard
- POST submit approvals
- POST approve all
- POST override
- POST finalize

## 5.2 Frontend service cleanup
In attendance service:
- keep one method per endpoint family
- remove duplicate wrappers for submit/finalize/override
- move record-shape conversion to dedicated mappers (single mapper module)

## 5.3 Contract validation
- Add runtime schema validation for timesheet responses (lightweight guard)
- Fail fast in dev if shape drifts

## 6. Payroll Integration Refinement

## 6.1 Define payroll source of truth
Payroll should read from finalized effective attendance records only.
Fallback to raw attendance only for periods not finalized yet (if business-approved).

## 6.2 Trigger points
Ensure payroll sync runs on:
- approved correction request
- manager override
- manual attendance update
- finalize employee package
- finalize monthly batch

Implementation note:
- if sync is intentionally deferred until finalization, enforce that policy consistently and remove partial sync paths.

## 6.3 Remove manual-first dependency for core attendance payroll tables
- attendance summary and overtime entries should be generated from finalized records
- manual payroll entry remains as adjustment layer with explicit reason/audit fields

## 6.4 Reconciliation endpoint
Add a payroll reconciliation endpoint/report for period-level checks:
- finalized hours vs overtime entries
- finalized late hours vs late attendance rows
- missing employee-period payroll rows

## 7. Security and Scope Hardening

1. Re-enable and enforce authorization on all timesheet review/progress endpoints.
2. Remove any hardcoded global-view bypass.
3. Ensure manager-only queries are filtered by reporting hierarchy in repository layer.
4. Ensure all userId-based permission fetches validate organization ownership.

## 8. Delivery Plan (Phased)

## Phase 0: Safety + Access (High priority)
- patch missing auth/permission on exposed timesheet endpoints
- remove global-view bypass
- publish canonical timesheet permission matrix

Acceptance:
- unauthorized users cannot call review/progress APIs
- manager sees only scoped employees

## Phase 1: Frontend cleanup (High priority)
- replace duplicate timesheet API wrappers with canonical methods
- extract mapper layer
- add PermissionGuard and convert timesheet routes

Acceptance:
- one method per timesheet endpoint family
- zero role checks in timesheet screens for access control

## Phase 2: Backend authorization alignment (High priority)
- convert timesheet + payroll endpoints to permission attributes
- keep temporary role fallback only if required for rollout window

Acceptance:
- permission matrix matches endpoint attributes one-to-one

## Phase 3: Payroll derivation from finalized data (High priority)
- wire and verify sync triggers
- generate attendance summary/overtime from finalized records
- keep manual adjustments separate

Acceptance:
- payroll period totals match finalized timesheet outputs

## Phase 4: Observability + tests (Medium priority)
- add integration tests for full flow
- add reconciliation report
- add permission matrix drift tests (UI + API)

Acceptance:
- automated tests cover submit, approve, override, finalize, payroll generation

## 9. Test Matrix (Minimum)

1. Employee submits draft corrections; manager approves; employee package finalizes.
2. Manager override before finalization reflects in details, review dashboard, and finalized outputs.
3. Rejected request history remains visible without incorrectly marking pending.
4. Finalized period is immutable for employee edits; override rules follow policy.
5. Payroll overtime and late values match finalized effective values for same dates.
6. Permission denial tests for each sensitive timesheet/payroll action.

## 10. Suggested Immediate Next Sprint Scope

Week 1 scope:
- Phase 0 completely
- Phase 1 for attendance timesheet pages and service methods only
- start Phase 2 for attendance endpoints only

Week 2 scope:
- complete payroll permission migration
- implement finalized-to-payroll generation path
- add reconciliation checks and e2e tests
