
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, takeUntil } from 'rxjs';

import { AttendanceService } from '../../services/attendance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { OfficeIP } from '../../../../core/models/attendance.models';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-manage-office-ips',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatMenuModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './manage-office-ips-dialog.component.html',
  styleUrls: ['./manage-office-ips-dialog.component.scss']
})
export class ManageOfficeIPsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  officeIPs: OfficeIP[] = [];
  displayedColumns: string[] = ['ipAddressValue', 'name', 'actions'];

  ipForm: FormGroup;
  isEditing = false;
  editingIP: OfficeIP | null = null;

  isLoading = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private notification: NotificationService
    , private authService: AuthService
  ) {
    this.ipForm = this.fb.group({
      ipAddressValue: ['', [Validators.required, Validators.pattern(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/)]],
      name: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadOfficeIPs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOfficeIPs(): void {
    this.isLoading = true;
    this.attendanceService.getOfficeIPs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ips) => {
          this.officeIPs = ips;
          this.isLoading = false;
        },
        error: (error) => {
          const errorMessage = error?.error?.message || error?.message || 'Failed to load office IPs';
          this.notification.showError(errorMessage);
          this.isLoading = false;
        }
      });
  }

  onSubmit(): void {
    if (this.ipForm.valid) {
      this.isSubmitting = true;
      const formValue = this.ipForm.value;

      if (this.isEditing && this.editingIP) {
        this.attendanceService.updateOfficeIP(this.editingIP.id, formValue)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (updatedIP) => {
              this.notification.showSuccess('Office IP updated successfully');
              this.loadOfficeIPs();
              this.cancelEdit();
              this.isSubmitting = false;
            },
            error: (error) => {
              const errorMessage = error?.error?.message || error?.message || 'Failed to update office IP';
              this.notification.showError(errorMessage);
              this.isSubmitting = false;
            }
          });
      } else {
        this.attendanceService.createOfficeIP(formValue)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (newIP) => {
              this.notification.showSuccess('Office IP added successfully');
              this.loadOfficeIPs();
              this.ipForm.reset();
              this.isSubmitting = false;
            },
            error: (error) => {
              const errorMessage = error?.error?.message || error?.message || 'Failed to add office IP';
              this.notification.showError(errorMessage);
              this.isSubmitting = false;
            }
          });
      }
    } else {
      this.markFormGroupTouched(this.ipForm);
    }
  }

  editIP(ip: OfficeIP): void {
    this.isEditing = true;
    this.editingIP = { ...ip };
    this.ipForm.patchValue({
      ipAddressValue: ip.ipAddressValue,
      name: ip.name
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingIP = null;
    this.ipForm.reset();
  }

  deleteIP(ip: OfficeIP): void {
    this.attendanceService.deleteOfficeIP(ip.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notification.showSuccess('Office IP deleted successfully');
          this.loadOfficeIPs();
        },
        error: (error) => {
          const errorMessage =
            error?.error?.message ||
            error?.message ||
            'Failed to delete office IP';

          this.notification.showError(errorMessage);
        }
      });
  }

  getErrorMessage(fieldName: string): string {
    const field = this.ipForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${fieldName === 'ipAddress' ? 'IP Address' : fieldName} is required`;
    }
    if (field?.hasError('pattern')) {
      return 'Please enter a valid IP address (e.g., 192.168.1.1)';
    }
    return '';
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Settings', 'Manage Ips', actionKey);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
}
