import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SettingsService } from '../../../settings/services/settings.service';
import { take } from 'rxjs';

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

  constructor(
    public dialogRef: MatDialogRef<AttendanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AttendanceDialogData,
    private fb: FormBuilder,
    private settingsService: SettingsService
  ) {
    this.setTitle();
  }

  ngOnInit(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode) => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol(currencyCode));
        },
        error: () => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol());
        }
      });

    this.initForm();
    if (this.data.mode === 'edit' && this.data.record) {
      this.form.patchValue(this.data.record);
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

  setTitle() {
    const action = this.data.mode === 'add' ? 'Add' : 'Edit';
    const typeLabel = this.data.type.replace('-', ' ');
    this.title = `${action} ${typeLabel} record`;
  }

  initForm() {
    this.form = this.fb.group({
      employee: ['', Validators.required],
      type: [this.data.type !== 'overtime' ? this.data.type : '', Validators.required],
      period: ['', Validators.required],
      
      // Overtime specific fields
      ...(this.data.type === 'overtime' ? {
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
      this.dialogRef.close({ ...this.form.getRawValue(), recordType: this.data.type });
    } else {
      this.form.markAllAsTouched();
    }
  }
}
