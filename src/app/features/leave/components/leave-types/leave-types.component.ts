import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { LeaveService } from '../../services/leave.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LeaveType } from '../../../../core/models/leave.models';
import { LEAVE_COLOR_TOKEN, ColorOption } from '../../constants/leave-colors';

@Component({
  selector: 'app-leave-types',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule
  ],
  templateUrl: './leave-types.component.html',
  styleUrls: ['./leave-types.component.scss']
})
export class LeaveTypesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  leaveTypes: LeaveType[] = [];
  isLoading = false;

  constructor(
    private leaveService: LeaveService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadLeaveTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLeaveTypes(): void {
    this.isLoading = true;
    this.leaveService.getLeaveTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => {
          this.leaveTypes = types;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading leave types:', error);
          const errorMessage = error?.error?.message || error?.message || 'Failed to load leave types';
          this.notificationService.showError(errorMessage);
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  addLeaveType(): void {
    const dialogRef = this.dialog.open(AddLeaveTypeDialogTemplate, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) {
        this.leaveService.createCustomLeaveType(result)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Leave type created successfully');
              this.loadLeaveTypes();
            },
            error: (error) => {
              console.error(error);
              const errorMessage = error?.error?.message || error?.message || 'Failed to create leave type';
              this.notificationService.showError(errorMessage);
            }
          });
      }
    });
  }

  editLeaveType(type: LeaveType): void {
    const dialogRef = this.dialog.open(EditLeaveTypeDialogTemplate, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true,
      data: { leaveType: type }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) {
        this.leaveService.updateLeaveType(type.leaveTypeId, result)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.notificationService.showSuccess('Leave type updated successfully');
              this.loadLeaveTypes();
            },
            error: (error) => {
              console.error(error);
              const errorMessage = error?.error?.message || error?.message || 'Failed to update leave type';
              this.notificationService.showError(errorMessage);
            }
          });
      }
    });
  }

  deleteLeaveType(type: LeaveType): void {
    if (confirm(`Are you sure you want to delete "${type.typeName}" leave type?`)) {
      this.notificationService.showWarning('Delete functionality will be implemented');
    }
  }

  getCardColorClass(index: number): string {
    const colors = ['primary', 'success', 'warning', 'info', 'employee'];
    return colors[index % colors.length];
  }
}

/* ------------------------------------------------------------------
   Inline Dialog Component for Adding Leave Type
------------------------------------------------------------------- */
@Component({
  selector: 'add-leave-type-dialog-template',
  standalone: true,
  templateUrl: './add-leave-type-dialog.html',
  styleUrls: ['./leave-types-dialog.scss'],
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    CommonModule
  ]
})
export class AddLeaveTypeDialogTemplate {
  isSubmitting = false;

  readonly colors: ColorOption[] = inject(LEAVE_COLOR_TOKEN);

  // default to the first color in the shared palette
  private readonly defaultColor = this.colors?.[0]?.value ?? '#2196f3';

  readonly form = inject(FormBuilder).group({
    typeName: ['', Validators.required],
    description: [''],
    maxDaysPerYear: [15, [Validators.required, Validators.min(1)]],
    isPaid: [true],
    carryForwardAllowed: [false],
    maxCarryForwardDays: [1, [Validators.min(1)]],
    requiresApproval: [true],
    color: [this.defaultColor, Validators.required],
    isActive: [true]
  });

  private dialogRef = inject(MatDialogRef<AddLeaveTypeDialogTemplate>);

  constructor() {
    // Subscribe to carryForwardAllowed changes
    this.form.get('carryForwardAllowed')?.valueChanges.subscribe(isAllowed => {
      const maxCarryForwardControl = this.form.get('maxCarryForwardDays');
      if (isAllowed) {
        maxCarryForwardControl?.setValidators([Validators.required, Validators.min(0)]);
        maxCarryForwardControl?.updateValueAndValidity();
      } else {
        maxCarryForwardControl?.clearValidators();
        maxCarryForwardControl?.setValue(0);
        maxCarryForwardControl?.updateValueAndValidity();
      }
    });

    // Subscribe to maxDaysPerYear changes to validate maxCarryForwardDays
    this.form.get('maxDaysPerYear')?.valueChanges.subscribe(maxDays => {
      const maxCarryForwardControl = this.form.get('maxCarryForwardDays');
      const currentValue = maxCarryForwardControl?.value;

      if (currentValue && maxDays && currentValue > maxDays) {
        maxCarryForwardControl?.setErrors({ 'max': true });
      }
    });

    // Add validation when maxCarryForwardDays changes
    this.form.get('maxCarryForwardDays')?.valueChanges.subscribe(carryForwardDays => {
      const maxDaysPerYear = this.form.get('maxDaysPerYear')?.value;
      const maxCarryForwardControl = this.form.get('maxCarryForwardDays');

      if (carryForwardDays && maxDaysPerYear && carryForwardDays > maxDaysPerYear) {
        maxCarryForwardControl?.setErrors({ 'max': true });
      }
    });
  }

  submit(): void {
    if (this.form.valid) {
      const formValue = { ...this.form.value };

      // Only include maxCarryForwardDays if carryForwardAllowed is true
      if (!formValue.carryForwardAllowed) {
        delete formValue.maxCarryForwardDays;
      }

      this.dialogRef.close(formValue);
    }
  }
}

/* ------------------------------------------------------------------
   Inline Dialog Component for Editing Leave Type
------------------------------------------------------------------- */
@Component({
  selector: 'edit-leave-type-dialog-template',
  standalone: true,
  templateUrl: './edit-leave-type-dialog.html',
  styleUrls: ['./leave-types-dialog.scss'],
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    CommonModule
  ]
})
export class EditLeaveTypeDialogTemplate {
  isSubmitting = false;

  readonly colors: ColorOption[] = inject(LEAVE_COLOR_TOKEN);
  readonly data = inject<{ leaveType: LeaveType }>(MAT_DIALOG_DATA);

  readonly form = inject(FormBuilder).group({
    typeName: [this.data.leaveType.typeName, Validators.required],
    description: [this.data.leaveType.description || ''],
    maxDaysPerYear: [this.data.leaveType.maxDaysPerYear, [Validators.required, Validators.min(1)]],
    isPaid: [this.data.leaveType.isPaid],
    carryForwardAllowed: [this.data.leaveType.carryForwardAllowed],
    maxCarryForwardDays: [this.data.leaveType.maxCarryForwardDays || 1, [Validators.min(1)]],
    requiresApproval: [this.data.leaveType.requiresApproval ?? true],
    color: [this.data.leaveType.color, Validators.required],
    isActive: [this.data.leaveType.isActive]
  });

  private dialogRef = inject(MatDialogRef<EditLeaveTypeDialogTemplate>);

  constructor() {
    // Subscribe to carryForwardAllowed changes
    this.form.get('carryForwardAllowed')?.valueChanges.subscribe(isAllowed => {
      const maxCarryForwardControl = this.form.get('maxCarryForwardDays');
      if (isAllowed) {
        maxCarryForwardControl?.setValidators([Validators.required, Validators.min(0)]);
        maxCarryForwardControl?.updateValueAndValidity();
      } else {
        maxCarryForwardControl?.clearValidators();
        maxCarryForwardControl?.setValue(null);
        maxCarryForwardControl?.updateValueAndValidity();
      }
    });

    // Subscribe to maxDaysPerYear changes to validate maxCarryForwardDays
    this.form.get('maxDaysPerYear')?.valueChanges.subscribe(maxDays => {
      const maxCarryForwardControl = this.form.get('maxCarryForwardDays');
      const currentValue = maxCarryForwardControl?.value;

      if (currentValue && maxDays && currentValue > maxDays) {
        maxCarryForwardControl?.setErrors({ 'max': true });
      }
    });

    // Add validation when maxCarryForwardDays changes
    this.form.get('maxCarryForwardDays')?.valueChanges.subscribe(carryForwardDays => {
      const maxDaysPerYear = this.form.get('maxDaysPerYear')?.value;
      const maxCarryForwardControl = this.form.get('maxCarryForwardDays');

      if (carryForwardDays && maxDaysPerYear && carryForwardDays > maxDaysPerYear) {
        maxCarryForwardControl?.setErrors({ 'max': true });
      }
    });
  }

  submit(): void {
    if (this.form.valid) {
      const formValue = { ...this.form.value };

      // Only include maxCarryForwardDays if carryForwardAllowed is true
      if (!formValue.carryForwardAllowed) {
        delete formValue.maxCarryForwardDays;
      }

      this.dialogRef.close(formValue);
    }
  }
}
