import { MatIconModule } from '@angular/material/icon';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { Employee, Department, Position } from '../../../../core/models/employee.models';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-employee-dialogue',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './employee-dialogue.component.html',
  styleUrls: ['./employee-dialogue.component.scss']
})
export class EmployeeDialogueComponent implements OnInit {
  employeeForm!: FormGroup;
  isViewMode = false;

  departments: Department[] = [];
  positions: Position[] = [];
  managers: Employee[] = [];

  employmentTypes = ['full_time', 'part_time', 'contract'];
  statuses = ['active', 'inactive', 'terminated'];

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    public dialogRef: MatDialogRef<EmployeeDialogueComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { employee: Employee; viewOnly: boolean }
  ) {
    this.isViewMode = data.viewOnly;
  }

  ngOnInit(): void {
    const emp = this.data.employee;

    this.employeeForm = this.fb.group({
      employeeCode: [{ value: emp.employeeCode, disabled: true }],
      firstName: [{ value: emp.firstName, disabled: this.isViewMode }, Validators.required],
      lastName: [{ value: emp.lastName, disabled: this.isViewMode }, Validators.required],
      fullName: [{ value: emp.fullName, disabled: true }],
      email: [{ value: emp.email, disabled: this.isViewMode }, [Validators.required, Validators.email]],
      phone: [{ value: emp.phone, disabled: this.isViewMode }],
      dateOfBirth: [{ value: emp.dateOfBirth, disabled: this.isViewMode }],
      gender: [{ value: emp.gender, disabled: this.isViewMode }],
      nationality: [{ value: emp.nationality, disabled: this.isViewMode }],
      maritalStatus: [{ value: emp.maritalStatus, disabled: this.isViewMode }],
      address: this.fb.group({
        street: [{ value: emp.address?.street || '', disabled: this.isViewMode }],
        city: [{ value: emp.address?.city || '', disabled: this.isViewMode }],
        state: [{ value: emp.address?.state || '', disabled: this.isViewMode }],
        zip: [{ value: emp.address?.zip || '', disabled: this.isViewMode }]
      }),
      emergencyContact: this.fb.group({
        name: [{ value: emp.emergencyContact?.name || '', disabled: this.isViewMode }],
        email: [{ value: emp.emergencyContact?.email || '', disabled: this.isViewMode }],
        phone: [{ value: emp.emergencyContact?.phone || '', disabled: this.isViewMode }],
        relationship: [{ value: emp.emergencyContact?.relationship || '', disabled: this.isViewMode }]
      }),

      departmentId: [{ value: emp.department?.departmentId || '', disabled: this.isViewMode }],
      departmentName: [{ value: emp.department?.departmentName || '', disabled: true }],
      positionId: [{ value: emp.position?.positionId || '', disabled: this.isViewMode }],
      positionTitle: [{ value: emp.position?.positionTitle || '', disabled: true }],

      reportingManagerId: [{ value: emp.manager?.employeeId || '', disabled: this.isViewMode }],
      reportingManagerName: [{ value: emp.reportingManagerName || '',disabled: true }],

      employmentType: [{ value: emp.employmentType || '', disabled: this.isViewMode }],
      payType: [{ value: emp.paytype || '', disabled: this.isViewMode }],
      basicSalary: [{ value: emp.basicSalary || 0, disabled: this.isViewMode }],
      hireDate: [{ value: emp.hireDate, disabled: this.isViewMode }],
      status: [{ value: emp.status, disabled: this.isViewMode }]
    });

     // Disable entire form in view mode
  if (this.isViewMode) {
    this.employeeForm.disable();
  }

    this.loadDropdowns();
  }

  loadDropdowns() {
    this.employeeService.getDepartments().subscribe(depts => this.departments = depts);
    this.employeeService.getPositions().subscribe(pos => this.positions = pos);
    this.employeeService.getManagers().subscribe(mgrs => this.managers = mgrs);
  }

  save(): void {
    if (this.employeeForm.valid) {
      const updatedEmployee = { ...this.data.employee, ...this.employeeForm.value };
      this.dialogRef.close(updatedEmployee);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
