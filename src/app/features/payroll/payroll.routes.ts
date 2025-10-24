import { Routes } from '@angular/router';
import { PayrollDashboardComponent } from './components/payroll-dashboard/payroll-dashboard.component';
import { PayrollPeriodsComponent } from './components/payroll-periods/payroll-periods.component';
import { PayrollEntriesComponent } from './components/payroll-entries/payroll-entries.component';
import { PayrollProcessingComponent } from './components/payroll-processing/payroll-processing.component';
import { PayrollCalculationComponent } from './components/payroll-calculation/payroll-calculation.component';
import { PayrollReportsComponent } from './components/payroll-reports/payroll-reports.component';
import { PayslipManagementComponent } from './components/payslip-management/payslip-management.component';
import { EmployeePayslipComponent } from './components/employee-payslip/employee-payslip.component';
import { EmployeeSalaryHistoryComponent } from './components/employee-salary-history/employee-salary-history.component';
import { SuperadminPayrollDashboardComponent } from './components/superadmin-payroll-dashboard/superadmin-payroll-dashboard.component';
import { SalaryComponent } from './components/salary-component/salary-component';

export const payrollRoutes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: PayrollDashboardComponent },
  { path: 'periods', component: PayrollPeriodsComponent },
  { path: 'entries', component: PayrollEntriesComponent },
  { path: 'process', component: PayrollProcessingComponent },
  { path: 'calculate', component: PayrollCalculationComponent },
  { path: 'reports', component: PayrollReportsComponent },
  { path: 'slips', component: PayslipManagementComponent },
  { path: 'employee/payslips', component: EmployeePayslipComponent },
  { path: 'employee/salary-history', component: EmployeeSalaryHistoryComponent },
  { path: 'superadmin/dashboard', component: SuperadminPayrollDashboardComponent },
  {path:   'salary-component',    component:SalaryComponent}
];
