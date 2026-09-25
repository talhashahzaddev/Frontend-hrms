import { MatIconModule } from '@angular/material/icon';
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { Employee, Department, Position } from '../../../../core/models/employee.models';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { EmployeeService } from '../../services/employee.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { Subject, takeUntil } from 'rxjs';

import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-employee-dialogue',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './employee-dialogue.component.html',
  styleUrls: ['./employee-dialogue.component.scss']
})
export class EmployeeDialogueComponent implements OnInit, OnDestroy {
  
  isViewMode = true;   // always view style unless editing
  employeeForm!: FormGroup;
  private destroy$ = new Subject<void>();

  departments: Department[] = [];
  positions: Position[] = [];
  managers: Employee[] = [];
  currencySymbol: string = '$';
  organizationCurrency: string = 'USD';

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private settingsService: SettingsService,
    public dialogRef: MatDialogRef<EmployeeDialogueComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { employee: Employee; viewOnly: boolean }
  ) {}

  ngOnInit(): void {
    this.isViewMode = this.data.viewOnly === true;
    this.loadInitialData();
    // Fix profile image URL
    this.data.employee.profilePictureUrl =
      this.employeeService.resolveProfilePictureUrl(this.data.employee.profilePictureUrl) ?? undefined;

    if (!this.isViewMode) {
      this.buildForm();
      this.loadDropdowns();
    }
  }

  buildForm() {
    const emp = this.data.employee;

    this.employeeForm = this.fb.group({
      firstName: [emp.firstName, Validators.required],
      lastName: [emp.lastName, Validators.required],
      email: [emp.email, [Validators.required, Validators.email]],
      phone: [emp.phone],
      dateOfBirth: [emp.dateOfBirth],
      gender: [emp.gender],
      nationality: [emp.nationality],
      maritalStatus: [emp.maritalStatus],
      departmentId: [emp.department?.departmentId || ''],
      positionId: [emp.position?.positionId || ''],
      employmentType: [emp.employmentType],
      reportingManagerId: [emp.manager?.employeeId || ''],
      basicSalary: [emp.basicSalary],
      payType: [emp.payType],
      hireDate: [emp.hireDate],
      status: [emp.status],
      address: this.fb.group({
        street: [emp.address?.street],
        city: [emp.address?.city],
        state: [emp.address?.state],
        zip: [emp.address?.zip]
      }),
      emergencyContact: this.fb.group({
        name: [emp.emergencyContact?.name],
        relationship: [emp.emergencyContact?.relationship],
        phone: [emp.emergencyContact?.phone],
        email: [emp.emergencyContact?.email]
      })
    });
  }

  loadDropdowns() {
    this.employeeService.getDepartments().subscribe(depts => this.departments = depts);
    this.employeeService.getPositions().subscribe(pos => this.positions = pos);
    this.employeeService.getManagers().subscribe(mgrs => this.managers = mgrs);
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  save(): void {
    if (this.employeeForm.valid) {
      const updated = { ...this.data.employee, ...this.employeeForm.value };
      this.dialogRef.close(updated);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  private loadInitialData(): void {
      // Load organization currency first
      this.settingsService.getOrganizationSettings()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (settings) => {
            this.organizationCurrency = settings.currency || 'USD';
            const currency = this.settingsService.getAvailableCurrencies().find(c => c.code === this.organizationCurrency);
            this.currencySymbol = currency?.symbol || '$';
          },
          error: (error) => {
            console.error('Error loading organization currency:', error);
            // Default to USD if error
            
            this.currencySymbol = '$';
          }
        });
    }
}
