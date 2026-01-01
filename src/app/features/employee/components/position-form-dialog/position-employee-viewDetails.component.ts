import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface PositionEmployee {
  employeeId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  hireDate: string;
  positionTitle: string;
}

export interface PositionEmployeesViewData {
  positionId: string;
  positionTitle: string;
  departmentName?: string;
  roleName?: string;
  description?: string;
  employees: PositionEmployee[];
}

@Component({
  selector: 'app-position-employee-view',
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
      <mat-icon>people</mat-icon>
      Employees in {{ data.positionTitle }}
    </h2>
    <button mat-icon-button mat-dialog-close class="close-button">
      <mat-icon>close</mat-icon>
    </button>
  </div>

  <!-- Dialog Content -->
  <mat-dialog-content class="dialog-content">
    <!-- Position Info -->
    <div class="position-details">
      <div class="detail-section mb-4">
        <h3>Position Information</h3>
        <div class="grid">
          <div><strong>Title:</strong> {{ data.positionTitle }}</div>
          <div><strong>Department:</strong> {{ data.departmentName || 'N/A' }}</div>
          <div><strong>Role:</strong> {{ data.roleName || 'N/A' }}</div>
          <div><strong>Description:</strong> {{ data.description || 'N/A' }}</div>
        </div>
      </div>

      <!-- Employee Table -->
      <div class="detail-section">
        <h3>Employees</h3>

        <!-- Show spinner if loading and no employees yet -->
        <div *ngIf="isLoading" class="spinner-container">
          <mat-progress-spinner diameter="50" mode="indeterminate"></mat-progress-spinner>
        </div>

        <!-- Employee Table -->
        <table *ngIf="!isLoading" mat-table [dataSource]="employeesDataSource" class="mat-elevation-z8 w-full">

          <!-- Employee Code -->
          <ng-container matColumnDef="employeeCode">
            <th mat-header-cell *matHeaderCellDef>Code</th>
            <td mat-cell *matCellDef="let emp">{{ emp.employeeCode }}</td>
          </ng-container>

          <!-- Name -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let emp">{{ emp.firstName }} {{ emp.lastName }}</td>
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
            <td mat-cell *matCellDef="let emp">{{ emp.hireDate | date:'mediumDate' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <!-- No employees message -->
        <div *ngIf="!isLoading && employeesDataSource.data.length === 0" class="no-data">
          No employees found for this position.
        </div>
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
      max-width: 900px !important;
      width: 90vw !important;
      min-height: 400px; /* ensure dialog isn't too light */
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 28px;
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

    .dialog-header .close-button { color: white; }

    .dialog-content { padding: 28px !important; max-height: 70vh; overflow-y: auto; }

    .detail-section h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }

    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .grid div strong { color: #374151; font-weight: 600; margin-right: 8px; }

    table { width: 100%; margin-top: 16px; }
    th.mat-header-cell { font-weight: 600; color: #374151; }
    td.mat-cell { padding: 8px 16px; }

    .dialog-actions {
      padding: 20px 28px !important;
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
      .grid { grid-template-columns: 1fr !important; }
      ::ng-deep .mat-mdc-dialog-container { width: 95vw !important; max-width: 95vw !important; }
      .dialog-content { max-height: 80vh; }
    }
  `]
})
export class PositionEmployeeViewComponent {
  displayedColumns: string[] = ['employeeCode', 'name', 'email', 'status', 'hireDate'];
  employeesDataSource: MatTableDataSource<PositionEmployee>;
  isLoading = true;

  constructor(
    public dialogRef: MatDialogRef<PositionEmployeeViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PositionEmployeesViewData
  ) {
    this.employeesDataSource = new MatTableDataSource(data.employees || []);
    this.isLoading = data.employees?.length ? false : true;
  }
}
