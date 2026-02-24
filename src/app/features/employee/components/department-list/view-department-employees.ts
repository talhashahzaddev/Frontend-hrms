import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface DepartmentEmployee {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  hireDate: string | null;
  position: string;
  reportingManagerName: string;
}

export interface DepartmentEmployeesViewData {
  departmentId: string;
  departmentName: string;
  employees: DepartmentEmployee[];
}

@Component({
  selector: 'app-department-employee-view',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  template: `
<div class="dialog-container">

  <!-- ── Header ─────────────────────────────────────────────── -->
  <div class="dialog-header">
    <div class="header-left">
      <div class="header-avatar">
        <mat-icon>groups</mat-icon>
      </div>
      <div class="header-info">
        <h2 class="header-name">{{ data.departmentName }}</h2>
        <p class="header-sub">Department Employees</p>
      </div>
    </div>
  </div>

  <!-- ── Info Strip ─────────────────────────────────────────── -->
  <div class="info-strip">
    <div class="strip-item">
      <mat-icon>apartment</mat-icon>
      <span>{{ data.departmentName }}</span>
    </div>
    <div class="strip-divider"></div>
    <div class="strip-item">
      <mat-icon>group</mat-icon>
      <span>{{ employeesDataSource.data.length }} {{ employeesDataSource.data.length === 1 ? 'Employee' : 'Employees' }}</span>
    </div>
  </div>

  <!-- ── Content ────────────────────────────────────────────── -->
  <mat-dialog-content>

    <!-- Spinner -->
    <div *ngIf="isLoading" class="spinner-wrap">
      <mat-progress-spinner diameter="36" mode="indeterminate"></mat-progress-spinner>
    </div>

    <!-- No Data -->
    <div *ngIf="!isLoading && employeesDataSource.data.length === 0" class="empty-state">
      <mat-icon>person_off</mat-icon>
      <p>No employees found in this department.</p>
    </div>

    <!-- Employee List -->
    <div *ngIf="!isLoading && employeesDataSource.data.length > 0" class="info-block">

      <!-- Table Header -->
      <div class="table-head">
        <span class="col-name">Name</span>
        <span class="col-email">Email</span>
        <span class="col-position">Position</span>
        <span class="col-manager">Manager</span>
        <span class="col-status">Status</span>
        <span class="col-date">Hire Date</span>
      </div>

      <!-- Rows -->
      <div class="table-row" *ngFor="let emp of employeesDataSource.data; let last = last" [class.last]="last">

        <!-- Name + Code -->
        <span class="col-name">
          <span class="emp-name">{{ emp.firstName }} {{ emp.lastName }}</span>
          <span class="emp-code">{{ emp.employeeCode }}</span>
        </span>

        <!-- Email -->
        <span class="col-email">
          <span class="cell-value">{{ emp.email }}</span>
        </span>

        <!-- Position -->
        <span class="col-position">
          <span class="cell-value">{{ emp.position || '—' }}</span>
        </span>

        <!-- Manager -->
        <span class="col-manager">
          <span class="cell-value">{{ emp.reportingManagerName.trim() || 'No Manager' }}</span>
        </span>

        <!-- Status -->
        <span class="col-status">
          <span class="status-pill"
            [class.pill-active]="emp.status === 'active'"
            [class.pill-inactive]="emp.status === 'inactive'"
            [class.pill-deleted]="emp.status === 'deleted'">
            <span class="pill-dot"></span>
            {{ emp.status | titlecase }}
          </span>
        </span>

        <!-- Hire Date -->
        <span class="col-date">
          <span class="cell-value">{{ emp.hireDate ? (emp.hireDate | date:'MMM d, y') : '—' }}</span>
        </span>

      </div>
    </div>

  </mat-dialog-content>

  <!-- ── Footer ─────────────────────────────────────────────── -->
  <div class="dialog-footer">
    <button mat-stroked-button mat-dialog-close class="btn-close">
      <mat-icon>close</mat-icon>
      Close
    </button>
  </div>

</div>
  `,
  styles: [`
.dialog-container {
  width: 100%;
  background: #f7f8fa;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: 'DM Sans', 'Segoe UI', sans-serif;
}

/* ── Header ──────────────────────────────────────────────── */
.dialog-header {
  display: flex;
  align-items: center;
  padding: 22px 28px 18px;
  background: #ffffff;
  border-bottom: 1px solid #ebebeb;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.header-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #f0eeff;
  border: 2px solid #e0e2e8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-avatar mat-icon {
  font-size: 24px;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-name {
  margin: 0 0 3px;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.2px;
  line-height: 1.2;
}

.header-sub {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

/* ── Info Strip ──────────────────────────────────────────── */
.info-strip {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 11px 28px;
  background: #ffffff;
  border-bottom: 1px solid #ebebeb;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.strip-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: #4b5563;
  font-weight: 500;
}

.strip-item mat-icon {
  font-size: 15px;
  width: 15px;
  height: 15px;
  color: #9ca3af;
}

.strip-divider {
  width: 1px;
  height: 13px;
  background: #e5e7eb;
  flex-shrink: 0;
}

/* ── Scrollable Body ─────────────────────────────────────── */
mat-dialog-content {
  padding: 16px !important;
  max-height: 62vh;
  overflow-y: auto;
  background: #f7f8fa;
}

mat-dialog-content::-webkit-scrollbar { width: 4px; }
mat-dialog-content::-webkit-scrollbar-track { background: transparent; }
mat-dialog-content::-webkit-scrollbar-thumb { background: #e0e2e8; border-radius: 4px; }

/* ── Spinner / Empty ─────────────────────────────────────── */
.spinner-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 120px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 20px;
  color: #9ca3af;
}

.empty-state mat-icon {
  font-size: 36px;
  width: 36px;
  height: 36px;
}

.empty-state p {
  margin: 0;
  font-size: 13.5px;
  font-weight: 500;
}

/* ── Employee List Block ─────────────────────────────────── */
.info-block {
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #ebebeb;
  overflow: hidden;
}

/* ── Table Head ──────────────────────────────────────────── */
.table-head {
  display: grid;
  grid-template-columns: 1.8fr 2.2fr 1.2fr 1.4fr 0.9fr 1fr;
  align-items: center;
  padding: 0 16px;
  height: 38px;
  background: #fafafa;
  border-bottom: 1px solid #ebebeb;
  gap: 12px;
}

.table-head span {
  font-size: 10.5px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Table Row ───────────────────────────────────────────── */
.table-row {
  display: grid;
  grid-template-columns: 1.8fr 2.2fr 1.2fr 1.4fr 0.9fr 1fr;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #f5f5f5;
  gap: 12px;
  transition: background 0.12s ease;
}

.table-row:hover { background: #fafafa; }
.table-row.last { border-bottom: none; }

/* ── Column Shared ───────────────────────────────────────── */
.col-avatar, .col-name, .col-email,
.col-position, .col-manager, .col-status, .col-date {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}

.col-name { flex-direction: column; align-items: flex-start; gap: 2px; }

/* ── Employee Avatar ─────────────────────────────────────── */
.emp-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #f0eeff;
  border: 1.5px solid #e0e2e8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 700;
  color: #6366f1;
  text-transform: uppercase;
  flex-shrink: 0;
  letter-spacing: 0.3px;
}

.emp-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.emp-code {
  font-size: 10.5px;
  font-weight: 500;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.cell-value {
  font-size: 12.5px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* ── Status Pills ────────────────────────────────────────── */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;
}

.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pill-active  { color: #166534; }
.pill-active .pill-dot  { background: #22c55e; }
.pill-inactive { color: #374151; }
.pill-inactive .pill-dot { background: #9ca3af; }
.pill-deleted  { color: #991b1b; }
.pill-deleted .pill-dot  { background: #ef4444; }

/* ── Footer ──────────────────────────────────────────────── */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 14px 20px;
  border-top: 1px solid #ebebeb;
  background: #ffffff;
  flex-shrink: 0;
}

.btn-close {
  height: 36px !important;
  padding: 0 20px !important;
  border-radius: 7px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  color: #374151 !important;
  border-color: #d1d5db !important;
  transition: all 0.15s ease !important;
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-close mat-icon {
  font-size: 15px;
  width: 15px;
  height: 15px;
}

.btn-close:hover {
  background: #f3f4f6 !important;
  border-color: #9ca3af !important;
}

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 600px) {

  .dialog-header { padding: 16px 16px 14px; }

  .header-avatar { width: 44px; height: 44px; }
  .header-avatar mat-icon { font-size: 20px; width: 20px; height: 20px; }
  .header-name { font-size: 16px; }

  .info-strip { padding: 9px 16px; gap: 10px; }
  .strip-divider { display: none; }

  mat-dialog-content { padding: 12px !important; max-height: 65vh; }

  /* Mobile: hide table head, stack each row as a mini-card */
  .table-head { display: none; }

  .table-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    padding: 12px 14px;
    border-bottom: 1px solid #f0f0f0;
  }

  .table-row.last { border-bottom: none; }

  .col-name {
    margin-bottom: 8px;
    width: 100%;
  }

  .col-email, .col-position, .col-manager, .col-date {
    width: 100%;
    margin-bottom: 3px;
  }

  .col-email::before   { content: 'Email: '; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 4px; }
  .col-position::before { content: 'Position: '; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 4px; }
  .col-manager::before  { content: 'Manager: '; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 4px; }
  .col-date::before     { content: 'Hired: '; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 4px; }

  .col-status {
    margin-top: 4px;
  }

  .dialog-footer { padding: 12px 14px; }
  .btn-close { width: 100% !important; justify-content: center; height: 40px !important; }
}
  `]
})
export class DepartmentEmployeeViewComponent {

  displayedColumns: string[] = [
    'employeeCode', 'name', 'email',
    'position', 'reportingManager', 'status', 'hireDate'
  ];

  employeesDataSource: MatTableDataSource<DepartmentEmployee>;
  isLoading = true;

  constructor(
    public dialogRef: MatDialogRef<DepartmentEmployeeViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DepartmentEmployeesViewData
  ) {
    this.employeesDataSource = new MatTableDataSource(data.employees || []);
    this.isLoading = false;
  }
}