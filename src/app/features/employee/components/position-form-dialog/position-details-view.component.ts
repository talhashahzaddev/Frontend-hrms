import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Position, Department, Role } from '../../../../core/models/employee.models';

export interface ViewPositionData {
  position: Position;
  departments: Department[];
  roles: Role[];
}

@Component({
  selector: 'app-position-details-view',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
<div class="dialog-container">

  <!-- ── Header ─────────────────────────────────────────────── -->
  <div class="dialog-header">
    <div class="header-left">
      <div class="header-avatar">
        <mat-icon>work</mat-icon>
      </div>
      <div class="header-info">
        <h2 class="header-name">{{ data.position.positionTitle }}</h2>
        <p class="header-sub">{{ getDepartmentName(data.position.departmentId) }}</p>
      </div>
    </div>
  </div>

  <!-- ── Info Strip ─────────────────────────────────────────── -->
  <div class="info-strip">
    <div class="strip-item">
      <mat-icon>apartment</mat-icon>
      <span>{{ getDepartmentName(data.position.departmentId) }}</span>
    </div>
    <div class="strip-divider"></div>
    <div class="strip-item">
      <mat-icon>badge</mat-icon>
      <span>{{ getRoleName(data.position.roleId) }}</span>
    </div>
  </div>

  <!-- ── Scrollable Content ──────────────────────────────────── -->
  <mat-dialog-content>

    <!-- Position Information -->
    <div class="info-block">
      <div class="block-header">
        <div class="block-icon"><mat-icon>work</mat-icon></div>
        <span>Position Information</span>
      </div>
      <div class="block-grid">
        <div class="cell">
          <span class="cell-label">Position Title</span>
          <span class="cell-value">{{ data.position.positionTitle }}</span>
        </div>
        <div class="cell">
          <span class="cell-label">Department</span>
          <span class="cell-value">{{ getDepartmentName(data.position.departmentId) }}</span>
        </div>
        <div class="cell">
          <span class="cell-label">Role</span>
          <span class="cell-value">{{ getRoleName(data.position.roleId) }}</span>
        </div>
        <div class="cell cell-wide">
          <span class="cell-label">Description</span>
          <span class="cell-value">{{ data.position.description || '—' }}</span>
        </div>
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
  flex: 1;
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

.header-info { min-width: 0; }

.header-name {
  margin: 0 0 3px;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.2px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-sub {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  max-height: 58vh;
  overflow-y: auto;
  background: #f7f8fa;
}

mat-dialog-content::-webkit-scrollbar { width: 4px; }
mat-dialog-content::-webkit-scrollbar-track { background: transparent; }
mat-dialog-content::-webkit-scrollbar-thumb { background: #e0e2e8; border-radius: 4px; }

/* ── Info Block ──────────────────────────────────────────── */
.info-block {
  background: #ffffff;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #ebebeb;
  margin-bottom: 10px;
}

.block-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.1px;
  background: #ffffff;
}

.block-icon {
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: #111827;
  flex-shrink: 0;
}

.block-icon mat-icon {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
  overflow: hidden;
}

/* ── Block Grid ──────────────────────────────────────────── */
.block-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 14px 20px;
  border-bottom: 1px solid #f5f5f5;
  position: relative;
}

.cell:nth-child(odd) { border-right: 1px solid #f5f5f5; }
.cell:nth-last-child(-n+2) { border-bottom: none; }
.cell:last-child { border-bottom: none; }

.cell.cell-wide {
  grid-column: 1 / -1;
  border-right: none;
}

.cell.cell-wide:not(:last-child) { border-bottom: 1px solid #f5f5f5; }

.cell-label {
  font-size: 10.5px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  line-height: 1;
}

.cell-value {
  font-size: 13.5px;
  font-weight: 500;
  color: #111827;
  line-height: 1.4;
  word-break: break-word;
}

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

.btn-close mat-icon { font-size: 15px; width: 15px; height: 15px; }
.btn-close:hover { background: #f3f4f6 !important; border-color: #9ca3af !important; }

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 600px) {
  .dialog-header { padding: 16px 16px 14px; }

  .header-avatar { width: 44px; height: 44px; }
  .header-avatar mat-icon { font-size: 20px; width: 20px; height: 20px; }
  .header-name { font-size: 16px; }

  .info-strip { padding: 9px 16px; gap: 10px; }
  .strip-divider { display: none; }

  mat-dialog-content { padding: 12px !important; max-height: 60vh; }

  .info-block { border-radius: 9px; }

  .block-header { padding: 12px 16px; font-size: 12.5px; }

  .cell { padding: 11px 16px; }
  .cell-label { font-size: 10px; }
  .cell-value { font-size: 12.5px; }

  .dialog-footer { padding: 12px 16px; }
  .btn-close { width: 100% !important; justify-content: center; height: 40px !important; }
}
  `]
})
export class PositionDetailsViewComponent {
  constructor(
    public dialogRef: MatDialogRef<PositionDetailsViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ViewPositionData
  ) {}

  getDepartmentName(departmentId: string | undefined): string {
    const dept = this.data.departments.find(d => d.departmentId === departmentId);
    return dept ? dept.departmentName : 'No Department';
  }

  getRoleName(roleId: string | undefined): string {
    const role = this.data.roles.find(r => r.roleId === roleId);
    return role ? role.roleName : 'No Role';
  }
}