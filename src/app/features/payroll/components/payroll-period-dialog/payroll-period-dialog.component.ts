import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface PayrollPeriodDialogData {
  mode: 'add' | 'edit';
  record?: any;
}

@Component({
  selector: 'app-payroll-period-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './payroll-period-dialog.component.html',
  styleUrl: './payroll-period-dialog.component.scss'
})
export class PayrollPeriodDialogComponent implements OnInit {
  form!: FormGroup;
  title = '';

  constructor(
    public dialogRef: MatDialogRef<PayrollPeriodDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PayrollPeriodDialogData,
    private fb: FormBuilder
  ) {
    this.setTitle();
  }

  ngOnInit(): void {
    this.initForm();
    if (this.data.mode === 'edit' && this.data.record) {
      this.form.patchValue(this.data.record);
    }
  }

  setTitle() {
    this.title = this.data.mode === 'add' ? 'Create Payroll Period' : 'Edit Payroll Period';
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      paymentDate: ['', Validators.required],
      status: ['Open', Validators.required],
      description: ['']
    });
  }

  close() {
    this.dialogRef.close();
  }

  save() {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    } else {
      this.form.markAllAsTouched();
    }
  }
}
