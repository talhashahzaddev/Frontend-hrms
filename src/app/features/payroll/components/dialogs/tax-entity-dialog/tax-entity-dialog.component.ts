import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

type TaxDialogEntityType = 'category' | 'slab' | 'rule';
type TaxDialogMode = 'create' | 'edit';
type SlabAmountType = 'fixed' | 'percentage';

export interface TaxEntityDialogOption {
  id: string;
  label: string;
}

export interface TaxEntityDialogData {
  entityType: TaxDialogEntityType;
  mode: TaxDialogMode;
  title?: string;
  submitText?: string;
  regimes?: TaxEntityDialogOption[];
  categories?: TaxEntityDialogOption[];
  initialValue?: any;
}

@Component({
  selector: 'app-tax-entity-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './tax-entity-dialog.component.html',
  styleUrl: './tax-entity-dialog.component.scss'
})
export class TaxEntityDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TaxEntityDialogComponent>);

  readonly data: TaxEntityDialogData;

  readonly form = this.fb.group({
    regimeId: [''],
    categoryName: [''],
    isActive: [true],
    categoryId: [''],
    amountType: ['fixed' as SlabAmountType],
    slabOrder: [1],
    minIncome: [0],
    maxIncome: [null as number | null],
    fixedAmount: [0 as number | null],
    percentage: [null as number | null],
    componentName: [''],
    taxability: ['FullyTaxable'],
    limitAmount: [0 as number | null],
    limitPercentage: [0 as number | null],
    limitType: ['fixed' as SlabAmountType],
    applyStage: ['BeforeTax']
  });

  constructor(@Inject(MAT_DIALOG_DATA) incomingData: TaxEntityDialogData) {
    this.data = incomingData;
    this.setupValidators();
    this.patchInitialValue();
    this.setupSlabAmountTypeWatcher();
  }

  get isCategory(): boolean {
    return this.data.entityType === 'category';
  }

  get isSlab(): boolean {
    return this.data.entityType === 'slab';
  }

  get isRule(): boolean {
    return this.data.entityType === 'rule';
  }

  get dialogTitle(): string {
    if (this.data.title) return this.data.title;
    const action = this.data.mode === 'edit' ? 'Edit' : 'Create';
    const suffix = this.isCategory ? 'Tax Category' : this.isSlab ? 'Tax Slab' : 'Tax Rule';
    return `${action} ${suffix}`;
  }

  get submitText(): string {
    if (this.data.submitText) return this.data.submitText;
    return this.data.mode === 'edit' ? 'Save Changes' : 'Create';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    if (this.isCategory) {
      this.dialogRef.close({
        regimeId: String(raw.regimeId || ''),
        categoryName: String(raw.categoryName || '').trim(),
        isActive: !!raw.isActive
      });
      return;
    }

    if (this.isSlab) {
      const amountType = (raw.amountType ?? 'fixed') as SlabAmountType;
      const fixedAmount = amountType === 'fixed'
        ? Number(raw.fixedAmount ?? 0)
        : null;
      const percentage = amountType === 'percentage'
        ? Number(raw.percentage ?? 0)
        : null;

      this.dialogRef.close({
        categoryId: String(raw.categoryId || ''),
        slabOrder: Number(raw.slabOrder || 0),
        minIncome: Number(raw.minIncome || 0),
        maxIncome: raw.maxIncome === null || raw.maxIncome === undefined ? null : Number(raw.maxIncome),
        fixedAmount,
        percentage
      });
      return;
    }

    const limitType = (raw.limitType ?? 'fixed') as SlabAmountType;
    const limitAmount = limitType === 'fixed' ? Number(raw.limitAmount ?? 0) : null;
    const limitPercentage = limitType === 'percentage' ? Number(raw.limitPercentage ?? 0) : null;

    this.dialogRef.close({
      regimeId: String(raw.regimeId || ''),
      componentName: String(raw.componentName || '').trim(),
      taxability: String(raw.taxability || 'FullyTaxable').trim(),
      limitAmount,
      limitPercentage,
      applyStage: String(raw.applyStage || 'BeforeTax').trim()
    });
  }

  private setupValidators(): void {
    if (this.isCategory) {
      this.form.get('regimeId')?.setValidators([Validators.required]);
      this.form.get('categoryName')?.setValidators([Validators.required, Validators.maxLength(100)]);
      return;
    }

    if (this.isSlab) {
      this.form.get('categoryId')?.setValidators([Validators.required]);
      this.form.get('amountType')?.setValidators([Validators.required]);
      this.form.get('slabOrder')?.setValidators([Validators.required, Validators.min(1)]);
      this.form.get('minIncome')?.setValidators([Validators.required, Validators.min(0)]);
      this.form.get('maxIncome')?.setValidators([Validators.min(0)]);
      this.updateSlabAmountValidators((this.form.get('amountType')?.value ?? 'fixed') as SlabAmountType);
      return;
    }

    this.form.get('regimeId')?.setValidators([Validators.required]);
    this.form.get('componentName')?.setValidators([Validators.required, Validators.maxLength(100)]);
    this.form.get('taxability')?.setValidators([Validators.required, Validators.maxLength(30)]);
    this.form.get('applyStage')?.setValidators([Validators.required, Validators.maxLength(50)]);
    this.form.get('limitType')?.setValidators([Validators.required]);
    this.updateRuleLimitValidators((this.form.get('limitType')?.value ?? 'fixed') as SlabAmountType);
  }

  private patchInitialValue(): void {
    if (!this.data.initialValue) return;
    if (this.isSlab) {
      const fixedAmount = this.data.initialValue.fixedAmount;
      const percentage = this.data.initialValue.percentage;
      const amountType: SlabAmountType =
        fixedAmount !== null && fixedAmount !== undefined && Number(fixedAmount) > 0
          ? 'fixed'
          : 'percentage';
      this.form.patchValue({
        ...this.data.initialValue,
        amountType,
        fixedAmount: amountType === 'fixed' ? fixedAmount ?? 0 : null,
        percentage: amountType === 'percentage' ? percentage ?? 0 : null
      });
      this.updateSlabAmountValidators(amountType);
      return;
    }
    if (this.isRule) {
      const limitAmount = this.data.initialValue.limitAmount;
      const limitPercentage = this.data.initialValue.limitPercentage;
      const limitType: SlabAmountType =
        limitAmount !== null && limitAmount !== undefined && Number(limitAmount) > 0
          ? 'fixed'
          : 'percentage';
      this.form.patchValue({
        ...this.data.initialValue,
        limitType,
        limitAmount: limitType === 'fixed' ? limitAmount ?? 0 : null,
        limitPercentage: limitType === 'percentage' ? limitPercentage ?? 0 : null
      });
      this.updateRuleLimitValidators(limitType);
      return;
    }
    this.form.patchValue(this.data.initialValue);
  }

  private setupSlabAmountTypeWatcher(): void {
    this.form.get('amountType')?.valueChanges.subscribe((value) => {
      if (this.isSlab) {
        const amountType = (value ?? 'fixed') as SlabAmountType;
        this.updateSlabAmountValidators(amountType);
      }
    });

    this.form.get('limitType')?.valueChanges.subscribe((value) => {
      if (this.isRule) {
        const limitType = (value ?? 'fixed') as SlabAmountType;
        this.updateRuleLimitValidators(limitType);
      }
    });
  }

  private updateSlabAmountValidators(amountType: SlabAmountType): void {
    if (!this.isSlab) return;

    const fixedControl = this.form.get('fixedAmount');
    const percentControl = this.form.get('percentage');
    if (!fixedControl || !percentControl) return;

    if (amountType === 'fixed') {
      fixedControl.setValidators([Validators.required, Validators.min(0)]);
      percentControl.clearValidators();
      percentControl.setValue(null, { emitEvent: false });
    } else {
      percentControl.setValidators([Validators.required, Validators.min(0)]);
      fixedControl.clearValidators();
      fixedControl.setValue(null, { emitEvent: false });
    }

    fixedControl.updateValueAndValidity({ emitEvent: false });
    percentControl.updateValueAndValidity({ emitEvent: false });
  }

  private updateRuleLimitValidators(limitType: SlabAmountType): void {
    if (!this.isRule) return;

    const amountControl = this.form.get('limitAmount');
    const percentControl = this.form.get('limitPercentage');
    if (!amountControl || !percentControl) return;

    if (limitType === 'fixed') {
      amountControl.setValidators([Validators.required, Validators.min(0)]);
      percentControl.clearValidators();
      percentControl.setValue(null, { emitEvent: false });
    } else {
      percentControl.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
      amountControl.clearValidators();
      amountControl.setValue(null, { emitEvent: false });
    }

    amountControl.updateValueAndValidity({ emitEvent: false });
    percentControl.updateValueAndValidity({ emitEvent: false });
  }
}
