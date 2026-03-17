// ========================
// Holiday Catalog Models
// ========================

export interface HolidayCatalog {
  catalogId: string;
  countryCode: string;
  countryName: string;
  holidayName: string;
  holidayDate: string;
  isRecurring: boolean;
  description?: string;
}

export interface CatalogCountry {
  countryCode: string;
  countryName: string;
  holidayCount: number;
}

// ========================
// Company Holiday Models
// ========================

export interface CompanyHoliday {
  holidayId: string;
  organizationId: string;
  holidayName: string;
  holidayDate: string;
  holidayType: 'mandatory' | 'restricted' | 'optional';
  description?: string;
  isHalfDay: boolean;
  year: number;
  applicableTo: 'all' | 'department' | 'location' | 'employee';
  applicableValue?: string;
  employeeIds?: string[];
  catalogHolidayId?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCompanyHoliday {
  holidayName: string;
  holidayDate: string;
  holidayType: 'mandatory' | 'restricted' | 'optional';
  description?: string;
  isHalfDay: boolean;
  applicableTo: 'all' | 'department' | 'location' | 'employee';
  applicableValue?: string;
  employeeIds?: string[];
  catalogHolidayId?: string;
}

export interface UpdateCompanyHoliday {
  holidayName: string;
  holidayDate: string;
  holidayType: 'mandatory' | 'restricted' | 'optional';
  description?: string;
  isHalfDay: boolean;
  applicableTo: 'all' | 'department' | 'location' | 'employee';
  applicableValue?: string;
  employeeIds?: string[];
  isActive: boolean;
}

export interface ImportFromCatalog {
  catalogHolidayIds: string[];
  holidayType: 'mandatory' | 'restricted' | 'optional';
  year?: number;
}

// ========================
// Employee Restricted Holiday Models
// ========================

export interface EmployeeRestrictedHoliday {
  id: string;
  employeeId: string;
  companyHolidayId: string;
  holidayName: string;
  holidayDate: string;
  description?: string;
  status: 'selected' | 'cancelled';
  selectedAt: string;
}

export interface SelectRestrictedHoliday {
  companyHolidayId: string;
}

// ========================
// Holiday Range & Summary Models
// ========================

export interface HolidayRange {
  holidayId: string;
  holidayName: string;
  holidayDate: string;
  holidayType: string;
  isHalfDay: boolean;
  description?: string;
  applicableTo?: string;
  applicableValue?: string;
}

export interface HolidaySummary {
  year: number;
  totalHolidays: number;
  mandatoryCount: number;
  restrictedCount: number;
  optionalCount: number;
  upcomingHoliday?: CompanyHoliday;
}

// ========================
// API Response wrapper
// ========================

export interface HolidayApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors?: string[];
}
