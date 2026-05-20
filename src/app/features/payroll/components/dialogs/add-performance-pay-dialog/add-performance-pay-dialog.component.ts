import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { SettingsService } from '../../../../settings/services/settings.service';
import { take } from 'rxjs';
import { OnInit, inject, signal } from '@angular/core';
import { AuthService } from '@core/services/auth.service';

export interface PerformanceDialogResult {
  employee: string;
  designation: string;
  payrollPeriod: string;
  performanceId: string;
  score: number;
  rating: 'Excellent' | 'Good' | 'Average' | 'Below average';
  amount: number;
  calculatedAt: string;
}

export interface PerformanceDialogResultPayload {
  employeeId: string;
  periodId: string;
  ruleId: string | null;
  score: number;
  amount: number;
}

interface EmployeeOption {
  id: string;
  name: string;
  designation: string;
}

interface PerformanceDialogData {
  mode?: 'create' | 'edit';
  initialValue?: any;
  employees?: EmployeeOption[];
  periods?: any[];
  rules?: any[];
}

@Component({
  selector: 'app-add-performance-pay-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './add-performance-pay-dialog.component.html',
  styleUrl: './add-performance-pay-dialog.component.scss'
})
export class AddPerformancePayDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly dialogRef = inject(MatDialogRef<AddPerformancePayDialogComponent, PerformanceDialogResultPayload | undefined>);
  private readonly authService = inject(AuthService);
  
  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';
  readonly currencySymbol = signal('$');

  readonly employees = this.data?.employees ?? [];
  readonly periods = this.data?.periods ?? [];
  readonly rules = this.data?.rules ?? [];

  readonly form = this.fb.group({
    employeeId: ['', Validators.required],
    periodId: ['', Validators.required],
    ruleId: [null as string | null],
    score: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    rating: ['Average' as const],
    amount: [0, [Validators.required, Validators.min(0)]]
  });


  constructor(@Inject(MAT_DIALOG_DATA) public data: PerformanceDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        employeeId: this.data.initialValue.employeeId ?? '',
        periodId: this.data.initialValue.periodId ?? '',
        ruleId: this.data.initialValue.ruleId ?? null,
        score: this.data.initialValue.score ?? 0,
        amount: this.data.initialValue.amount ?? 0
      });
      this.updateRating(this.data.initialValue.score ?? 0);

      // In edit mode, lock employee & period selects via FormControl (not [disabled] attr)
      this.form.get('employeeId')?.disable();
      this.form.get('periodId')?.disable();
    } else if (this.periods.length > 0) {
      // Default to first period
      this.form.patchValue({ periodId: this.periods[0].periodId });
    }

    // Subscribe to score changes to update rating
    this.form.get('score')?.valueChanges.subscribe(score => {
      this.updateRating(score ?? 0);
    });
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
  }

  get canSubmit(): boolean {
    if (this.mode === 'edit') {
      return this.authService.hasPermissionByActionKey('performance_pay_edit');
    }
    return this.authService.hasPermissionByActionKey('performance_pay_add');
  }

  updateRating(score: number): void {
    let rating = 'Average';
    if (score >= 90) rating = 'Excellent';
    else if (score >= 75) rating = 'Good';
    else if (score < 50) rating = 'Below average';

    this.form.patchValue({ rating: rating as any }, { emitEvent: false });
  }

  onRuleChange(ruleId: string | null): void {
    // Ideally calculate amount based on rule logic if we have access to it, 
    // or just leave amount blank for user input if rule doesn't dictate it fully on frontend.
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit performance pay' : 'Add performance pay';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Update record' : 'Save record';
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

    const value = this.form.getRawValue();

    this.dialogRef.close({
      employeeId: value.employeeId!,
      periodId: value.periodId!,
      ruleId: value.ruleId ?? null,
      score: Number(value.score ?? 0),
      amount: Number(value.amount ?? 0)
    });
  }
}

