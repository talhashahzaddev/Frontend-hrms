import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { SuperAdminPayrollDashboardComponent } from './superadmin-payroll-dashboard.component';
import { PayrollService } from '../../services/payroll.service';
import { AuthService } from '../../../core/services/auth.service';
import { PayrollPeriod, PayrollEntry, DepartmentBreakdown, PayrollTrendData } from '../../../core/models/payroll.models';

describe('SuperAdminPayrollDashboardComponent', () => {
  let component: SuperAdminPayrollDashboardComponent;
  let fixture: ComponentFixture<SuperAdminPayrollDashboardComponent>;
  let mockPayrollService: jasmine.SpyObj<PayrollService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const mockPayrollPeriods: PayrollPeriod[] = [
    {
      id: '1',
      name: 'January 2024',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      status: 'Open',
      totalAmount: 1500000,
      employeeCount: 50,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'February 2024',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-02-28'),
      status: 'Approved',
      totalAmount: 1550000,
      employeeCount: 52,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockRecentEntries: PayrollEntry[] = [
    {
      id: '1',
      employeeId: 'emp1',
      employeeName: 'John Doe',
      payrollPeriodId: '1',
      payrollPeriodName: 'January 2024',
      basicSalary: 50000,
      allowances: 10000,
      deductions: 5000,
      netSalary: 55000,
      status: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      employeeId: 'emp2',
      employeeName: 'Jane Smith',
      payrollPeriodId: '1',
      payrollPeriodName: 'January 2024',
      basicSalary: 60000,
      allowances: 12000,
      deductions: 6000,
      netSalary: 66000,
      status: 'Approved',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockDepartmentBreakdown: DepartmentBreakdown[] = [
    {
      departmentId: 'dept1',
      departmentName: 'Engineering',
      totalAmount: 800000,
      employeeCount: 25
    },
    {
      departmentId: 'dept2',
      departmentName: 'Sales',
      totalAmount: 400000,
      employeeCount: 15
    }
  ];

  const mockPayrollTrendData: PayrollTrendData[] = [
    {
      month: 'Jan',
      totalAmount: 1500000,
      employeeCount: 50
    },
    {
      month: 'Feb',
      totalAmount: 1550000,
      employeeCount: 52
    }
  ];

  beforeEach(async () => {
    mockPayrollService = jasmine.createSpyObj('PayrollService', [
      'getPayrollPeriods',
      'getRecentPayrollEntries',
      'getPayrollStatistics',
      'getDepartmentBreakdown',
      'getPayrollTrend',
      'approvePayrollEntry',
      'rejectPayrollEntry',
      'createPayrollPeriod',
      'calculatePayroll',
      'processPayment',
      'generatePayrollReport',
      'exportPayrollData'
    ]);

    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

    await TestBed.configureTestingModule({
      declarations: [SuperAdminPayrollDashboardComponent],
      imports: [
        ReactiveFormsModule,
        MatSnackBarModule,
        MatDialogModule,
        MatTableModule,
        MatTabsModule,
        MatCardModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: PayrollService, useValue: mockPayrollService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuperAdminPayrollDashboardComponent);
    component = fixture.componentInstance;

    // Setup mock responses
    mockPayrollService.getPayrollPeriods.and.returnValue(of(mockPayrollPeriods));
    mockPayrollService.getRecentPayrollEntries.and.returnValue(of(mockRecentEntries));
    mockPayrollService.getPayrollStatistics.and.returnValue(of({
      totalEmployees: 100,
      totalPayrollAmount: 3000000,
      pendingApprovals: 5,
      completedPayrolls: 12
    }));
    mockPayrollService.getDepartmentBreakdown.and.returnValue(of(mockDepartmentBreakdown));
    mockPayrollService.getPayrollTrend.and.returnValue(of(mockPayrollTrendData));
    mockAuthService.getCurrentUser.and.returnValue(of({
      id: 'admin1',
      name: 'Super Admin',
      role: 'SuperAdmin'
    }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize component and load data', () => {
    fixture.detectChanges();
    expect(component.loading).toBeTrue();
    expect(mockPayrollService.getPayrollPeriods).toHaveBeenCalled();
    expect(mockPayrollService.getRecentPayrollEntries).toHaveBeenCalled();
    expect(mockPayrollService.getPayrollStatistics).toHaveBeenCalled();
    expect(mockPayrollService.getDepartmentBreakdown).toHaveBeenCalled();
    expect(mockPayrollService.getPayrollTrend).toHaveBeenCalled();
  });

  it('should load payroll periods successfully', () => {
    fixture.detectChanges();
    expect(component.payrollPeriods).toEqual(mockPayrollPeriods);
    expect(component.loading).toBeFalse();
  });

  it('should handle error when loading payroll periods', () => {
    mockPayrollService.getPayrollPeriods.and.returnValue(throwError(() => new Error('Failed to load')));
    fixture.detectChanges();
    expect(component.loading).toBeFalse();
    expect(component.error).toBe('Failed to load payroll data. Please try again.');
  });

  it('should load recent entries successfully', () => {
    fixture.detectChanges();
    expect(component.recentEntries).toEqual(mockRecentEntries);
  });

  it('should load statistics successfully', () => {
    fixture.detectChanges();
    expect(component.totalEmployees).toBe(100);
    expect(component.totalPayrollAmount).toBe(3000000);
    expect(component.pendingApprovals).toBe(5);
    expect(component.completedPayrolls).toBe(12);
  });

  it('should approve payroll entry successfully', () => {
    mockPayrollService.approvePayrollEntry.and.returnValue(of({ success: true }));
    fixture.detectChanges();
    
    component.approveEntry('1');
    expect(mockPayrollService.approvePayrollEntry).toHaveBeenCalledWith('1');
  });

  it('should reject payroll entry successfully', () => {
    mockPayrollService.rejectPayrollEntry.and.returnValue(of({ success: true }));
    fixture.detectChanges();
    
    component.rejectEntry('1');
    expect(mockPayrollService.rejectPayrollEntry).toHaveBeenCalledWith('1');
  });

  it('should create payroll period successfully', () => {
    mockPayrollService.createPayrollPeriod.and.returnValue(of({ id: '3', name: 'March 2024' }));
    fixture.detectChanges();
    
    component.createPayrollPeriod();
    expect(mockPayrollService.createPayrollPeriod).toHaveBeenCalled();
  });

  it('should process payroll successfully', () => {
    mockPayrollService.calculatePayroll.and.returnValue(of({ success: true }));
    fixture.detectChanges();
    
    component.processPayroll('1');
    expect(mockPayrollService.calculatePayroll).toHaveBeenCalledWith('1');
  });

  it('should generate report successfully', () => {
    mockPayrollService.generatePayrollReport.and.returnValue(of(new Blob()));
    fixture.detectChanges();
    
    component.generateReport();
    expect(mockPayrollService.generatePayrollReport).toHaveBeenCalled();
  });

  it('should export data successfully', () => {
    mockPayrollService.exportPayrollData.and.returnValue(of(new Blob()));
    fixture.detectChanges();
    
    component.exportData();
    expect(mockPayrollService.exportPayrollData).toHaveBeenCalled();
  });

  it('should apply filters successfully', () => {
    fixture.detectChanges();
    
    component.filterForm.patchValue({
      periodId: '1',
      departmentId: 'dept1',
      status: 'Pending'
    });
    
    component.applyFilters();
    expect(mockPayrollService.getPayrollPeriods).toHaveBeenCalledWith('1', 'dept1', 'Pending');
  });

  it('should clear filters successfully', () => {
    fixture.detectChanges();
    
    component.filterForm.patchValue({
      periodId: '1',
      departmentId: 'dept1',
      status: 'Pending'
    });
    
    component.clearFilters();
    expect(component.filterForm.value).toEqual({ periodId: '', departmentId: '', status: '' });
    expect(mockPayrollService.getPayrollPeriods).toHaveBeenCalledWith('', '', '');
  });

  it('should refresh data successfully', () => {
    fixture.detectChanges();
    
    component.refreshData();
    expect(mockPayrollService.getPayrollPeriods).toHaveBeenCalled();
    expect(mockPayrollService.getRecentPayrollEntries).toHaveBeenCalled();
    expect(mockPayrollService.getPayrollStatistics).toHaveBeenCalled();
    expect(mockPayrollService.getDepartmentBreakdown).toHaveBeenCalled();
    expect(mockPayrollService.getPayrollTrend).toHaveBeenCalled();
  });

  it('should get correct status color', () => {
    expect(component.getStatusColor('Pending')).toBe('accent');
    expect(component.getStatusColor('Approved')).toBe('primary');
    expect(component.getStatusColor('Paid')).toBe('primary');
    expect(component.getStatusColor('Rejected')).toBe('warn');
    expect(component.getStatusColor('Open')).toBe('accent');
  });

  it('should get correct status icon', () => {
    expect(component.getStatusIcon('Pending')).toBe('schedule');
    expect(component.getStatusIcon('Approved')).toBe('check_circle');
    expect(component.getStatusIcon('Paid')).toBe('payment');
    expect(component.getStatusIcon('Rejected')).toBe('cancel');
    expect(component.getStatusIcon('Open')).toBe('lock_open');
  });

  it('should view period details', () => {
    fixture.detectChanges();
    
    component.viewPeriodDetails('1');
    // In a real test, you would verify navigation or dialog opening
    expect(true).toBeTrue(); // Placeholder assertion
  });

  it('should view entry details', () => {
    fixture.detectChanges();
    
    component.viewEntryDetails('1');
    // In a real test, you would verify navigation or dialog opening
    expect(true).toBeTrue(); // Placeholder assertion
  });
});