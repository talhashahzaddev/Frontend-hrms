import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
import { 
  SalaryComponent as SalaryComponentModel, 
  SalaryRule, 
  CreateSalaryComponentRequest, 
  UpdateSalaryComponentRequest,
  CreateSalaryRuleRequest,
  UpdateSalaryRuleRequest
} from '../../../../core/models/payroll.models';

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
  loading = false;
  componentForm: FormGroup;
  ruleForm: FormGroup;
  selectedComponent: SalaryComponentModel | null = null;
  selectedRule: SalaryRule | null = null;
  displayedColumns: string[] = ['name', 'type', 'calculationType', 'value', 'isDefault', 'isTaxable', 'isActive', 'actions'];
  ruleDisplayedColumns: string[] = ['name', 'description', 'componentName', 'condition', 'value', 'isActive', 'actions'];
  
  constructor(
    private payrollService: PayrollService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.componentForm = this.fb.group({
      name: ['', [Validators.required]],
      type: ['allowance', [Validators.required]],
      calculationType: ['fixed', [Validators.required]],
      value: [0, [Validators.required, Validators.min(0)]],
      isDefault: [false],
      isTaxable: [false],
      isActive: [true]
    });
    
    this.ruleForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      componentId: ['', [Validators.required]],
      condition: ['', [Validators.required]],
      value: [0, [Validators.required, Validators.min(0)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadSalaryComponents();
    this.loadSalaryRules();
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

  onSubmit(): void {
    if (this.componentForm.invalid) {
      return;
    }

    this.loading = true;
    const formData = this.componentForm.value as CreateSalaryComponentRequest;

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
    this.componentForm.patchValue({
      name: component.name,
      type: component.type,
      calculationType: component.calculationType,
      value: component.value,
      isDefault: component.isDefault,
      isTaxable: component.isTaxable,
      isActive: component.isActive
    });
  }

  deleteComponent(component: SalaryComponentModel): void {
    if (confirm(`Are you sure you want to delete ${component.name}?`)) {
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
  }

  resetForm(): void {
    this.selectedComponent = null;
    this.componentForm.reset({
      type: 'allowance',
      calculationType: 'fixed',
      value: 0,
      isDefault: false,
      isTaxable: false,
      isActive: true
    });
    this.loading = false;
  }
  
  // Salary Rules Methods
  onRuleSubmit(): void {
    if (this.ruleForm.invalid) {
      return;
    }

    this.loading = true;
    const formData = this.ruleForm.value as CreateSalaryRuleRequest;

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
      name: rule.name,
      description: rule.description,
      componentId: rule.componentId,
      condition: rule.condition,
      value: rule.value,
      isActive: rule.isActive
    });
  }

  deleteRule(rule: SalaryRule): void {
    if (confirm(`Are you sure you want to delete ${rule.name}?`)) {
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
  }

  resetRuleForm(): void {
    this.selectedRule = null;
    this.ruleForm.reset({
      description: '',
      value: 0,
      isActive: true
    });
    this.loading = false;
  }
}
