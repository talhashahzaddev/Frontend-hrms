import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export type BulkGenerateEmployeeStatus = 'none' | 'draft' | 'generated' | 'sent' | 'viewed' | 'failed' | 'bounced';

export interface BulkGeneratePeriodOption {
  id: string;
  label: string;
}

export interface BulkGenerateDepartmentOption {
  id: string;
  label: string;
}

export interface BulkGenerateEmployeeOption {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  currentStatus: BulkGenerateEmployeeStatus;
}

export interface BulkGeneratePayslipsDialogData {
  periods: BulkGeneratePeriodOption[];
  departments: BulkGenerateDepartmentOption[];
  employees: BulkGenerateEmployeeOption[];
  defaultPeriodId?: string;
  defaultDepartmentId?: string;
}

export interface BulkGeneratePayslipsDialogPayload {
  payrollPeriodId: string;
  departmentId: string | null;
  overwriteExisting: boolean;
  employeeIds: string[];
}

@Component({
  selector: 'app-bulk-generate-payslips-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatIconModule],
  templateUrl: './bulk-generate-payslips-dialog.component.html',
  styleUrl: './bulk-generate-payslips-dialog.component.scss'
})
export class BulkGeneratePayslipsDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<BulkGeneratePayslipsDialogComponent, BulkGeneratePayslipsDialogPayload | undefined>);

  readonly selectedEmployeeIds = new Set<string>();
  selectionError = false;

  readonly form = this.fb.group({
    payrollPeriodId: [this.data.defaultPeriodId ?? this.data.periods[0]?.id ?? '', Validators.required],
    departmentId: [this.data.defaultDepartmentId ?? ''],
    overwriteExisting: [false]
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: BulkGeneratePayslipsDialogData) {
    this.visibleEmployees.forEach((employee) => this.selectedEmployeeIds.add(employee.id));

    this.form.get('departmentId')?.valueChanges.subscribe(() => {
      this.selectionError = false;
      this.reconcileSelectionToVisibleEmployees();
    });
  }

  get visibleEmployees(): BulkGenerateEmployeeOption[] {
    const selectedDepartmentId = String(this.form.get('departmentId')?.value ?? '').trim();
    if (!selectedDepartmentId) {
      return this.data.employees;
    }

    return this.data.employees.filter((employee) => employee.departmentId === selectedDepartmentId);
  }

  get selectedCount(): number {
    return this.visibleEmployees.filter((employee) => this.selectedEmployeeIds.has(employee.id)).length;
  }

  get allVisibleSelected(): boolean {
    if (!this.visibleEmployees.length) {
      return false;
    }

    return this.visibleEmployees.every((employee) => this.selectedEmployeeIds.has(employee.id));
  }

  close(): void {
    this.dialogRef.close();
  }

  toggleSelectAll(checked: boolean): void {
    this.selectionError = false;

    if (checked) {
      this.visibleEmployees.forEach((employee) => this.selectedEmployeeIds.add(employee.id));
      return;
    }

    this.visibleEmployees.forEach((employee) => this.selectedEmployeeIds.delete(employee.id));
  }

  toggleEmployee(id: string, checked: boolean): void {
    this.selectionError = false;

    if (checked) {
      this.selectedEmployeeIds.add(id);
      return;
    }

    this.selectedEmployeeIds.delete(id);
  }

  isSelected(id: string): boolean {
    return this.selectedEmployeeIds.has(id);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const selectedIds = this.visibleEmployees
      .filter((employee) => this.selectedEmployeeIds.has(employee.id))
      .map((employee) => employee.id);

    if (!selectedIds.length) {
      this.selectionError = true;
      return;
    }

    const raw = this.form.getRawValue();

    this.dialogRef.close({
      payrollPeriodId: String(raw.payrollPeriodId ?? ''),
      departmentId: raw.departmentId ? String(raw.departmentId) : null,
      overwriteExisting: Boolean(raw.overwriteExisting),
      employeeIds: selectedIds
    });
  }

  statusClass(status: BulkGenerateEmployeeStatus): string {
    if (status === 'sent') return 'status-sent';
    if (status === 'viewed') return 'status-viewed';
    if (status === 'failed') return 'status-failed';
    if (status === 'bounced') return 'status-bounced';
    if (status === 'generated') return 'status-generated';
    if (status === 'draft') return 'status-draft';
    return 'status-none';
  }

  statusLabel(status: BulkGenerateEmployeeStatus): string {
    if (status === 'none') return 'No slip';
    return status;
  }

  private reconcileSelectionToVisibleEmployees(): void {
    const visibleIdSet = new Set(this.visibleEmployees.map((employee) => employee.id));

    Array.from(this.selectedEmployeeIds).forEach((id) => {
      if (!visibleIdSet.has(id)) {
        this.selectedEmployeeIds.delete(id);
      }
    });

    if (!this.selectedEmployeeIds.size) {
      this.visibleEmployees.forEach((employee) => this.selectedEmployeeIds.add(employee.id));
    }
  }
}
