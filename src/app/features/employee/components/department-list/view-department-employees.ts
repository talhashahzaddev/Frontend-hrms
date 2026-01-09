import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/* =======================
   Backend-aligned Employee
   ======================= */
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

/* =======================
   Dialog Data (UI-only)
   ======================= */
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
  <!-- Dialog Header -->
  <div class="dialog-header">
    <h2 mat-dialog-title>
      <mat-icon>groups</mat-icon>
      Employees in {{ data.departmentName }}
    </h2>
    <button mat-icon-button mat-dialog-close class="close-button">
      <mat-icon>close</mat-icon>
    </button>
  </div>

  <!-- Dialog Content -->
  <mat-dialog-content class="dialog-content">

    <!-- Department Info -->
    <div class="detail-section mb-4">
      <h3>Department Information</h3>
      <div class="grid">
        <div><strong>Name:</strong> {{ data.departmentName }}</div>
        <div><strong>Total Employees:</strong> {{ employeesDataSource.data.length }}</div>
      </div>
    </div>

    <!-- Employees -->
    <div class="detail-section">
      <h3>Employees</h3>

      <!-- Spinner -->
      <div *ngIf="isLoading" class="spinner-container">
        <mat-progress-spinner diameter="50" mode="indeterminate"></mat-progress-spinner>
      </div>

      <!-- Employee Table Container with Horizontal Scroll -->
      <div class="table-wrapper">
        <table
          *ngIf="!isLoading"
          mat-table
          [dataSource]="employeesDataSource"
          class="mat-elevation-z8 w-full">

        <!-- Employee Code -->
        <ng-container matColumnDef="employeeCode">
          <th mat-header-cell *matHeaderCellDef>Code</th>
          <td mat-cell *matCellDef="let emp">{{ emp.employeeCode }}</td>
        </ng-container>

        <!-- Name -->
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let emp">
            {{ emp.firstName }} {{ emp.lastName }}
          </td>
        </ng-container>

        <!-- Email -->
        <ng-container matColumnDef="email">
          <th mat-header-cell *matHeaderCellDef>Email</th>
          <td mat-cell *matCellDef="let emp">{{ emp.email }}</td>
        </ng-container>

        <!-- Status -->
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let emp">{{ emp.status }}</td>
        </ng-container>

        <!-- Hire Date -->
        <ng-container matColumnDef="hireDate">
          <th mat-header-cell *matHeaderCellDef>Hire Date</th>
          <td mat-cell *matCellDef="let emp">
            {{ emp.hireDate | date:'mediumDate' }}
          </td>
        </ng-container>

        <!-- Position -->
        <ng-container matColumnDef="position">
          <th mat-header-cell *matHeaderCellDef>Position</th>
          <td mat-cell *matCellDef="let emp">{{ emp.position }}</td>
        </ng-container>

        <!-- Reporting Manager -->
        <ng-container matColumnDef="reportingManager">
          <th mat-header-cell *matHeaderCellDef>Reporting Manager</th>
          <td mat-cell *matCellDef="let emp">{{ emp.reportingManagerName?.trim() || 'No Manager' }}</td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>

      <!-- No Data -->
      <div
        *ngIf="!isLoading && employeesDataSource.data.length === 0"
        class="no-data">
        No employees found for this department.
      </div>
    </div>
  </mat-dialog-content>

  <!-- Dialog Actions -->
  <div class="dialog-actions">
    <button mat-stroked-button mat-dialog-close>
      <mat-icon>close</mat-icon>
      Close
    </button>
  </div>
  `,
  styles: [`
    ::ng-deep .mat-mdc-dialog-container {
      border-radius: 16px !important;
      padding: 0 !important;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12) !important;
      max-width: 1600px !important;
      width: 95vw !important;
      min-height: 500px;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .dialog-header h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 22px;
      font-weight: 700;
    }

    .dialog-header .close-button {
      color: white;
    }

    .dialog-content {
      padding: 32px !important;
      max-height: 75vh;
      overflow-y: auto;
    }

    .detail-section {
      margin-bottom: 24px;
    }

    .detail-section h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
      color: #1f2937;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 8px;
    }

    .grid div {
      font-size: 15px;
      padding: 8px 0;
    }

    .grid div strong {
      color: #374151;
      font-weight: 600;
      margin-right: 8px;
    }

    .table-wrapper {
      overflow-x: auto;
      margin-top: 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      background: white;
      max-width: 100%;
    }

    .table-wrapper::-webkit-scrollbar {
      height: 10px;
    }

    .table-wrapper::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 5px;
      margin: 0 12px;
    }

    .table-wrapper::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 5px;
    }

    .table-wrapper::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    table {
      width: 100%;
      min-width: 1200px;
      border-collapse: separate;
      border-spacing: 0;
    }

    ::ng-deep .mat-mdc-table {
      background: white !important;
    }

    ::ng-deep th.mat-mdc-header-cell {
      font-weight: 700 !important;
      color: #1f2937 !important;
      font-size: 14px !important;
      padding: 18px 24px !important;
      background-color: #f9fafb !important;
      white-space: nowrap !important;
      border-bottom: 2px solid #e5e7eb !important;
    }

    ::ng-deep td.mat-mdc-cell {
      padding: 18px 24px !important;
      font-size: 14px !important;
      color: #374151 !important;
      border-bottom: 1px solid #f3f4f6 !important;
    }

    ::ng-deep tr.mat-mdc-row {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      cursor: pointer !important;
    }

    ::ng-deep tr.mat-mdc-row:hover {
      background-color: rgba(102, 126, 234, 0.08) !important;
      transform: scale(1.01) !important;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15) !important;
    }

    ::ng-deep tr.mat-mdc-row:hover td.mat-mdc-cell {
      color: #1f2937 !important;
      font-weight: 500 !important;
    }

    .dialog-actions {
      padding: 20px 32px !important;
      display: flex;
      justify-content: flex-end;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border-top: 1px solid #e5e7eb;
    }

    .spinner-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 150px;
    }

    .no-data {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-style: italic;
    }

    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr !important;
      }

      ::ng-deep .mat-mdc-dialog-container {
        width: 95vw !important;
        max-width: 95vw !important;
      }

      .dialog-content {
        max-height: 80vh;
      }
    }
  `]
})
export class DepartmentEmployeeViewComponent {

  displayedColumns: string[] = [
    'employeeCode',
    'name',
    'email',
    'position',
    'reportingManager',
    'status',
    'hireDate'
  ];

  employeesDataSource: MatTableDataSource<DepartmentEmployee>;
  isLoading = true;

  constructor(
    public dialogRef: MatDialogRef<DepartmentEmployeeViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DepartmentEmployeesViewData
  ) {
    this.employeesDataSource = new MatTableDataSource(data.employees || []);
    this.isLoading = data.employees?.length ? false : true;
  }
}
