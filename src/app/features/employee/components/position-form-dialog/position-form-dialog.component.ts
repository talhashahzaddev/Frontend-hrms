import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

import { Position, Department, Role, CreatePositionRequest, UpdatePositionRequest } from '../../../../core/models/employee.models';
import { EmployeeService } from '../../services/employee.service';

export interface PositionDialogData {
  mode: 'create' | 'edit';
  position?: Position;
  departments: Department[];
  roles: Role[];
}

@Component({
  selector: 'app-position-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './position-form-dialog.component.html',
  styleUrls: ['./position-form-dialog.component.scss']
})
export class PositionFormDialogComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  positionForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private dialogRef: MatDialogRef<PositionFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PositionDialogData
  ) {
    this.positionForm = this.createForm();
    
    if (data.mode === 'edit' && data.position) {
      this.populateForm(data.position);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      positionTitle: ['', [Validators.required, Validators.maxLength(100)]],
      departmentId: [''],
      roleId: ['', [Validators.required]], // Make role required
      description: ['', [Validators.maxLength(1000)]]
    });
  }

  private populateForm(position: Position): void {
    this.positionForm.patchValue({
      positionTitle: position.positionTitle,
      departmentId: position.departmentId || '',
      roleId: position.roleId || '',
      description: position.description || ''
    });
  }

  onSubmit(): void {
    if (this.positionForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.positionForm.value;

    if (this.data.mode === 'create') {
      this.createPosition(formValue);
    } else {
      this.updatePosition(formValue);
    }
  }

  private createPosition(formValue: any): void {
    const request: CreatePositionRequest = {
      positionTitle: formValue.positionTitle.trim(),
      departmentId: formValue.departmentId || undefined,
      roleId: formValue.roleId || undefined,
      description: formValue.description?.trim() || undefined
    };

    this.employeeService.createPosition(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (position) => {
          this.dialogRef.close(position);
        },
        error: (error) => {
          console.error('Error creating position:', error);
          this.isSubmitting = false;
          // TODO: Show error message to user
        }
      });
  }

  private updatePosition(formValue: any): void {
    if (!this.data.position) return;

    const request: UpdatePositionRequest = {
      positionTitle: formValue.positionTitle.trim(),
      departmentId: formValue.departmentId || undefined,
      roleId: formValue.roleId || undefined,
      description: formValue.description?.trim() || undefined
    };

    this.employeeService.updatePosition(this.data.position.positionId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (position) => {
          this.dialogRef.close(position);
        },
        error: (error) => {
          console.error('Error updating position:', error);
          this.isSubmitting = false;
          // TODO: Show error message to user
        }
      });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.positionForm.controls).forEach(key => {
      const control = this.positionForm.get(key);
      control?.markAsTouched();
    });
  }
}

