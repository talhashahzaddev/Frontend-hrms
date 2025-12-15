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
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>work</mat-icon>
        Position Details
      </h2>
      <button mat-icon-button mat-dialog-close class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <div class="position-details">
        <div class="detail-section mb-4">
          <h3 class="text-xl font-semibold mb-2">Position Information</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <strong>Title:</strong> {{ data.position.positionTitle }}
            </div>
            <div>
              <strong>Department:</strong> {{ getDepartmentName(data.position.departmentId) }}
            </div>
            <div>
              <strong>Role:</strong> {{ getRoleName(data.position.roleId) }}
            </div>
            <div>
              <strong>Description:</strong> {{ data.position.description || 'N/A' }}
            </div>
          </div>
        </div>
      </div>
    </mat-dialog-content>

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
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
      max-width: 700px !important;
      width: 90vw !important;
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

    .dialog-header .close-button {
      color: white;
      transition: all 0.2s ease;
    }

    .dialog-content {
      padding: 28px !important;
      max-height: 70vh;
      overflow-y: auto;
    }

    .detail-section h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .grid div strong {
      color: #374151;
      font-weight: 600;
      margin-right: 8px;
    }

    .dialog-actions {
      padding: 20px 28px !important;
      display: flex;
      justify-content: flex-end;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border-top: 1px solid #e5e7eb;
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
