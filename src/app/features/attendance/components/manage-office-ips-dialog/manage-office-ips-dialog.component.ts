import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
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
import { OfficeIP } from '../../../../core/models/attendance.models';
import { EditOfficeIPDialogComponent } from './edit-ips-dialoguebox';

@Component({
  selector: 'app-manage-office-ips-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
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
export class ManageOfficeIPsDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  officeIPs: OfficeIP[] = [];
  displayedColumns: string[] = ['ipAddressValue', 'name', 'actions'];

  // Form
  ipForm: FormGroup;
  isEditing = false;
  editingIP: OfficeIP | null = null;

  // Loading states
  isLoading = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private notification: NotificationService,
    private dialogRef: MatDialogRef<ManageOfficeIPsDialogComponent>,
    private dialog: MatDialog,
    
    @Inject(MAT_DIALOG_DATA) public data: any
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
        // Update existing IP
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
        // Create new IP
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
  const dialogRef = this.dialog.open(EditOfficeIPDialogComponent, {
    width: '400px',
    data: ip
  });

  dialogRef.afterClosed().subscribe((updatedIP: OfficeIP | undefined) => {
    if (updatedIP) {
      // Hit your backend API to update the IP
      this.attendanceService.updateOfficeIP(updatedIP.id, updatedIP)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notification.showSuccess('Office IP updated successfully');
            this.loadOfficeIPs(); // reload table
          },
          error: (error) => {
            const errorMessage = error?.error?.message || error?.message || 'Failed to update office IP';
            this.notification.showError(errorMessage);
          }
        });
    }
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

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
