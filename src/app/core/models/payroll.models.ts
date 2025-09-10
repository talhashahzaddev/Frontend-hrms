export interface PayrollEntry {
  payrollEntryId: string;
  employeeId: string;
  payrollPeriodId: string;
  basicSalary: number;
  allowances: number;
  overtimePay: number;
  bonuses: number;
  deductions: number;
  taxDeductions: number;
  netPay: number;
  status: PayrollStatus;
  processedDate?: string;
  processedBy?: string;
  paidDate?: string;
  
  // Related data
  employee?: {
    employeeId: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    department?: string;
  };
  payrollPeriod?: PayrollPeriod;
}

export interface PayrollPeriod {
  payrollPeriodId: string;
  name: string;
  startDate: string;
  endDate: string;
  cutoffDate: string;
  payDate: string;
  status: PayrollPeriodStatus;
  totalEmployees: number;
  totalAmount: number;
  createdAt: string;
}

export enum PayrollStatus {
  DRAFT = 'draft',
  PROCESSED = 'processed',
  APPROVED = 'approved',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

export enum PayrollPeriodStatus {
  OPEN = 'open',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CLOSED = 'closed'
}

export interface PayrollSummary {
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  averageSalary: number;
  payrollPeriod: PayrollPeriod;
}

export interface PayslipData {
  employeeInfo: {
    employeeNumber: string;
    fullName: string;
    department: string;
    position: string;
    joinDate: string;
  };
  payrollPeriod: {
    periodName: string;
    startDate: string;
    endDate: string;
    payDate: string;
  };
  earnings: {
    basicSalary: number;
    allowances: PayrollComponent[];
    overtime: number;
    bonuses: PayrollComponent[];
    totalEarnings: number;
  };
  deductions: {
    taxDeductions: PayrollComponent[];
    otherDeductions: PayrollComponent[];
    totalDeductions: number;
  };
  netPay: number;
  ytdSummary: {
    grossPay: number;
    deductions: number;
    netPay: number;
  };
}

export interface PayrollComponent {
  name: string;
  amount: number;
  isPercentage?: boolean;
  percentage?: number;
}

// DTOs for API requests
export interface CreatePayrollPeriodRequest {
  name: string;
  startDate: string;
  endDate: string;
  cutoffDate: string;
  payDate: string;
}

export interface ProcessPayrollRequest {
  payrollPeriodId: string;
  employeeIds?: string[];
}

export interface PayrollSearchRequest {
  employeeId?: string;
  departmentId?: string;
  payrollPeriodId?: string;
  status?: PayrollStatus;
  startDate?: string;
  endDate?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PayrollListResponse {
  payrollEntries: PayrollEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PayrollStatistics {
  currentPeriod: PayrollSummary;
  monthlyTrends: {
    month: string;
    totalPaid: number;
    employeeCount: number;
  }[];
  departmentWise: {
    department: string;
    totalAmount: number;
    employeeCount: number;
    averageSalary: number;
  }[];
  topEarners: {
    employeeName: string;
    department: string;
    grossPay: number;
  }[];
}