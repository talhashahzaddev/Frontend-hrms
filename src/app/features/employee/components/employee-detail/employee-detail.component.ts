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
import { AuthService } from '../../../../core/services/auth.service';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-employee-detail',
  imports: [
    SharedCommonModule,
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
  templateUrl: './employee-detail.component.html',
  styleUrls: ['./employee-detail.component.scss']
})
export class EmployeeDetailComponent implements OnInit, OnDestroy {
  employee: Employee | null = null;
  isLoading = true;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService,
    private notificationService: NotificationService,
    private authService: AuthService
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

  hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Employee Management', 'All Employees', actionKey);
  }
}
