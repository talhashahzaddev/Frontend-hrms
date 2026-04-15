import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface PfFundsEmployeeOption {
  id: string;
  name: string;
}

export interface PfFundsPeriodOption {
  id: string;
  name: string;
}

export interface AddPfFundsDialogPayload {
  employeeId: string;
  periodId: string;
}

interface AddPfFundsDialogData {
  employees?: PfFundsEmployeeOption[];
  periods?: PfFundsPeriodOption[];
}

@Component({
  selector: 'app-add-pf-funds',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-pf-funds.component.html',
  styleUrl: './add-pf-funds.component.scss'
})
export class AddPfFundsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddPfFundsComponent, AddPfFundsDialogPayload | undefined>);

  readonly employees = this.data?.employees ?? [];
  readonly periods = this.data?.periods ?? [];

  readonly form = this.fb.group({
    employeeId: ['', Validators.required],
    periodId: ['', Validators.required]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: AddPfFundsDialogData) {}

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.dialogRef.close({
      employeeId: String(raw.employeeId ?? '').trim(),
      periodId: String(raw.periodId ?? '').trim()
    });
  }
}
