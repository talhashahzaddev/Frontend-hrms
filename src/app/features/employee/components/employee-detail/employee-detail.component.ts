import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';

import { EmployeeService } from '../../services/employee.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Employee } from '../../../../core/models/employee.models';

@Component({
  selector: 'app-employee-detail',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTooltipModule
  ],
  template: `
    <div class="employee-detail-container">
      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="60"></mat-spinner>
        <p>Loading employee details...</p>
      </div>

      <!-- Employee Details -->
      <div *ngIf="!isLoading && employee" class="employee-detail-content">
        
        <!-- Header Section -->
        <mat-card class="employee-header-card">
          <div class="employee-header">
            <div class="employee-avatar">
              <img *ngIf="employee.profilePictureUrl" 
                   [src]="employee.profilePictureUrl" 
                   [alt]="employee.firstName + ' ' + employee.lastName">
              <div *ngIf="!employee.profilePictureUrl" class="avatar-placeholder">
                <mat-icon>person</mat-icon>
              </div>
            </div>
            
            <div class="employee-info">
              <h1 class="employee-name">{{ employee.firstName }} {{ employee.lastName }}</h1>
              <p class="employee-title">{{ employee.position?.positionTitle }}</p>
              <p class="employee-department">{{ employee.department?.departmentName }}</p>
              <div class="employee-status">
                <mat-chip [color]="getStatusColor(employee.status)">
                  {{ employee.status | titlecase }}
                </mat-chip>
              </div>
            </div>

            <div class="header-actions">
              <button mat-icon-button [matMenuTriggerFor]="menu" matTooltip="More actions">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="editEmployee()">
                  <mat-icon>edit</mat-icon>
                  <span>Edit Employee</span>
                </button>
                <button mat-menu-item (click)="activateEmployee()" *ngIf="employee.status !== 'active'">
                  <mat-icon>check_circle</mat-icon>
                  <span>Activate</span>
                </button>
                <button mat-menu-item (click)="deactivateEmployee()" *ngIf="employee.status === 'active'">
                  <mat-icon>block</mat-icon>
                  <span>Deactivate</span>
                </button>
                <mat-divider></mat-divider>
                <button mat-menu-item (click)="deleteEmployee()" class="delete-action">
                  <mat-icon>delete</mat-icon>
                  <span>Delete Employee</span>
                </button>
              </mat-menu>
            </div>
          </div>
        </mat-card>

        <!-- Detailed Information Tabs -->
        <mat-card class="employee-tabs-card">
          <mat-tab-group>
            
            <!-- Personal Information Tab -->
            <mat-tab label="Personal Information">
              <div class="tab-content">
                <div class="info-grid">
                  <div class="info-item">
                    <label>Employee Code</label>
                    <span>{{ employee.employeeCode }}</span>
                  </div>
                  <div class="info-item">
                    <label>Email</label>
                    <span>{{ employee.email }}</span>
                  </div>
                  <div class="info-item">
                    <label>Phone</label>
                    <span>{{ employee.phone || 'Not provided' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Date of Birth</label>
                    <span>{{ (employee.dateOfBirth | date:'mediumDate') || 'Not provided' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Gender</label>
                    <span>{{ employee.gender || 'Not specified' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Marital Status</label>
                    <span>{{ employee.maritalStatus || 'Not specified' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Nationality</label>
                    <span>{{ employee.nationality || 'Not specified' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Hire Date</label>
                    <span>{{ employee.hireDate | date:'mediumDate' }}</span>
                  </div>
                </div>

                <!-- Address Information -->
                <div *ngIf="employee.address" class="address-section">
                  <h3>Address</h3>
                  <div class="address-details">
                    <p>{{ employee.address.street }}</p>
                    <p>{{ employee.address.city }}, {{ employee.address.state }} {{ employee.address.zip }}</p>
                  </div>
                </div>

                <!-- Emergency Contact -->
                <div *ngIf="employee.emergencyContact" class="emergency-contact-section">
                  <h3>Emergency Contact</h3>
                  <div class="info-grid">
                    <div class="info-item">
                      <label>Name</label>
                      <span>{{ employee.emergencyContact.name || 'Not provided' }}</span>
                    </div>
                    <div class="info-item">
                      <label>Phone</label>
                      <span>{{ employee.emergencyContact.phone || 'Not provided' }}</span>
                    </div>
                    <div class="info-item">
                      <label>Relationship</label>
                      <span>{{ employee.emergencyContact.relationship || 'Not specified' }}</span>
                    </div>
                    <div class="info-item">
                      <label>Email</label>
                      <span>{{ employee.emergencyContact.email || 'Not provided' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- Employment Details Tab -->
            <mat-tab label="Employment Details">
              <div class="tab-content">
                <div class="info-grid">
                  <div class="info-item">
                    <label>Department</label>
                    <span>{{ employee.department?.departmentName || 'Not assigned' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Position</label>
                    <span>{{ employee.position?.positionTitle || 'Not assigned' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Employment Type</label>
                    <span>{{ (employee.employmentDetails?.employmentType | titlecase) || 'Not specified' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Basic Salary</label>
                    <span>{{ (employee.employmentDetails?.baseSalary | currency) || 'Not specified' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Reporting Manager</label>
                    <span>{{ employee.manager ? (employee.manager.firstName + ' ' + employee.manager.lastName) : 'No manager assigned' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Work Location</label>
                    <span>{{ employee.employmentDetails?.workLocation || 'Not specified' }}</span>
                  </div>
                  <div class="info-item">
                    <label>Employee Status</label>
                    <mat-chip [color]="getStatusColor(employee.status)">
                      {{ employee.status | titlecase }}
                    </mat-chip>
                  </div>
                  <div class="info-item">
                    <label>Hire Date</label>
                    <span>{{ employee.hireDate | date:'mediumDate' }}</span>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- Documents Tab -->
            <mat-tab label="Documents">
              <div class="tab-content">
                <div class="documents-section">
                  <div class="section-header">
                    <h3>Employee Documents</h3>
                    <button mat-raised-button color="primary">
                      <mat-icon>upload</mat-icon>
                      Upload Document
                    </button>
                  </div>
                  <div class="documents-list">
                    <p class="empty-state">No documents uploaded yet</p>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- Performance Tab -->
            <mat-tab label="Performance">
              <div class="tab-content">
                <div class="performance-section">
                  <h3>Performance Overview</h3>
                  <p class="empty-state">Performance data will be displayed here</p>
                </div>
              </div>
            </mat-tab>

          </mat-tab-group>
        </mat-card>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <button mat-raised-button color="primary" (click)="editEmployee()">
            <mat-icon>edit</mat-icon>
            Edit Employee
          </button>
          <button mat-stroked-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Back to List
          </button>
        </div>

      </div>

      <!-- Error State -->
      <div *ngIf="!isLoading && !employee" class="error-container">
        <mat-card class="error-card">
          <mat-card-content>
            <mat-icon class="error-icon">error_outline</mat-icon>
            <h2>Employee Not Found</h2>
            <p>The employee you're looking for doesn't exist or has been removed.</p>
            <button mat-raised-button color="primary" (click)="goBack()">
              <mat-icon>arrow_back</mat-icon>
              Back to Employees
            </button>
          </mat-card-content>
        </mat-card>
      </div>

    </div>
  `,
  styles: [`
    .employee-detail-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      color: #6b7280;

      mat-spinner {
        margin-bottom: 16px;
      }
    }

    .employee-header-card {
      margin-bottom: 24px;
      border-radius: 12px;
      overflow: hidden;
    }

    .employee-header {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .employee-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      overflow: hidden;
      border: 4px solid rgba(255, 255, 255, 0.2);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-placeholder {
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 3rem;
          width: 3rem;
          height: 3rem;
          color: white;
        }
      }
    }

    .employee-info {
      flex: 1;

      .employee-name {
        font-size: 2rem;
        font-weight: 700;
        margin: 0 0 8px 0;
        letter-spacing: -0.025em;
      }

      .employee-title {
        font-size: 1.25rem;
        font-weight: 500;
        margin: 0 0 4px 0;
        opacity: 0.9;
      }

      .employee-department {
        font-size: 1rem;
        margin: 0 0 16px 0;
        opacity: 0.8;
      }

      .employee-status {
        mat-chip {
          font-weight: 600;
        }
      }
    }

    .header-actions {
      button {
        color: white;
      }
    }

    .employee-tabs-card {
      border-radius: 12px;
      margin-bottom: 24px;
    }

    .tab-content {
      padding: 24px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .info-item {
      label {
        display: block;
        font-weight: 600;
        color: #374151;
        margin-bottom: 4px;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      span {
        display: block;
        color: #1f2937;
        font-size: 1rem;
        padding: 8px 0;
      }
    }

    .address-section, .emergency-contact-section {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;

      h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 16px;
      }
    }

    .address-details p {
      margin: 4px 0;
      color: #6b7280;
    }

    .documents-section, .performance-section {
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;

        h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
        }
      }

      .empty-state {
        text-align: center;
        color: #6b7280;
        font-style: italic;
        padding: 48px;
      }
    }

    .quick-actions {
      display: flex;
      gap: 16px;
      justify-content: center;

      button {
        min-width: 160px;
        height: 48px;
        font-weight: 600;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .error-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
    }

    .error-card {
      text-align: center;
      padding: 48px;
      border-radius: 12px;

      .error-icon {
        font-size: 4rem;
        width: 4rem;
        height: 4rem;
        color: #ef4444;
        margin-bottom: 16px;
      }

      h2 {
        color: #374151;
        margin-bottom: 8px;
      }

      p {
        color: #6b7280;
        margin-bottom: 24px;
      }
    }

    .delete-action {
      color: #ef4444 !important;
    }

    @media (max-width: 768px) {
      .employee-detail-container {
        padding: 16px;
      }

      .employee-header {
        flex-direction: column;
        text-align: center;
        gap: 16px;
        padding: 24px;
      }

      .info-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .quick-actions {
        flex-direction: column;

        button {
          width: 100%;
        }
      }
    }
  `]
})
export class EmployeeDetailComponent implements OnInit, OnDestroy {
  employee: Employee | null = null;
  isLoading = true;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    const employeeId = this.route.snapshot.paramMap.get('id');
    if (employeeId) {
      this.loadEmployee(employeeId);
    } else {
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadEmployee(employeeId: string): void {
    this.employeeService.getEmployee(employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employee) => {
          this.employee = employee;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading employee:', error);
          this.notificationService.showError('Failed to load employee details');
          this.isLoading = false;
        }
      });
  }

  editEmployee(): void {
    if (this.employee) {
      this.router.navigate(['/employees', this.employee.employeeId, 'edit']);
    }
  }

  activateEmployee(): void {
    if (this.employee) {
      this.employeeService.activateEmployee(this.employee.employeeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedEmployee) => {
            this.employee = updatedEmployee;
            this.notificationService.showSuccess('Employee activated successfully');
          },
          error: (error) => {
            console.error('Error activating employee:', error);
            this.notificationService.showError('Failed to activate employee');
          }
        });
    }
  }

  deactivateEmployee(): void {
    if (this.employee) {
      this.employeeService.deactivateEmployee(this.employee.employeeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedEmployee) => {
            this.employee = updatedEmployee;
            this.notificationService.showSuccess('Employee deactivated successfully');
          },
          error: (error) => {
            console.error('Error deactivating employee:', error);
            this.notificationService.showError('Failed to deactivate employee');
          }
        });
    }
  }

  deleteEmployee(): void {
    if (this.employee && confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      this.employeeService.deleteEmployee(this.employee.employeeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Employee deleted successfully');
            this.router.navigate(['/employees']);
          },
          error: (error) => {
            console.error('Error deleting employee:', error);
            this.notificationService.showError('Failed to delete employee');
          }
        });
    }
  }

  goBack(): void {
    this.router.navigate(['/employees']);
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'primary';
      case 'inactive':
        return 'warn';
      default:
        return 'accent';
    }
  }
}
