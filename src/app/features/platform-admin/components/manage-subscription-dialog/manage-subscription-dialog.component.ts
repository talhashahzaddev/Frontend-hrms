import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SuperAdminService } from '../../services/super-admin.service';
import { ManageSubscriptionRequest, SubscriptionDetail, SubscriptionPlan } from '../../models/super-admin.models';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface ManageSubscriptionDialogData {
  organizationId: string;
  organizationName: string;
  currentSubscription: SubscriptionDetail | null;
}


@Component({
  selector: 'app-manage-subscription-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './manage-subscription-dialog.component.html',
  styleUrls: ['./manage-subscription-dialog.component.scss']
})
export class ManageSubscriptionDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  actions = [
    { value: 'upgrade', label: 'Upgrade Plan', icon: 'arrow_upward', color: '#4caf50' },
    { value: 'downgrade', label: 'Downgrade Plan', icon: 'arrow_downward', color: '#ff9800' },
    { value: 'extend', label: 'Extend Subscription', icon: 'date_range', color: '#2196f3' },
    { value: 'cancel', label: 'Cancel Subscription', icon: 'cancel', color: '#f44336' }
  ];

  plans: SubscriptionPlan[] = [];
  selectedAction = '';
  minDate = new Date();

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ManageSubscriptionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ManageSubscriptionDialogData,
    private superAdminService: SuperAdminService
  ) {
    this.form = this.fb.group({
      action: ['', Validators.required],
      newPlanId: [null],
      newEndDate: [null],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadPlans();

    this.form.get('action')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(action => {
        this.selectedAction = action;
        this.updateValidators(action);
      });
  }

  private loadPlans(): void {
    this.superAdminService.getSubscriptionPlans()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.plans = res.data;
          }
        }
      });
  }

  private updateValidators(action: string): void {
    const newPlanCtrl = this.form.get('newPlanId');
    const newEndDateCtrl = this.form.get('newEndDate');

    // Reset
    newPlanCtrl?.clearValidators();
    newEndDateCtrl?.clearValidators();
    newPlanCtrl?.setValue(null);
    newEndDateCtrl?.setValue(null);

    if (action === 'upgrade' || action === 'downgrade') {
      newPlanCtrl?.setValidators(Validators.required);
    } else if (action === 'extend') {
      newEndDateCtrl?.setValidators(Validators.required);
    }

    newPlanCtrl?.updateValueAndValidity();
    newEndDateCtrl?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.form.value;
    const request: ManageSubscriptionRequest = {
      action: formValue.action,
      newPlanId: formValue.newPlanId || undefined,
      newEndDate: formValue.newEndDate ? new Date(formValue.newEndDate).toISOString() : undefined,
      notes: formValue.notes || undefined
    };

    this.superAdminService.manageSubscription(this.data.organizationId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.dialogRef.close('success');
          } else {
            this.errorMessage = res.message || 'Operation failed.';
            this.isSubmitting = false;
          }
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'An error occurred.';
          this.isSubmitting = false;
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
