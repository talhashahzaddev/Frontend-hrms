import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Department, Employee } from '../../../../core/models/employee.models';

export interface ViewDepartmentDetailsData {
  department: Department;
  managers: Employee[];
}

@Component({
  selector: 'app-view-department-details',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>apartment</mat-icon>
        Department Details
      </h2>
      <button mat-icon-button mat-dialog-close class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <div class="department-details">
        <div class="detail-section mb-4">
          <h3 class="text-xl font-semibold mb-2">Department Information</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <strong>Name:</strong> {{ data.department.departmentName }}
            </div>
            <div>
              <strong>Description:</strong> {{ data.department.description || 'N/A' }}
            </div>
            <div>
              <strong>Manager:</strong>
              <span *ngIf="data.department.managerId">
                {{ getManagerName(data.department.managerId) }}
              </span>
              <span *ngIf="!data.department.managerId">No Manager</span>
            </div>
            <div>
              <strong>Status:</strong>
              {{ data.department.isActive ? 'Active' : 'Inactive' }}
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

      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        font-size: 22px;
        font-weight: 700;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }
      }

      .close-button {
        color: white;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: rotate(90deg);
        }
      }
    }

    .dialog-content {
      padding: 28px !important;
      max-height: 70vh;
      overflow-y: auto;
    }

    .department-details {
      .detail-section {
        margin-bottom: 24px;

        h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 16px 0;
          padding-bottom: 12px;
          border-bottom: 2px solid #e5e7eb;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;

          div {
            strong {
              color: #374151;
              font-weight: 600;
              margin-right: 8px;
            }
          }
        }
      }
    }

    .dialog-actions {
      padding: 20px 28px !important;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 12px;

      button {
        height: 44px;
        padding: 0 28px !important;
        border-radius: 12px !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        text-transform: none !important;
        display: flex;
        align-items: center;
        gap: 8px;

        &[mat-stroked-button] {
          background: white !important;
          color: #6b7280 !important;
          border: 2px solid #e5e7eb !important;

          &:hover:not([disabled]) {
            background: #f9fafb !important;
            border-color: #cbd5e1 !important;
            color: #374151 !important;
          }
        }
      }
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewDepartmentDetailsComponent {

  constructor(
    private dialogRef: MatDialogRef<ViewDepartmentDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ViewDepartmentDetailsData
  ) {}

  getManagerName(managerId: string): string {
    const manager = this.data.managers.find(m => m.employeeId === managerId);
    return manager ? `${manager.fullName} - ${manager.email}` : 'Unknown Manager';
  }
}
