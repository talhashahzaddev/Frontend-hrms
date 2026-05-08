import { Component, OnInit, HostListener, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HelpDeskService } from '../../services/help-desk.services';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { Department } from '@/app/core/models/employee.models';
import { catchError, of } from 'rxjs';
import { AssignTicketRequest } from '@/app/core/models/helpdesk.models';

interface Employee {
  employeeId: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  employeeCode?: string;
  departmentName?: string;
  departmentId?: string;
}

@Component({
  selector: 'app-invlove-employee-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './invlove-employee-dialog.component.html',
  styleUrls: ['./invlove-employee-dialog.component.scss'],
})
export class InvloveEmployeeDialogComponent implements OnInit {
  involveEmployeeForm!: FormGroup;
  departmentControl = new FormControl('');
// track assigned group
assignedGroupId: string | null = null;
assignedGroupName: string | null = null;
  departments: Department[] = [];
  groups: { id: string; name: string }[] = [];
  allEmployees: Employee[] = [];
  filteredEmployees: Employee[] = [];

  employeeDropdownOpen = false;
  employeeFilter = '';
  selectedEmployeeIds: string[] = [];

  submitted = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InvloveEmployeeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { ticketId: string; groupId?: string | null },
    private helpDeskService: HelpDeskService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.assignedGroupId = this.data?.groupId ?? null;
    // Pre-initialize assignedGroupName to trigger immediate loading UI
    this.assignedGroupName = null;
    this.loadInitialData();
    this.setupDepartmentFilter();
  }

  // -----------------------------
  // INITIALIZE FORM
  // -----------------------------
  private initForm(): void {
    this.involveEmployeeForm = this.fb.group({
      groupId: [''],
      SelectedEmployees: [[]],
      reason: ['']
    });
  }

  // -----------------------------
  // LOAD DEPARTMENTS, GROUPS, EMPLOYEES
  // -----------------------------
  private loadInitialData(): void {
    // Departments
    this.employeeService.getDepartments().pipe(
      catchError(() => of([]))
    ).subscribe(depts => this.departments = depts || []);

    // Employees
    this.employeeService.getEmployees().pipe(
      catchError(() => of([]))
    ).subscribe((res: any) => {
      const list = res?.employees || res || [];
      this.allEmployees = list.map((e: any) => ({
        employeeId: String(e.employeeId),
        fullName: e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim(),
        firstName: e.firstName,
        lastName: e.lastName,
        employeeCode: e.employeeCode || '',
        departmentId: e.departmentId || '',
        departmentName: e.departmentName || ''
      }));
      this.filterEmployeesByDepartment();
    });

    // Groups
    this.helpDeskService.getAllGroups().pipe(
      catchError(() => of([]))
    ).subscribe((res: any) => {
      const groups = res?.data || res || [];
      this.groups = groups.map((g: any) => ({
        id: String(g.groupId ?? g.id ?? ''),
        name: g.groupTitle || g.name || ''
      }));
      if (this.assignedGroupId) {
        this.assignedGroupName = this.groups.find(g => g.id === String(this.assignedGroupId))?.name || null;
        this.involveEmployeeForm.patchValue({ groupId: this.assignedGroupId });
      }
    });
  }

  // -----------------------------
  // DEPARTMENT FILTER
  // -----------------------------
  private setupDepartmentFilter(): void {
    this.departmentControl.valueChanges.subscribe(() => {
      this.filterEmployeesByDepartment();
      this.clearAllEmployees();
    });
  }

  

  private filterEmployeesByDepartment(): void {
    const deptId = this.departmentControl.value;
    this.filteredEmployees = !deptId
      ? [...this.allEmployees]
      : this.allEmployees.filter(emp => emp.departmentId === deptId);
  }

  // -----------------------------
  // EMPLOYEE DROPDOWN METHODS
  // -----------------------------
  openEmployeeDropdown(): void {
    this.employeeDropdownOpen = true;
  }

  closeEmployeeDropdown(): void {
    this.employeeDropdownOpen = false;
    this.employeeFilter = '';
  }

  onEmployeeSearch(value: string): void {
    this.employeeFilter = value;
  }

  toggleEmployee(emp: Employee): void {
    const index = this.selectedEmployeeIds.indexOf(emp.employeeId);
    if (index > -1) this.selectedEmployeeIds.splice(index, 1);
    else this.selectedEmployeeIds.push(emp.employeeId);

    this.involveEmployeeForm.patchValue({ SelectedEmployees: this.selectedEmployeeIds });
  }

  isEmployeeSelected(id: string): boolean {
    return this.selectedEmployeeIds.includes(id);
  }

  toggleSelectAll(): void {
    const visibleIds = this.getFilteredEmployeesList().map(e => e.employeeId);
    const allSelected = visibleIds.every(id => this.selectedEmployeeIds.includes(id));

    if (allSelected) this.selectedEmployeeIds = this.selectedEmployeeIds.filter(id => !visibleIds.includes(id));
    else this.selectedEmployeeIds = [...new Set([...this.selectedEmployeeIds, ...visibleIds])];

    this.involveEmployeeForm.patchValue({ SelectedEmployees: this.selectedEmployeeIds });
  }

  isAllVisibleSelected(): boolean {
    const visible = this.getFilteredEmployeesList();
    return visible.length > 0 && visible.every(e => this.selectedEmployeeIds.includes(e.employeeId));
  }

  getFilteredEmployeesList(): Employee[] {
    const q = this.employeeFilter.toLowerCase().trim();
    return !q ? this.filteredEmployees : this.filteredEmployees.filter(e =>
      e.fullName.toLowerCase().includes(q) || (e.employeeCode || '').toLowerCase().includes(q)
    );
  }

  clearAllEmployees(): void {
    this.selectedEmployeeIds = [];
    this.involveEmployeeForm.patchValue({ SelectedEmployees: [] });
  }

  // -----------------------------
  // AVATAR HELPERS
  // -----------------------------
  getInitials(emp: Employee): string {
    const first = emp.firstName || emp.fullName.split(' ')[0] || '';
    const last = emp.lastName || emp.fullName.split(' ')[1] || '';
    return (first.charAt(0) + last.charAt(0)).toUpperCase() || '??';
  }

  getAvatarBg(emp: Employee): string {
    const colors = ['#6C5CE7', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    const index = (emp.employeeId.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  }

  getAvatarColor(emp: Employee): string {
    return '#FFFFFF';
  }

  displayName(emp: Employee): string {
    return emp.fullName || 'Unknown';
  }

  getSelectedEmployeeNames(): string {
    const selectedIds = this.selectedEmployeeIds;
    const selectedNames = this.allEmployees
      .filter(emp => selectedIds.includes(emp.employeeId))
      .map(emp => emp.fullName)
      .join(', ');
    const count = selectedIds.length;
    return selectedNames ? `${selectedNames} (${count} selected)` : 'No employees selected';
  }

  // -----------------------------
  // CLOSE DROPDOWN ON OUTSIDE CLICK
  // -----------------------------
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.employeeDropdownOpen) return;
    const target = event.target as HTMLElement;
    const inside = target.closest('.employee-dropdown-container');
    if (!inside) this.closeEmployeeDropdown();
  }

  // -----------------------------
// FORM SUBMISSION
// -----------------------------
onSubmit(): void {
  this.submitted = true;

  if (this.involveEmployeeForm.invalid) return;

  this.isSubmitting = true;

  const formValue = this.involveEmployeeForm.value;

  const request: AssignTicketRequest = {
    ticketId: this.data.ticketId,
    groupId: formValue.groupId || null,
    assignedEmployees: formValue.SelectedEmployees.length ? formValue.SelectedEmployees : null,
    reason: formValue.reason || ''
  };

  this.helpDeskService.assignTicket(request).subscribe({
    next: (res) => {
      console.log('Ticket assigned successfully:', res);
      this.isSubmitting = false;
      // Return a structured result so the opener can update its state
      this.dialogRef.close({ assignedEmployees: request.assignedEmployees, groupId: request.groupId });
    },
    error: (err) => {
      console.error('Error assigning ticket:', err);
      this.isSubmitting = false;
    }
  });
}

}