export interface PayrollPeriod {
  periodId: string;
  periodName: string;
  startDate: string;
  endDate: string;
  payDate?: string;
  status: PayrollStatus;
  totalEmployees: number;
  totalGrossAmount: number;
  totalTaxAmount: number;
  totalNetAmount: number;
  processorName?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export enum PayrollStatus {
  DRAFT = 'draft',
  CALCULATED = 'calculated',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  PAID = 'paid'
}

export interface PayrollEntry {
  entryId: string;
  periodId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  position: string;
  basicSalary: number;
  allowances: { [key: string]: number };
  deductions: { [key: string]: number };
  overtimeAmount: number;
  bonusAmount: number;
  grossSalary: number;
  taxAmount: number;
  otherDeductions: number;
  netSalary: number;
  currency: string;
  status: PayrollEntryStatus;
  calculatedAt?: string;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
}

export enum PayrollEntryStatus {
  DRAFT = 'draft',
  CALCULATED = 'calculated',
  APPROVED = 'approved',
  PAID = 'paid'
}

export interface CreatePayrollPeriodRequest {
  periodName: string;
  startDate: string;
  endDate: string;
  payDate?: string;
}

export interface PayrollCalculationRequest {
  periodId: string;
  employeeIds?: string[];
  includeAllowances: boolean;
  includeDeductions: boolean;
  includeOvertime: boolean;
}

export interface PayrollSummary {
  totalEmployees: number;
  totalGrossAmount: number;
  totalNetAmount: number;
  totalTaxAmount: number;
  totalDeductions: number;
  averageGrossSalary: number;
  averageNetSalary: number;
  departmentBreakdown: PayrollDepartmentSummary[];
}

export interface PayrollDepartmentSummary {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  totalGrossAmount: number;
  totalNetAmount: number;
  averageSalary: number;
}

export interface Payslip {
  payslipId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  periodName: string;
  payDate: string;
  basicSalary: number;
  allowances: PayrollComponent[];
  deductions: PayrollComponent[];
  grossSalary: number;
  taxAmount: number;
  netSalary: number;
  currency: string;
  companyDetails: CompanyDetails;
  employeeDetails: EmployeePayrollDetails;
}

export interface PayrollComponent {
  name: string;
  amount: number;
  type: 'allowance' | 'deduction';
  isTaxable: boolean;
}

export interface CompanyDetails {
  name: string;
  address: string;
  taxId: string;
  logo?: string;
}

export interface EmployeePayrollDetails {
  employeeId: string;
  fullName: string;
  employeeCode: string;
  department: string;
  position: string;
  bankAccount?: string;
  taxId?: string;
  joinDate: string;
}

export interface PayrollReport {
  periodId: string;
  periodName: string;
  summary: PayrollSummary;
  entries: PayrollEntry[];
  generatedAt: string;
  generatedBy: string;
}

export interface PayrollSearchRequest {
  periodId?: string;
  employeeId?: string;
  departmentId?: string;
  status?: PayrollEntryStatus;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PayrollListResponse {
  entries: PayrollEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface TaxConfiguration {
  taxId: string;
  taxName: string;
  taxType: 'percentage' | 'fixed';
  rate: number;
  minSalary?: number;
  maxSalary?: number;
  isActive: boolean;
}

export interface SalaryComponent {
  componentId: string;
  name: string;
  type: 'allowance' | 'deduction';
  calculationType: 'percentage' | 'fixed';
  value: number;
  isDefault: boolean;
  isTaxable: boolean;
  isActive: boolean;
}

export interface PayrollFilter {
  payrollPeriodId?: string;
  employeeId?: string;
  department?: string;
  status?: PayrollEntryStatus;
  search?: string;
}

export interface PayrollReportFilter {
  payrollPeriodId?: string;
  startDate?: string;
  endDate?: string;
  department?: string;
  status?: PayrollEntryStatus;
}

export interface UpdatePayrollPeriodRequest {
  periodName?: string;
  startDate?: string;
  endDate?: string;
  payDate?: string;
  status?: PayrollStatus;
}

export interface ProcessPayrollRequest {
  payrollPeriodId: string;
  employeeIds?: string[];
  includeAllowances: boolean;
  includeDeductions: boolean;
  includeOvertime: boolean;
}

export interface PayrollCalculationResult {
  entriesCreated: number;
  periodId: string;
  totalEmployees: number;
  totalGrossAmount: number;
  totalTaxAmount: number;
  totalNetAmount: number;
  calculatedAt: string;
}

export interface PayrollProcessingHistory {
  periodId: string;
  periodName: string;
  processedAt: string;
  entriesCreated: number;
  totalGrossAmount: number;
  totalNetAmount: number;
  status: string;
  processedBy: string;
}

export interface SalaryRule {
  ruleId: string;
  name: string;
  description: string;
  componentId: string;
  componentName: string;
  condition: string;
  value: number;
  isActive: boolean;
}

export interface CreateSalaryComponentRequest {
  name: string;
  type: 'allowance' | 'deduction';
  calculationType: 'percentage' | 'fixed';
  value: number;
  isDefault: boolean;
  isTaxable: boolean;
  isActive: boolean;
}

export interface UpdateSalaryComponentRequest {
  name?: string;
  type?: 'allowance' | 'deduction';
  calculationType?: 'percentage' | 'fixed';
  value?: number;
  isDefault?: boolean;
  isTaxable?: boolean;
  isActive?: boolean;
}

export interface CreateSalaryRuleRequest {
  name: string;
  description: string;
  componentId: string;
  condition: string;
  value: number;
  isActive: boolean;
}

export interface UpdateSalaryRuleRequest {
  name?: string;
  description?: string;
  componentId?: string;
  condition?: string;
  value?: number;
  isActive?: boolean;
}