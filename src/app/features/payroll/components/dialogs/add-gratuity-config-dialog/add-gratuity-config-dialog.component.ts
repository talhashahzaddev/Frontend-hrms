import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SharedCommonModule } from '@shared/shared-common.module';
export type GratuityConfigStatus = 'active' | 'inactive';
export type GratuityCalculationType = 'perYear' | 'fixed' | 'percentage';

export interface GratuityConfigDialogPayload {
  configName: string;
  calculationType: GratuityCalculationType;
  value: number;
  minYearsRequired: number;
  status: GratuityConfigStatus;
}

interface GratuityConfigDialogData {
  mode?: 'create' | 'edit';
  initialValue?: Partial<GratuityConfigDialogPayload>;
}


@Component({
  selector: 'app-add-gratuity-config-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    SharedCommonModule,CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './add-gratuity-config-dialog.component.html',
  styleUrl: './add-gratuity-config-dialog.component.scss'
})
export class AddGratuityConfigDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddGratuityConfigDialogComponent, GratuityConfigDialogPayload | undefined>);

  readonly mode: 'create' | 'edit' = this.data?.mode ?? 'create';

  readonly form = this.fb.group({
    configName: ['', [Validators.required, Validators.maxLength(150)]],
    calculationType: ['perYear' as GratuityCalculationType, Validators.required],
    value: [1, [Validators.required, Validators.min(0)]],
    minYearsRequired: [3, [Validators.required, Validators.min(0)]],
    status: ['active' as GratuityConfigStatus, Validators.required]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: GratuityConfigDialogData) {
    if (this.data?.initialValue) {
      this.form.patchValue({
        configName: this.data.initialValue.configName ?? '',
        calculationType: this.data.initialValue.calculationType ?? 'perYear',
        value: this.data.initialValue.value ?? 1,
        minYearsRequired: this.data.initialValue.minYearsRequired ?? 3,
        status: this.data.initialValue.status ?? 'active'
      });
    }
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit gratuity config' : 'Gratuity config';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Save changes' : 'Save config';
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.dialogRef.close({
      configName: String(raw.configName ?? '').trim(),
      calculationType: (raw.calculationType ?? 'perYear') as GratuityCalculationType,
      value: Number(raw.value ?? 0),
      minYearsRequired: Number(raw.minYearsRequired ?? 0),
      status: (raw.status ?? 'active') as GratuityConfigStatus
    });
  }
}
