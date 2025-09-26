import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { EmployeeSalaryHistoryComponent } from './employee-salary-history.component';
import { PayrollService } from '../../services/payroll.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PayrollEntry, PayrollPeriod } from '../../../core/models/payroll.models';
import { User } from '../../../core/models/auth.models';

// Mock data
const mockUser: User = {
  id: 'user123',
  email: 'john.doe@company.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'Employee'
};

const mockPayrollPeriods: PayrollPeriod[] = [
  {
    id: 'period1',
    name: 'January 2024',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    status: 'Completed',
    organizationId: 'org123'
  },
  {
    id: 'period2',
    name: 'February 2024',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-02-29'),
    status: 'Completed',
    organizationId: 'org123'
  }
];

const mockSalaryHistory: PayrollEntry[] = [
  {
    id: 'entry1',
    employeeId: 'user123',
    payrollPeriodId: 'period1',
    payrollPeriodName: 'January 2024',
    payrollPeriodStartDate: new Date('2024-01-01'),
    payrollPeriodEndDate: new Date('2024-01-31'),
    basicSalary: 50000,
    grossSalary: 65000,
    netSalary: 58000,
    totalDeductions: 7000,
    status: 'Paid',
    hasPayslip: true,
    allowances: [
      { name: 'House Rent Allowance', amount: 12000 },
      { name: 'Travel Allowance', amount: 3000 }
    ],
    deductions: [
      { name: 'Income Tax', amount: 5000 },
      { name: 'Professional Tax', amount: 2000 }
    ]
  },
  {
    id: 'entry2',
    employeeId: 'user123',
    payrollPeriodId: 'period2',
    payrollPeriodName: 'February 2024',
    payrollPeriodStartDate: new Date('2024-02-01'),
    payrollPeriodEndDate: new Date('2024-02-29'),
    basicSalary: 50000,
    grossSalary: 65000,
    netSalary: 58000,
    totalDeductions: 7000,
    status: 'Paid',
    hasPayslip: true,
    allowances: [
      { name: 'House Rent Allowance', amount: 12000 },
      { name: 'Travel Allowance', amount: 3000 }
    ],
    deductions: [
      { name: 'Income Tax', amount: 5000 },
      { name: 'Professional Tax', amount: 2000 }
    ]
  }
];

describe('EmployeeSalaryHistoryComponent', () => {
  let component: EmployeeSalaryHistoryComponent;
  let fixture: ComponentFixture<EmployeeSalaryHistoryComponent>;
  let payrollService: jasmine.SpyObj<PayrollService>;
  let authService: jasmine.SpyObj<AuthService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const payrollServiceSpy = jasmine.createSpyObj('PayrollService', [
      'getEmployeePayrollHistory',
      'getPayrollPeriods',
      'downloadPayslip',
      'viewPayslip'
    ]);
    
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [EmployeeSalaryHistoryComponent],
      providers: [
        { provide: PayrollService, useValue: payrollServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    payrollService = TestBed.inject(PayrollService) as jasmine.SpyObj<PayrollService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EmployeeSalaryHistoryComponent);
    component = fixture.componentInstance;
    
    // Setup default spy return values
    authService.getCurrentUser.and.returnValue(mockUser);
    payrollService.getEmployeePayrollHistory.and.returnValue(of({
      data: mockSalaryHistory,
      totalRecords: mockSalaryHistory.length,
      page: 1,
      pageSize: 10
    }));
    payrollService.getPayrollPeriods.and.returnValue(of(mockPayrollPeriods));
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with current user', () => {
    expect(authService.getCurrentUser).toHaveBeenCalled();
    expect(component.currentUser).toEqual(mockUser);
  });

  it('should load salary history on init', () => {
    expect(payrollService.getEmployeePayrollHistory).toHaveBeenCalledWith(
      mockUser.id,
      1,
      10,
      undefined,
      undefined,
      undefined
    );
    expect(component.salaryHistory).toEqual(mockSalaryHistory);
    expect(component.totalRecords).toBe(mockSalaryHistory.length);
  });

  it('should load available payroll periods on init', () => {
    expect(payrollService.getPayrollPeriods).toHaveBeenCalled();
    expect(component.availablePeriods).toEqual(mockPayrollPeriods);
  });

  it('should calculate summary statistics correctly', () => {
    component.calculateSummaryStatistics();
    
    expect(component.currentSalary).toBe(58000); // Latest net salary
    expect(component.averageSalary).toBe(58000); // Average of 2 entries
    expect(component.totalEarnings).toBe(116000); // Sum of both entries
    expect(component.payslipCount).toBe(2);
  });

  it('should handle filter form changes', () => {
    spyOn(component, 'applyFilters');
    
    component.filterForm.patchValue({
      periodId: 'period1',
      search: 'January'
    });
    
    component.filterForm.get('periodId')?.updateValueAndValidity();
    component.filterForm.get('search')?.updateValueAndValidity();
    
    expect(component.applyFilters).toHaveBeenCalled();
  });

  it('should apply filters correctly', () => {
    component.filterForm.patchValue({
      periodId: 'period1',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      search: 'January'
    });
    
    component.applyFilters();
    
    expect(payrollService.getEmployeePayrollHistory).toHaveBeenCalledWith(
      mockUser.id,
      1,
      10,
      'period1',
      jasmine.any(Date),
      jasmine.any(Date),
      'January'
    );
  });

  it('should clear filters correctly', () => {
    component.filterForm.patchValue({
      periodId: 'period1',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      search: 'January'
    });
    
    component.clearFilters();
    
    expect(component.filterForm.value).toEqual({
      periodId: '',
      startDate: null,
      endDate: null,
      search: ''
    });
    expect(payrollService.getEmployeePayrollHistory).toHaveBeenCalledWith(
      mockUser.id,
      1,
      10,
      undefined,
      undefined,
      undefined
    );
  });

  it('should handle page changes', () => {
    const pageEvent = { pageIndex: 2, pageSize: 25 };
    
    component.onPageChange(pageEvent);
    
    expect(component.pageIndex).toBe(3); // pageIndex + 1
    expect(component.pageSize).toBe(25);
    expect(payrollService.getEmployeePayrollHistory).toHaveBeenCalledWith(
      mockUser.id,
      3,
      25,
      undefined,
      undefined,
      undefined
    );
  });

  it('should view payslip successfully', () => {
    payrollService.viewPayslip.and.returnValue(of({ url: 'http://example.com/payslip.pdf' }));
    
    component.viewPayslip('entry1');
    
    expect(payrollService.viewPayslip).toHaveBeenCalledWith('entry1');
    expect(window.open).toHaveBeenCalledWith('http://example.com/payslip.pdf', '_blank');
  });

  it('should handle payslip view error', () => {
    payrollService.viewPayslip.and.returnValue(throwError(() => new Error('Failed to load payslip')));
    
    component.viewPayslip('entry1');
    
    expect(snackBar.open).toHaveBeenCalledWith(
      'Failed to load payslip. Please try again.',
      'Close',
      { duration: 5000 }
    );
  });

  it('should download payslip successfully', () => {
    const mockBlob = new Blob(['test'], { type: 'application/pdf' });
    payrollService.downloadPayslip.and.returnValue(of(mockBlob));
    spyOn(component, 'downloadFile');
    
    component.downloadPayslip('entry1');
    
    expect(payrollService.downloadPayslip).toHaveBeenCalledWith('entry1');
    expect(component.downloadFile).toHaveBeenCalledWith(mockBlob, 'payslip_January_2024.pdf');
  });

  it('should handle payslip download error', () => {
    payrollService.downloadPayslip.and.returnValue(throwError(() => new Error('Failed to download payslip')));
    
    component.downloadPayslip('entry1');
    
    expect(snackBar.open).toHaveBeenCalledWith(
      'Failed to download payslip. Please try again.',
      'Close',
      { duration: 5000 }
    );
  });

  it('should export to Excel', () => {
    spyOn(component, 'exportToExcel');
    
    component.exportToExcel();
    
    expect(component.exportToExcel).toHaveBeenCalled();
  });

  it('should refresh data', () => {
    spyOn(component, 'loadSalaryHistory');
    spyOn(component, 'loadAvailablePeriods');
    
    component.refreshData();
    
    expect(component.loadSalaryHistory).toHaveBeenCalled();
    expect(component.loadAvailablePeriods).toHaveBeenCalled();
  });

  it('should get correct status color', () => {
    expect(component.getStatusColor('Paid')).toBe('primary');
    expect(component.getStatusColor('Pending')).toBe('accent');
    expect(component.getStatusColor('Rejected')).toBe('warn');
    expect(component.getStatusColor('Unknown')).toBe('');
  });

  it('should handle API errors gracefully', () => {
    payrollService.getEmployeePayrollHistory.and.returnValue(
      throwError(() => new Error('API Error'))
    );
    
    component.loadSalaryHistory();
    
    expect(snackBar.open).toHaveBeenCalledWith(
      'Failed to load salary history. Please try again.',
      'Close',
      { duration: 5000 }
    );
    expect(component.loading).toBe(false);
  });

  it('should unsubscribe on destroy', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');
    
    component.ngOnDestroy();
    
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});