import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { PayrollService } from '../../services/payroll.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { 
  SalaryComponent as SalaryComponentModel, 
  SalaryRule, 
  CreateSalaryComponentRequest, 
  UpdateSalaryComponentRequest,
  CreateSalaryRuleRequest,
  UpdateSalaryRuleRequest
} from '../../../../core/models/payroll.models';
import { Department, Position } from '../../../../core/models/employee.models';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

// Custom ErrorStateMatcher that only shows errors when form is submitted and field is touched/dirty
class CustomErrorStateMatcher implements ErrorStateMatcher {
  constructor(private formSubmitted: () => boolean) {}

  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    if (!control) return false;
    const isSubmitted = this.formSubmitted();
    return !!(control && control.invalid && (control.dirty || control.touched) && isSubmitted);
  }
}

@Component({
  selector: 'app-salary-component',
  templateUrl: './salary-component.html',
  styleUrls: ['./salary-component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    TitleCasePipe
  ]
})
export class SalaryComponent implements OnInit {
  salaryComponents: SalaryComponentModel[] = [];
  salaryRules: SalaryRule[] = [];
  departments: Department[] = [];
  positions: Position[] = [];
  loading = false;
  componentForm: FormGroup;
  ruleForm: FormGroup;
  selectedComponent: SalaryComponentModel | null = null;
  selectedRule: SalaryRule | null = null;
  displayedColumns: string[] = ['name', 'type', 'calculationType', 'value', 'isActive', 'actions'];
  ruleDisplayedColumns: string[] = ['name', 'componentName', 'value', 'department', 'position', 'isActive', 'actions'];
  componentFormSubmitted = false;
  ruleFormSubmitted = false;
  
  // Custom error state matchers
  componentErrorStateMatcher: CustomErrorStateMatcher;
  ruleErrorStateMatcher: CustomErrorStateMatcher;
  
  constructor(
    private payrollService: PayrollService,
    private employeeService: EmployeeService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    // Initialize custom error state matchers
    this.componentErrorStateMatcher = new CustomErrorStateMatcher(() => this.componentFormSubmitted);
    this.ruleErrorStateMatcher = new CustomErrorStateMatcher(() => this.ruleFormSubmitted);
    this.componentForm = this.fb.group({
      name: ['', [Validators.required]],
      type: ['allowance', [Validators.required]],
      calculationType: ['fixed', [Validators.required]],
      value: [0, [Validators.required, Validators.min(0)]],
      isAbsentTax: [false],
      isActive: [true]
    });

    // Handle Absent Tax checkbox changes
    this.componentForm.get('isAbsentTax')?.valueChanges.subscribe(isChecked => {
      if (isChecked) {
        this.updateAbsentTaxName();
        this.componentForm.get('name')?.disable();
        this.componentForm.get('type')?.disable();
      } else {
        this.componentForm.get('name')?.enable();
        this.componentForm.get('type')?.enable();
      }
    });

    // Handle calculation type changes for Absent Tax
    this.componentForm.get('calculationType')?.valueChanges.subscribe(() => {
      if (this.componentForm.get('isAbsentTax')?.value) {
        this.updateAbsentTaxName();
      }
    });
    
    this.ruleForm = this.fb.group({
      rulename: ['', [Validators.required]],
      description: [''],
      componentId: ['', [Validators.required]],
      // condition: ['', [Validators.required]],
      valueOverride: [null, [Validators.min(0)]],
      departmentId: [''],
      positionId: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadSalaryComponents();
    this.loadSalaryRules();
    this.loadDepartments();
    this.loadPositions();
  }

  loadSalaryComponents(): void {
    this.loading = true;
    this.payrollService.getSalaryComponents().subscribe(
      response => {
        this.salaryComponents = response.data;
        this.loading = false;
      },
      error => {
        this.snackBar.open('Failed to load salary components', 'Close', { duration: 3000 });
        this.loading = false;
      }
    );
  }

  loadSalaryRules(): void {
    this.payrollService.getSalaryRules().subscribe(
      response => {
        this.salaryRules = response.data;
      },
      error => {
        this.snackBar.open('Failed to load salary rules', 'Close', { duration: 3000 });
      }
    );
  }

  loadDepartments(): void {
    this.employeeService.getDepartments().subscribe(
      departments => {
        this.departments = departments;
      },
      error => {
        this.snackBar.open('Failed to load departments', 'Close', { duration: 3000 });
      }
    );
  }

  loadPositions(): void {
    this.employeeService.getPositions().subscribe(
      positions => {
        this.positions = positions;
      },
      error => {
        this.snackBar.open('Failed to load positions', 'Close', { duration: 3000 });
      }
    );
  }

  private updateAbsentTaxName(): void {
    const calculationType = this.componentForm.get('calculationType')?.value;
    if (calculationType === 'fixed') {
      this.componentForm.patchValue({
        name: 'Absent Tax Fixed Amount',
        type: 'deduction'
      }, { emitEvent: false });
    } else if (calculationType === 'percentage') {
      this.componentForm.patchValue({
        name: 'Absent Tax Percentage',
        type: 'deduction'
      }, { emitEvent: false });
    }
  }

  private canCreateAbsentTaxComponent(calculationType: string): boolean {
    // Check if Absent Tax components already exist
    const existingAbsentTaxComponents = this.salaryComponents.filter(
      comp => comp.name.startsWith('Absent Tax') && comp.type === 'deduction'
    );

    // Check if the specific calculation type already exists
    const existingType = existingAbsentTaxComponents.find(
      comp => {
        if (calculationType === 'fixed') {
          return comp.name === 'Absent Tax Fixed Amount';
        } else {
          return comp.name === 'Absent Tax Percentage';
        }
      }
    );

    // If editing the same component, allow it
    if (this.selectedComponent) {
      return true;
    }

    // Don't allow if this specific type already exists
    return !existingType;
  }

  onSubmit(): void {
    this.componentFormSubmitted = true;
    if (this.componentForm.invalid) {
      return;
    }

    // Check if trying to create Absent Tax component when limit reached
    const isAbsentTax = this.componentForm.get('isAbsentTax')?.value;
    const calculationType = this.componentForm.get('calculationType')?.value;
    
    if (isAbsentTax && !this.selectedComponent && !this.canCreateAbsentTaxComponent(calculationType)) {
      this.snackBar.open(
        calculationType === 'fixed' 
          ? 'Absent Tax Fixed Amount component already exists. You can only create one Fixed Amount and one Percentage component.'
          : 'Absent Tax Percentage component already exists. You can only create one Fixed Amount and one Percentage component.',
        'Close',
        { duration: 5000 }
      );
      return;
    }

    this.loading = true;
    // Use getRawValue() to include disabled form controls
    const formData = this.componentForm.getRawValue() as CreateSalaryComponentRequest;

    if (this.selectedComponent) {
      // Update existing component
      this.payrollService.updateSalaryComponent(this.selectedComponent.componentId, formData).subscribe(
        response => {
          this.snackBar.open('Salary component updated successfully', 'Close', { duration: 3000 });
          this.resetForm();
          this.loadSalaryComponents();
        },
        error => {
          this.snackBar.open('Failed to update salary component', 'Close', { duration: 3000 });
          this.loading = false;
        }
      );
    } else {
      // Create new component
      this.payrollService.createSalaryComponent(formData).subscribe(
        response => {
          this.snackBar.open('Salary component created successfully', 'Close', { duration: 3000 });
          this.resetForm();
          this.loadSalaryComponents();
        },
        error => {
          this.snackBar.open('Failed to create salary component', 'Close', { duration: 3000 });
          this.loading = false;
        }
      );
    }
  }

  editComponent(component: SalaryComponentModel): void {
    this.selectedComponent = component;
    const isAbsentTax = component.name.startsWith('Absent Tax') && component.type === 'deduction';
    this.componentForm.patchValue({
      name: component.name,
      type: component.type,
      calculationType: component.calculationType,
      value: component.value,
      isAbsentTax: isAbsentTax,
      isActive: component.isActive
    });
    
    // Handle disabled state for Absent Tax
    if (isAbsentTax) {
      this.componentForm.get('name')?.disable();
      this.componentForm.get('type')?.disable();
    } else {
      this.componentForm.get('name')?.enable();
      this.componentForm.get('type')?.enable();
    }
  }

  deleteComponent(component: SalaryComponentModel): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Salary Component',
      message: 'Are you sure you want to delete this salary component?',
      itemName: component.name
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loading = true;
        this.payrollService.deleteSalaryComponent(component.componentId).subscribe(
          response => {
            this.snackBar.open('Salary component deleted successfully', 'Close', { duration: 3000 });
            this.loadSalaryComponents();
          },
          error => {
            this.snackBar.open('Failed to delete salary component', 'Close', { duration: 3000 });
            this.loading = false;
          }
        );
      }
    });
  }

  resetForm(): void {
    this.selectedComponent = null;
    this.componentFormSubmitted = false;
    
    // Temporarily remove validators to prevent error state after reset
    const nameControl = this.componentForm.get('name');
    const valueControl = this.componentForm.get('value');
    
    // Store original validators
    const nameValidators = nameControl?.validator;
    const valueValidators = valueControl?.validator;
    
    // Remove validators temporarily
    nameControl?.clearValidators();
    valueControl?.clearValidators();
    
    // Clear all errors and reset state
    Object.keys(this.componentForm.controls).forEach(key => {
      const control = this.componentForm.get(key);
      control?.setErrors(null);
      control?.markAsPristine();
      control?.markAsUntouched();
      control?.updateValueAndValidity({ emitEvent: false });
    });
    
    // Reset the form with default values
    this.componentForm.reset({
      name: '',
      type: 'allowance',
      calculationType: 'fixed',
      value: 0,
      isAbsentTax: false,
      isActive: true
    }, { emitEvent: false });
    
    this.componentForm.get('name')?.enable();
    this.componentForm.get('type')?.enable();
    
    // Re-add validators without triggering validation
    nameControl?.setValidators(nameValidators || null);
    valueControl?.setValidators(valueValidators || null);
    nameControl?.updateValueAndValidity({ emitEvent: false });
    valueControl?.updateValueAndValidity({ emitEvent: false });
    
    // Mark form as pristine and untouched after reset
    this.componentForm.markAsPristine();
    this.componentForm.markAsUntouched();
    
    this.loading = false;
  }
  
  // Salary Rules Methods
  onRuleSubmit(): void {
    this.ruleFormSubmitted = true;
    if (this.ruleForm.invalid) {
      return;
    }

    this.loading = true;
    const formData = this.ruleForm.value as CreateSalaryRuleRequest;
    
    // Only include departmentId if it's not empty
    if (!formData.departmentId || formData.departmentId === '') {
      delete formData.departmentId;
    }
    // Only include positionId if it's not empty
    if (!formData.positionId || formData.positionId === '') {
      delete formData.positionId;
    }
    // Only include valueOverride if it has a value
    if (formData.valueOverride === null || formData.valueOverride === undefined) {
      delete formData.valueOverride;
    }

    if (this.selectedRule) {
      // Update existing rule
      this.payrollService.updateSalaryRule(this.selectedRule.ruleId, formData).subscribe(
        response => {
          this.snackBar.open('Salary rule updated successfully', 'Close', { duration: 3000 });
          this.resetRuleForm();
          this.loadSalaryRules();
        },
        error => {
          this.snackBar.open('Failed to update salary rule', 'Close', { duration: 3000 });
          this.loading = false;
        }
      );
    } else {
      // Create new rule
      this.payrollService.createSalaryRule(formData).subscribe(
        response => {
          this.snackBar.open('Salary rule created successfully', 'Close', { duration: 3000 });
          this.resetRuleForm();
          this.loadSalaryRules();
        },
        error => {
          this.snackBar.open('Failed to create salary rule', 'Close', { duration: 3000 });
          this.loading = false;
        }
      );
    }
  }

  editRule(rule: SalaryRule): void {
    this.selectedRule = rule;
    this.ruleForm.patchValue({
      rulename: rule.rulename,
      description: rule.description || '',
      componentId: rule.componentId,
      // condition: rule.condition,
      valueOverride: rule.valueOverride ?? null,
      departmentId: rule.departmentId || '',
      positionId: rule.positionId || '',
      isActive: rule.isActive
    });
  }

  deleteRule(rule: SalaryRule): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Salary Rule',
      message: 'Are you sure you want to delete this salary rule?',
      itemName: rule.rulename
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loading = true;
        this.payrollService.deleteSalaryRule(rule.ruleId).subscribe(
          response => {
            this.snackBar.open('Salary rule deleted successfully', 'Close', { duration: 3000 });
            this.loadSalaryRules();
          },
          error => {
            this.snackBar.open('Failed to delete salary rule', 'Close', { duration: 3000 });
            this.loading = false;
          }
        );
      }
    });
  }

  resetRuleForm(): void {
    this.selectedRule = null;
    this.ruleFormSubmitted = false;
    
    // Temporarily remove validators to prevent error state after reset
    const rulenameControl = this.ruleForm.get('rulename');
    const componentIdControl = this.ruleForm.get('componentId');
    
    // Store original validators
    const rulenameValidators = rulenameControl?.validator;
    const componentIdValidators = componentIdControl?.validator;
    
    // Remove validators temporarily
    rulenameControl?.clearValidators();
    componentIdControl?.clearValidators();
    
    // Clear all errors and reset state
    Object.keys(this.ruleForm.controls).forEach(key => {
      const control = this.ruleForm.get(key);
      control?.setErrors(null);
      control?.markAsPristine();
      control?.markAsUntouched();
      control?.updateValueAndValidity({ emitEvent: false });
    });
    
    // Reset the form with default values
    this.ruleForm.reset({
      rulename: '',
      description: '',
      componentId: '',
      valueOverride: null,
      isActive: true,
      departmentId: '',
      positionId: ''
    }, { emitEvent: false });
    
    // Re-add validators without triggering validation
    rulenameControl?.setValidators(rulenameValidators || null);
    componentIdControl?.setValidators(componentIdValidators || null);
    rulenameControl?.updateValueAndValidity({ emitEvent: false });
    componentIdControl?.updateValueAndValidity({ emitEvent: false });
    
    // Mark form as pristine and untouched after reset
    this.ruleForm.markAsPristine();
    this.ruleForm.markAsUntouched();
    
    this.loading = false;
  }
}
