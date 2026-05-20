import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { HolidayService } from '../../services/holiday.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyHoliday, HolidaySummary, CreateCompanyHoliday, UpdateCompanyHoliday } from '../../../../core/models/holiday.models';
import { HolidayCatalogPickerComponent } from '../holiday-catalog-picker/holiday-catalog-picker.component';
import { EmployeeService } from '../../../employee/services/employee.service';
import { Department } from '../../../../core/models/employee.models';

interface TimelineMonth {
  key: string;
  label: string;
  holidays: CompanyHoliday[];
}

@Component({
  selector: 'app-holiday-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatDialogModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatAutocompleteModule,
  ],
  templateUrl: './holiday-management.component.html',
  styleUrl: './holiday-management.component.scss'
})
export class HolidayManagementComponent implements OnInit {
  @ViewChild('holidayFormDialog') holidayFormDialog!: TemplateRef<any>;

  holidays: CompanyHoliday[] = [];
  filteredHolidays: CompanyHoliday[] = [];
  summary: HolidaySummary | null = null;
  loading = false;
  saving = false;

  selectedYear = new Date().getFullYear();
  selectedType = 'all';
  searchQuery = '';
  viewMode: 'table' | 'timeline' = 'table';

  availableYears: number[] = [];
  displayedColumns = ['holidayDate', 'holidayName', 'holidayType', 'isHalfDay', 'applicableTo', 'status', 'actions'];

  holidayForm!: FormGroup;
  editingHoliday: CompanyHoliday | null = null;

  // Department & Employee data for pickers
  departments: Department[] = [];
  allEmployees: { employeeId: string; fullName: string; departmentName?: string }[] = [];
  filteredEmployees: { employeeId: string; fullName: string; departmentName?: string }[] = [];
  selectedEmployeeIds: string[] = [];
  employeeSearchText = '';

  constructor(
    private holidayService: HolidayService,
    private employeeService: EmployeeService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    const currentYear = new Date().getFullYear();
    this.availableYears = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
    this.initForm();
  }

  ngOnInit(): void {
    this.loadData();
    this.loadDepartments();
    this.loadEmployees();
  }

  private initForm(): void {
    this.holidayForm = this.fb.group({
      holidayName: ['', [Validators.required, Validators.maxLength(200)]],
      holidayDate: [null, Validators.required],
      holidayType: ['mandatory', Validators.required],
      description: [''],
      isHalfDay: [false],
      applicableTo: ['all', Validators.required],
      applicableValue: [''],
    });

    // Watch applicableTo changes to manage validation
    this.holidayForm.get('applicableTo')!.valueChanges.subscribe(value => {
      const applicableValueCtrl = this.holidayForm.get('applicableValue')!;
      if (value === 'department' || value === 'location') {
        applicableValueCtrl.setValidators(Validators.required);
      } else {
        applicableValueCtrl.clearValidators();
        applicableValueCtrl.setValue('');
      }
      applicableValueCtrl.updateValueAndValidity();

      // Reset employee selection when switching away
      if (value !== 'employee') {
        this.selectedEmployeeIds = [];
        this.employeeSearchText = '';
      }
    });
  }

  private loadDepartments(): void {
    this.employeeService.getDepartments(undefined, 'active').subscribe({
      next: (depts) => this.departments = depts,
      error: () => {}
    });
  }

  private loadEmployees(): void {
    this.employeeService.getEmployees({ page: 1, pageSize: 500, isActive: true }).subscribe({
      next: (res) => {
        this.allEmployees = (res.employees || []).map(emp => ({
          employeeId: emp.employeeId,
          fullName: `${emp.firstName} ${emp.lastName}`,
          departmentName: emp.departmentName
        }));
        this.filteredEmployees = [...this.allEmployees];
      },
      error: () => {}
    });
  }

  filterEmployees(searchText: string): void {
    this.employeeSearchText = searchText;
    const q = searchText.toLowerCase().trim();
    this.filteredEmployees = q
      ? this.allEmployees.filter(e =>
          e.fullName.toLowerCase().includes(q) ||
          (e.departmentName && e.departmentName.toLowerCase().includes(q))
        )
      : [...this.allEmployees];
  }

  toggleEmployee(employeeId: string): void {
    const idx = this.selectedEmployeeIds.indexOf(employeeId);
    if (idx >= 0) {
      this.selectedEmployeeIds.splice(idx, 1);
    } else {
      this.selectedEmployeeIds.push(employeeId);
    }
  }

  isEmployeeSelected(employeeId: string): boolean {
    return this.selectedEmployeeIds.includes(employeeId);
  }

  getEmployeeName(employeeId: string): string {
    return this.allEmployees.find(e => e.employeeId === employeeId)?.fullName || employeeId;
  }

  removeEmployee(employeeId: string): void {
    this.selectedEmployeeIds = this.selectedEmployeeIds.filter(id => id !== employeeId);
  }

  loadData(): void {
    this.loading = true;

    // Only load holiday list if user has the table/list permission
    if (this.hasPermission('Holiday_Table')) {
      this.holidayService.getCompanyHolidays(this.selectedYear).subscribe({
        next: (holidays) => {
          this.holidays = holidays;
          this.applyFilters();
          this.loading = false;
        },
        error: (err: any) => {
          this.snackBar.open('Failed to load holidays', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
    } else {
      // If user is not allowed to view the holiday list, clear data and stop loading
      this.holidays = [];
      this.filteredHolidays = [];
      this.loading = false;
    }

    // Only fetch summary if user has permission to view it
    // NOTE: fix typo in permission key to match template usage
    if (this.hasPermission('Holiday_Summary')) {
      this.holidayService.getHolidaySummary(this.selectedYear).subscribe({
        next: (summary) => this.summary = summary,
        error: () => {}
      });
    } else {
      this.summary = null;
    }
  }

  onYearChange(): void {
    this.loadData();
  }

  applyFilters(): void {
    let filtered = [...this.holidays];

    if (this.selectedType !== 'all') {
      filtered = filtered.filter(h => h.holidayType === this.selectedType);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(h =>
        h.holidayName.toLowerCase().includes(q) ||
        (h.description && h.description.toLowerCase().includes(q))
      );
    }

    this.filteredHolidays = filtered;
  }

  sortData(sort: Sort): void {
    if (!sort.active || sort.direction === '') {
      this.applyFilters();
      return;
    }

    this.filteredHolidays = [...this.filteredHolidays].sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'holidayDate': return this.compare(new Date(a.holidayDate).getTime(), new Date(b.holidayDate).getTime(), isAsc);
        case 'holidayName': return this.compare(a.holidayName, b.holidayName, isAsc);
        case 'holidayType': return this.compare(a.holidayType, b.holidayType, isAsc);
        default: return 0;
      }
    });
  }

  private compare(a: string | number, b: string | number, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  isPast(dateStr: string): boolean {
    return new Date(dateStr) < new Date(new Date().toDateString());
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Holidays', 'Holiday Management', actionKey);
  }

  // ========================
  // Timeline helpers
  // ========================

  getTimelineMonths(): TimelineMonth[] {
    const months = new Map<string, CompanyHoliday[]>();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    for (const h of this.filteredHolidays) {
      const d = new Date(h.holidayDate);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      if (!months.has(key)) months.set(key, []);
      months.get(key)!.push(h);
    }

    return Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, holidays]) => {
        const [yr, mo] = key.split('-').map(Number);
        return { key, label: `${monthNames[mo]} ${yr}`, holidays };
      });
  }

  // ========================
  // CRUD Dialogs
  // ========================

  openAddHolidayDialog(): void {
    if (!this.hasPermission('add_holidays')) return;

    this.editingHoliday = null;
    this.selectedEmployeeIds = [];
    this.employeeSearchText = '';
    this.holidayForm.reset({
      holidayType: 'mandatory',
      isHalfDay: false,
      applicableTo: 'all',
      applicableValue: ''
    });
    this.dialog.open(this.holidayFormDialog, { width: '500px' });
  }

  openEditHolidayDialog(holiday: CompanyHoliday): void {
    if (!this.hasPermission('edit_holidays_details')) return;

    this.editingHoliday = holiday;
    this.selectedEmployeeIds = holiday.employeeIds ? [...holiday.employeeIds] : [];
    this.employeeSearchText = '';
    this.holidayForm.patchValue({
      holidayName: holiday.holidayName,
      holidayDate: new Date(holiday.holidayDate),
      holidayType: holiday.holidayType,
      description: holiday.description || '',
      isHalfDay: holiday.isHalfDay,
      applicableTo: holiday.applicableTo,
      applicableValue: holiday.applicableValue || '',
    });
    this.dialog.open(this.holidayFormDialog, { width: '500px' });
  }

  saveHoliday(): void {
    if (this.holidayForm.invalid) return;

    // Validate employee selection for 'employee' type
    if (this.holidayForm.value.applicableTo === 'employee' && this.selectedEmployeeIds.length === 0) {
      this.snackBar.open('Please select at least one employee', 'Close', { duration: 3000 });
      return;
    }

    this.saving = true;
    const formVal = this.holidayForm.value;
    const date = formVal.holidayDate instanceof Date ? formVal.holidayDate : new Date(formVal.holidayDate);

    if (this.editingHoliday) {
      if (!this.hasPermission('edit_holidays_details')) return;
      const dto: UpdateCompanyHoliday = {
        holidayName: formVal.holidayName,
        holidayDate: date.toISOString(),
        holidayType: formVal.holidayType,
        description: formVal.description || undefined,
        isHalfDay: formVal.isHalfDay,
        applicableTo: formVal.applicableTo,
        applicableValue: formVal.applicableTo !== 'all' && formVal.applicableTo !== 'employee'
          ? formVal.applicableValue : undefined,
        employeeIds: formVal.applicableTo === 'employee' ? this.selectedEmployeeIds : undefined,
        isActive: true
      };
      this.holidayService.updateCompanyHoliday(this.editingHoliday.holidayId, dto).subscribe({
        next: () => {
          this.saving = false;
          this.dialog.closeAll();
          this.snackBar.open('Holiday updated successfully', 'Close', { duration: 3000 });
          this.loadData();
        },
        error: (err: any) => {
          this.saving = false;
          this.snackBar.open(err.error?.message || 'Failed to update holiday', 'Close', { duration: 3000 });
        }
      });
    } else {
      if (!this.hasPermission('add_holidays')) return;
      const dto: CreateCompanyHoliday = {
        holidayName: formVal.holidayName,
        holidayDate: date.toISOString(),
        holidayType: formVal.holidayType,
        description: formVal.description || undefined,
        isHalfDay: formVal.isHalfDay,
        applicableTo: formVal.applicableTo,
        applicableValue: formVal.applicableTo !== 'all' && formVal.applicableTo !== 'employee'
          ? formVal.applicableValue : undefined,
        employeeIds: formVal.applicableTo === 'employee' ? this.selectedEmployeeIds : undefined,
      };
      this.holidayService.createCompanyHoliday(dto).subscribe({
        next: () => {
          this.saving = false;
          this.dialog.closeAll();
          this.snackBar.open('Holiday created successfully', 'Close', { duration: 3000 });
          this.loadData();
        },
        error: (err: any) => {
          this.saving = false;
          this.snackBar.open(err.error?.message || 'Failed to create holiday', 'Close', { duration: 3000 });
        }
      });
    }
  }

  confirmDelete(holiday: CompanyHoliday): void {
    if (!this.hasPermission('delete_holidays_details')) return;

    if (confirm(`Are you sure you want to delete "${holiday.holidayName}"?`)) {
      this.holidayService.deleteCompanyHoliday(holiday.holidayId).subscribe({
        next: () => {
          this.snackBar.open('Holiday deleted', 'Close', { duration: 3000 });
          this.loadData();
        },
        error: () => {
          this.snackBar.open('Failed to delete holiday', 'Close', { duration: 3000 });
        }
      });
    }
  }

  // ========================
  // Import Dialog
  // ========================

  openImportDialog(): void {
    if (!this.hasPermission('import_holidays_from_catalog')) return;

    const dialogRef = this.dialog.open(HolidayCatalogPickerComponent, {
      width: '800px',
      maxHeight: '85vh',
      data: { year: this.selectedYear }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.imported) {
        this.snackBar.open(result.message || 'Holidays imported successfully', 'Close', { duration: 3000 });
        this.loadData();
      }
    });
  }
}
