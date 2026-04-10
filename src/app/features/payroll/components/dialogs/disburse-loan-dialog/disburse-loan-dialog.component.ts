import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { PayrollService } from '../../../services/payroll.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-disburse-loan-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatDialogModule],
  templateUrl: './disburse-loan-dialog.component.html',
  styleUrl: './disburse-loan-dialog.component.scss'
})
export class DisburseLoanDialogComponent {
  form: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DisburseLoanDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { loanId: string, employeeName: string },
    private payrollService: PayrollService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) return;

    this.isSubmitting = true;
    const requestData = {
      loanId: this.data.loanId,
      ...this.form.value
    };

    this.payrollService.disburseLoan(requestData).subscribe({
      next: (res: any) => {
        this.toastr.success('Loan disbursed successfully');
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.toastr.error(err.message || 'Failed to disburse loan');
        this.isSubmitting = false;
      }
    });
  }
}
