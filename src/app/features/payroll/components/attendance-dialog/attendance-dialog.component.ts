import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SettingsService } from '../../../settings/services/settings.service';
import { take } from 'rxjs';
import { EmployeeService } from '../../../employee/services/employee.service';
import { PayrollService } from '../../services/payroll.service';

export interface AttendanceDialogData {
  type: 'leave' | 'absent' | 'late' | 'half-day' | 'overtime';
  mode: 'add' | 'edit';
  record?: any;
}

@Component({
  selector: 'app-attendance-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './attendance-dialog.component.html',
  styleUrl: './attendance-dialog.component.scss'
})
export class AttendanceDialogComponent implements OnInit {
  form!: FormGroup;
  title = '';
  currencySymbol = signal('$');
  employees: any[] = [];
  rules: any[] = [];
  periods: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<AttendanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AttendanceDialogData,
    private fb: FormBuilder,
    private settingsService: SettingsService,
    private employeeService: EmployeeService,
    private payrollService: PayrollService
  ) {
    this.setTitle();
  }

  ngOnInit(): void {
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

    this.initForm();
    this.loadData();

    if (this.data.mode === 'edit' && this.data.record) {
      if (this.data.type === 'overtime') {
        this.form.patchValue({
          employee: this.data.record.employeeId,
          rule: this.data.record.ruleId,
          period: this.data.record.periodId,
          hours: this.data.record.hours,
          rate: this.data.record.rate,
          amount: this.data.record.amount,
          overtimeDate: new Date(this.data.record.overtimeDate).toISOString().split('T')[0]
        });
      } else {
        this.form.patchValue(this.data.record);
      }
    }

    // Auto-calculate amount if it's overtime
    if (this.data.type === 'overtime') {
      this.form.valueChanges.subscribe(val => {
        if (val.hours && val.rate) {
          const amount = val.hours * val.rate;
          if (this.form.get('amount')?.value !== amount) {
            this.form.patchValue({ amount }, { emitEvent: false });
          }
        } else {
          if (this.form.get('amount')?.value) {
            this.form.patchValue({ amount: null }, { emitEvent: false });
          }
        }
      });
    }
  }

  loadData() {
    this.employeeService.getEmployees({ page: 1, pageSize: 100 } as any).subscribe((res: any) => {
      this.employees = res.employees;
    });
    this.payrollService.getOvertimeActiveRules().subscribe((res: any) => {
      this.rules = res;
    });
    this.payrollService.getPayrollPeriods({ pageSize: 100 }).subscribe((res: any) => {
      this.periods = ((res?.data ?? res) || []).map((p: any) => ({
        id: p.periodId,
        name: p.periodName
      }));
    });
  }

  onRuleChange(event: any) {
    const selectedRule = this.rules.find(r => r.ruleId === event.target.value);
    if (selectedRule) {
      // You can auto-fill rate if percentage/fixed amounts dictate it or clear rate
    }
  }

  setTitle() {
    const action = this.data.mode === 'add' ? 'Add' : 'Edit';
    const typeLabel = this.data.type.replace('-', ' ');
    this.title = `${action} ${typeLabel} record`;
  }

  initForm() {
    this.form = this.fb.group({
      employee: ['', Validators.required],
      type: [this.data.type !== 'overtime' ? this.data.type : ''],
      period: ['', Validators.required],

      // Overtime specific fields
      ...(this.data.type === 'overtime' ? {
        rule: ['', Validators.required],
        overtimeDate: ['', Validators.required],
        hours: ['', [Validators.required, Validators.min(0.5)]],
        rate: ['', [Validators.required, Validators.min(1)]],
        amount: [{ value: '', disabled: true }]
      } : {})
    });
  }

  close() {
    this.dialogRef.close();
  }

  save() {
    if (this.form.valid) {
      const rawValue = this.form.getRawValue();
      let payload = rawValue;

      if (this.data.type === 'overtime') {
        payload = {
          employeeId: rawValue.employee,
          periodId: rawValue.period,
          ruleId: rawValue.rule,
          hoursWorked: rawValue.hours,
          finalAmount: rawValue.amount,
          overtimeDate: rawValue.overtimeDate,
          entryStatus: 'pending'
        };
      }
      this.dialogRef.close({ ...payload, recordType: this.data.type });
    } else {
      this.form.markAllAsTouched();
    }
  }
}
