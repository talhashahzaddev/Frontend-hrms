import { Component, Inject, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { PayrollService } from '../../services/payroll.service';
import { finalize } from 'rxjs/operators';
import { NotificationService } from '@core/services/notification.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { take } from 'rxjs';

export interface RuleDialogData {
  // Pass any initial data if needed, e.g., for edit mode
  mode?: 'create' | 'edit';
}

@Component({
  selector: 'app-rule-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './rule-dialog.component.html',
  styleUrls: ['./rule-dialog.component.scss']
})
export class RuleDialogComponent implements OnInit {
  ruleForm: FormGroup;
  isSubmitting = false;
  currencySymbol = '$';

  readonly policies = [
    { id: 1, name: 'Overtime Policy' },
    { id: 2, name: 'Attendance Deduction Policy' },
    { id: 3, name: 'Late Arrival Policy' },
    { id: 4, name: 'Leave Deduction Policy' },
    { id: 5, name: 'Performance Bonus Policy' },
    { id: 6, name: 'Employee Loan Policy' },
    { id: 7, name: 'Salary Advance Policy' },
    { id: 8, name: 'Provident Fund Policy' },
    { id: 9, name: 'Income Tax Policy' },
    { id: 10, name: 'Social Security Policy' },
    { id: 11, name: 'Gratuity Policy' }
  ];

  readonly overtimeTypes = ['regular', 'holiday', 'weekend'];

  constructor(
    private fb: FormBuilder,
    private payrollService: PayrollService,
    private settingsService: SettingsService,
    private dialogRef: MatDialogRef<RuleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RuleDialogData,
    private notification: NotificationService
  ) {
    this.ruleForm = this.fb.group({
      selectedPolicy: ['', Validators.required],
      // Overtime Policy fields
      ruleName: [''],
      description: [''],
      overtimeType: [''],
      amountType: ['fixed'],
      fixedAmount: [null],
      percentage: [null]
    });
  }

  ngOnInit(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode) => {
          this.currencySymbol = this.settingsService.getCurrencySymbol(currencyCode);
        },
        error: () => {
          this.currencySymbol = this.settingsService.getCurrencySymbol();
        }
      });

    // When policy selection changes, update validators dynamically if needed
    this.ruleForm.get('selectedPolicy')?.valueChanges.subscribe(policy => {
      this.updateValidation(policy);
    });

    // When amount type changes, update validation logic
    this.ruleForm.get('amountType')?.valueChanges.subscribe(() => {
      this.updateAmountValidation();
    });
  }

  get selectedPolicy(): number {
    return this.ruleForm.get('selectedPolicy')?.value;
  }

  private updateValidation(policyId: number) {
    const isOvertime = policyId === 1;

    const overtimeControls = ['ruleName', 'overtimeType', 'amountType'];

    overtimeControls.forEach(ctrl => {
      const control = this.ruleForm.get(ctrl);
      if (isOvertime) {
        control?.setValidators(Validators.required);
      } else {
        control?.clearValidators();
      }
      control?.updateValueAndValidity();
    });

    this.updateAmountValidation();
  }

  private updateAmountValidation() {
    const isOvertime = this.selectedPolicy === 1;
    const amountType = this.ruleForm.get('amountType')?.value;

    const fixedControl = this.ruleForm.get('fixedAmount');
    const percentControl = this.ruleForm.get('percentage');

    if (isOvertime) {
      if (amountType === 'fixed') {
        fixedControl?.setValidators(Validators.required);
        percentControl?.clearValidators();
        percentControl?.setValue(null);
      } else if (amountType === 'percentage') {
        percentControl?.setValidators(Validators.required);
        fixedControl?.clearValidators();
        fixedControl?.setValue(null);
      }
    } else {
      fixedControl?.clearValidators();
      percentControl?.clearValidators();
    }

    fixedControl?.updateValueAndValidity();
    percentControl?.updateValueAndValidity();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.ruleForm.invalid || this.isSubmitting) {
      this.ruleForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.ruleForm.getRawValue();

    // We only send back the relevant fields based on the selected policy
    let resultPayload: any = {
      policyId: formValue.selectedPolicy
    };

    if (formValue.selectedPolicy === 1) { // 1 is Overtime Policy
      resultPayload = {
        ruleName: formValue.ruleName,
        description: formValue.description,
        overtimeType: formValue.overtimeType,
        fixedAmount: formValue.amountType === 'fixed' ? formValue.fixedAmount : null,
        percentage: formValue.amountType === 'percentage' ? formValue.percentage : null
      };

      this.payrollService.createOvertimeRule(resultPayload)
        .pipe(finalize(() => this.isSubmitting = false))
        .subscribe({
          next: (res) => {
            this.notification.showSuccess('Overtime rule created successfully');
            this.dialogRef.close({ success: true, data: res, policyId: 1 });
          },
          error: (err: any) => {
            this.notification.showError(err?.message || 'Failed to create overtime rule');
          }
        });
    } else {
      // Simulate API call for now or pass back to parent (Not Implemented)
      setTimeout(() => {
        this.isSubmitting = false;
        this.dialogRef.close(resultPayload);
      }, 500);
    }
  }
}
