import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { PayrollService } from '../../../services/payroll.service';
import { EmployeeService } from '../../../../employee/services/employee.service';
import { SettingsService } from '../../../../settings/services/settings.service';
import { take } from 'rxjs';
import { AuthService } from '@core/services/auth.service';

import { SharedCommonModule } from '@shared/shared-common.module';
interface BonusDialogData {
  mode?: 'create' | 'edit';
  initialValue?: any;
}


@Component({
  selector: 'app-add-bonus-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './add-bonus-dialog.component.html',
  styleUrl: './add-bonus-dialog.component.scss'
})
export class AddBonusDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly payrollService = inject(PayrollService);
  private readonly employeeService = inject(EmployeeService);
  private readonly settingsService = inject(SettingsService);
  private readonly dialogRef = inject(MatDialogRef<AddBonusDialogComponent>);
  private readonly authService = inject(AuthService);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';

  employees: any[] = [];
  periods: any[] = [];
  bonusRules: any[] = [];
  isLoading = false;
  readonly currencySymbol = signal('$');

  readonly form = this.fb.group({
    employeeId: ['', Validators.required],
    periodId: ['', Validators.required],
    ruleId: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(1)]]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: BonusDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        employeeId: this.data.initialValue.employeeId ?? '',
        periodId: this.data.initialValue.periodId ?? '',
        ruleId: this.data.initialValue.ruleId ?? '',
        amount: this.data.initialValue.amount ?? null
      });
    }
  }

  ngOnInit(): void {
    this.loadInitialData();
    
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode: any) => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol(currencyCode));
        },
        error: () => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol());
        }
      });
  }

  private loadInitialData(): void {
    this.isLoading = true;
    
    // Load Employees
    this.employeeService.getEmployees({ page: 1, pageSize: 1000 }).subscribe({
      next: (res: any) => this.employees = res.employees,
      error: (err: any) => console.error('Error fetching employees:', err)
    });

    // Load Periods
    this.payrollService.getPayrollPeriods().subscribe({
      next: (data: any) => {
        this.periods = Array.isArray(data) ? data : (data?.items || data?.data || []);
      },
      error: (err) => console.error('Error loading periods:', err)
    });

    // Load Active Bonus Rules
    this.payrollService.getActiveBonusRules().subscribe({
      next: (data: any) => {
        this.bonusRules = Array.isArray(data) ? data : (data?.items || data?.data || []);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading bonus rules:', err);
        this.isLoading = false;
      }
    });
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit bonus record' : 'Add bonus record';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Update record' : 'Save record';
  }

  get canSubmit(): boolean {
    if (this.mode === 'edit') {
      return this.authService.hasPermissionByActionKey('bonus_entry_edit');
    }
    return this.authService.hasPermissionByActionKey('bonus_entry_add');
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (!this.canSubmit) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const value = this.form.getRawValue();
    const payload = {
      employeeId: value.employeeId,
      periodId: value.periodId,
      ruleId: value.ruleId || null,
      bonusAmount: Number(value.amount)
    };

    if (this.mode === 'edit') {
      const bonusId = this.data.initialValue.bonusId;
      const updatePayload = {
        ruleId: value.ruleId || null,
        bonusAmount: Number(value.amount)
      };
      this.payrollService.updateBonusEntry(bonusId, updatePayload).subscribe({
        next: () => {
          this.isLoading = false;
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          console.error('Error updating bonus:', err);
          this.isLoading = false;
        }
      });
    } else {
      this.payrollService.createBonusEntry(payload).subscribe({
        next: () => {
          this.isLoading = false;
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          console.error('Error creating bonus:', err);
          this.isLoading = false;
        }
      });
    }
  }
}
