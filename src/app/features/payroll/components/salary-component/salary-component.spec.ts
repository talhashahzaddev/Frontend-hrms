import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
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

import { SalaryComponent } from './salary-component';
import { PayrollService } from '../../services/payroll.service';
import { of } from 'rxjs';

describe('SalaryComponent', () => {
  let component: SalaryComponent;
  let fixture: ComponentFixture<SalaryComponent>;
  let payrollService: PayrollService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SalaryComponent,
        ReactiveFormsModule,
        HttpClientTestingModule,
        NoopAnimationsModule,
        MatSnackBarModule,
        MatDialogModule,
        MatTabsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatTableModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatButtonModule
      ],
      providers: [PayrollService]
    }).compileComponents();

    fixture = TestBed.createComponent(SalaryComponent);
    component = fixture.componentInstance;
    payrollService = TestBed.inject(PayrollService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize component forms', () => {
    expect(component.componentForm).toBeDefined();
    expect(component.ruleForm).toBeDefined();
  });

  it('should load salary components on init', () => {
    const mockComponents = {
      success: true,
      message: 'Success',
      data: [
        {
          componentId: '1',
          name: 'Basic Salary',
          type: 'allowance' as const,
          calculationType: 'fixed' as const,
          value: 1000,
          isDefault: true,
          isTaxable: true,
          isActive: true
        }
      ]
    };
    
    spyOn(payrollService, 'getSalaryComponents').and.returnValue(of(mockComponents));
    spyOn(payrollService, 'getSalaryRules').and.returnValue(of({ success: true, message: 'Success', data: [] }));
    
    fixture.detectChanges();
    
    expect(payrollService.getSalaryComponents).toHaveBeenCalled();
    expect(component.salaryComponents.length).toBe(1);
  });

  it('should reset component form', () => {
    component.resetForm();
    expect(component.selectedComponent).toBeNull();
    expect(component.componentForm.value.name).toBeFalsy();
  });

  it('should reset rule form', () => {
    component.resetRuleForm();
    expect(component.selectedRule).toBeNull();
    expect(component.ruleForm.value.name).toBeFalsy();
  });
});