import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SettingsService } from '../../../../settings/services/settings.service';
import { take } from 'rxjs';
import { EmployeeService } from '../../../../employee/services/employee.service';
import { PayrollService } from '../../../services/payroll.service';

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
  rules: any[] = [];           // overtime rules
  deductionRules: any[] = []; // attendance deduction rules
  lateRules: any[] = [];      // late arrival rules
  leaveRules: any[] = [];     // leave deduction rules
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

    // Patch form when editing
    if (this.data.mode === 'edit' && this.data.record) {
      if (this.data.type === 'overtime') {
        this.form.patchValue({
          employee: this.data.record.employeeId,
          rule: this.data.record.ruleId,
          period: this.data.record.periodId,
          hours: this.data.record.hoursWorked,
          rate: this.data.record.rate,
          amount: this.data.record.finalAmount,
        });
      } else if (this.data.type === 'absent') {
        this.form.patchValue({
          employee: this.data.record.employeeId,
          rule: this.data.record.ruleId ?? '',
          period: this.data.record.periodId,
          presentDays: this.data.record.presentDays,
          absentDays: this.data.record.absentDays,
          halfDays: this.data.record.halfDays,
          effectiveAbsents: this.data.record.effectiveAbsents,
          absentDeduction: this.data.record.absentDeduction,
          halfDayDeduction: this.data.record.halfDayDeduction,
          totalDeduction: this.data.record.totalDeduction,
        });
      } else if (this.data.type === 'late') {
        this.form.patchValue({
          employee: this.data.record.employeeId,
          rule: this.data.record.ruleId ?? '',
          period: this.data.record.periodId,
          lateMinutes: this.data.record.lateMinutes,
          deduction: this.data.record.deduction,
          isGrace: this.data.record.isGrace,
        });
      } else if (this.data.type === 'leave') {
        this.form.patchValue({
          employee: this.data.record.employeeId,
          rule: this.data.record.ruleId ?? '',
          period: this.data.record.periodId,
          paidDays: this.data.record.paidDays,
          unpaidDays: this.data.record.unpaidDays,
          halfPaidDays: this.data.record.halfPaidDays,
          unpaidDeduction: this.data.record.unpaidDeduction,
          halfPaidDeduction: this.data.record.halfPaidDeduction,
          totalDeduction: this.data.record.totalDeduction,
        });
      } else {
        this.form.patchValue(this.data.record);
      }
    }

    // Auto-calculate for overtime
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

    // Auto-calculate for absent: effectiveAbsents & totalDeduction
    if (this.data.type === 'absent') {
      this.form.valueChanges.subscribe(val => {
        const absentDays = Number(val.absentDays ?? 0);
        const halfDays = Number(val.halfDays ?? 0);
        const effectiveAbsents = absentDays + halfDays * 0.5;

        if (this.form.get('effectiveAbsents')?.value !== effectiveAbsents) {
          this.form.patchValue({ effectiveAbsents }, { emitEvent: false });
        }

        const absentDeduction = Number(val.absentDeduction ?? 0);
        const halfDayDeduction = Number(val.halfDayDeduction ?? 0);
        const totalDeduction = absentDeduction + (halfDays > 0 ? halfDayDeduction : 0);
        
        if (halfDays <= 0 && this.form.get('halfDayDeduction')?.value !== 0) {
          this.form.patchValue({ halfDayDeduction: 0 }, { emitEvent: false });
        }

        if (this.form.get('totalDeduction')?.value !== totalDeduction) {
          this.form.patchValue({ totalDeduction }, { emitEvent: false });
        }
      });
    }

    // Auto-calculate for leave: totalDeduction
    if (this.data.type === 'leave') {
      this.form.valueChanges.subscribe(val => {
        const halfPaidDays = Number(val.halfPaidDays ?? 0);
        if (halfPaidDays <= 0 && this.form.get('halfPaidDeduction')?.value !== 0) {
          this.form.patchValue({ halfPaidDeduction: 0 }, { emitEvent: false });
        }

        const unpaidDeduction = Number(val.unpaidDeduction ?? 0);
        const halfPaidDeduction = Number(val.halfPaidDeduction ?? 0);
        const totalDeduction = unpaidDeduction + halfPaidDeduction;

        if (this.form.get('totalDeduction')?.value !== totalDeduction) {
          this.form.patchValue({ totalDeduction }, { emitEvent: false });
        }
      });
    }
  }

  loadData() {
    this.employeeService.getEmployees({ page: 1, pageSize: 100 } as any).subscribe((res: any) => {
      this.employees = res.employees;
    });

    this.payrollService.getPayrollPeriods({ pageSize: 100 }).subscribe((res: any) => {
      this.periods = (res.data || []).map((p: any) => ({
        id: p.periodId,
        name: p.periodName
      }));
    });

    if (this.data.type === 'overtime') {
      this.payrollService.getOvertimeActiveRules().subscribe((res: any) => {
        this.rules = res;
      });
    }

    if (this.data.type === 'absent') {
      this.payrollService.getActiveAttendanceDeductionRules().subscribe((res: any) => {
        this.deductionRules = res;
      });
    }

    if (this.data.type === 'late') {
      this.payrollService.getActiveLateArrivalRules().subscribe((res: any) => {
        this.lateRules = res;
      });
    }

    if (this.data.type === 'leave') {
      this.payrollService.getLeaveActiveRules().subscribe((res: any) => {
        this.leaveRules = res;
      });
    }
  }

  onRuleChange(event: any) {
    const selectedRule = this.rules.find(r => r.ruleId === event.target.value);
    if (selectedRule) {
      // Future: auto-fill rate from rule if needed
    }
  }

  setTitle() {
    const action = this.data.mode === 'add' ? 'Log' : 'Edit';
    const typeLabel = this.data.type.replace('-', ' ');
    this.title = `${action} ${typeLabel} record`;
  }

  initForm() {
    if (this.data.type === 'overtime') {
      this.form = this.fb.group({
        employee: ['', Validators.required],
        rule: ['', Validators.required],
        period: ['', Validators.required],
        hours: ['', [Validators.required, Validators.min(0.5)]],
        rate: ['', [Validators.required, Validators.min(1)]],
        amount: [{ value: '', disabled: true }]
      });
    } else if (this.data.type === 'absent') {
      this.form = this.fb.group({
        employee: ['', Validators.required],
        rule: [''],
        period: ['', Validators.required],
        presentDays: [0, [Validators.required, Validators.min(0)]],
        absentDays: [0, [Validators.required, Validators.min(0)]],
        halfDays: [0, [Validators.required, Validators.min(0)]],
        effectiveAbsents: [{ value: 0, disabled: true }],
        absentDeduction: [0, [Validators.required, Validators.min(0)]],
        halfDayDeduction: [0, [Validators.required, Validators.min(0)]],
        totalDeduction: [{ value: 0, disabled: true }],
      });
    } else if (this.data.type === 'late') {
      this.form = this.fb.group({
        employee: ['', Validators.required],
        rule: [''],
        period: ['', Validators.required],
        lateMinutes: [0, [Validators.required, Validators.min(0)]],
        deduction: [0, [Validators.required, Validators.min(0)]],
        isGrace: [false],
      });
    } else if (this.data.type === 'leave') {
      this.form = this.fb.group({
        employee: ['', Validators.required],
        rule: [''],
        period: ['', Validators.required],
        paidDays: [0, [Validators.required, Validators.min(0)]],
        unpaidDays: [0, [Validators.required, Validators.min(0)]],
        halfPaidDays: [0, [Validators.required, Validators.min(0)]],
        unpaidDeduction: [0, [Validators.required, Validators.min(0)]],
        halfPaidDeduction: [0, [Validators.required, Validators.min(0)]],
        totalDeduction: [{ value: 0, disabled: true }],
      });
    } else {
      this.form = this.fb.group({
        employee: ['', Validators.required],
        type: [this.data.type],
        period: ['', Validators.required],
      });
    }
  }

  close() {
    this.dialogRef.close();
  }

  save() {
    if (this.form.valid) {
      const rawValue = this.form.getRawValue();
      let payload: any;

      if (this.data.type === 'overtime') {
        payload = {
          employeeId: rawValue.employee,
          periodId: rawValue.period,
          ruleId: rawValue.rule || null,
          hoursWorked: rawValue.hours,
          finalAmount: rawValue.amount,
        };
      } else if (this.data.type === 'absent') {
        payload = {
          employeeId: rawValue.employee,
          periodId: rawValue.period,
          ruleId: rawValue.rule || null,
          presentDays: rawValue.presentDays,
          absentDays: rawValue.absentDays,
          halfDays: rawValue.halfDays,
          effectiveAbsents: rawValue.effectiveAbsents,
          absentDeduction: rawValue.absentDeduction,
          halfDayDeduction: rawValue.halfDayDeduction,
          totalDeduction: rawValue.totalDeduction,
        };
      } else if (this.data.type === 'late') {
        payload = {
          employeeId: rawValue.employee,
          periodId: rawValue.period,
          ruleId: rawValue.rule || null,
          lateMinutes: rawValue.lateMinutes,
          deduction: rawValue.deduction,
          isGrace: rawValue.isGrace,
        };
      } else if (this.data.type === 'leave') {
        payload = {
          employeeId: rawValue.employee,
          periodId: rawValue.period,
          ruleId: rawValue.rule || null,
          paidDays: rawValue.paidDays,
          unpaidDays: rawValue.unpaidDays,
          halfPaidDays: rawValue.halfPaidDays,
          unpaidDeduction: rawValue.unpaidDeduction,
          halfPaidDeduction: rawValue.halfPaidDeduction,
          totalDeduction: rawValue.totalDeduction,
        };
      } else {
        payload = rawValue;
      }

      this.dialogRef.close({ ...payload, recordType: this.data.type });
    } else {
      this.form.markAllAsTouched();
    }
  }
}
