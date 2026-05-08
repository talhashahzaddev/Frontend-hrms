import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy,
  ChangeDetectorRef, HostListener, ElementRef, Inject, Optional
} from '@angular/core';
import {
  FormBuilder, FormGroup, Validators,
  ReactiveFormsModule, AbstractControl
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { HelpDeskService } from '../../services/help-desk.services';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { Department } from '@/app/core/models/employee.models';
import { TicketGroup, CategoryDto } from '@/app/core/models/helpdesk.models';
import { NotificationService } from '@/app/core/services/notification.service';

@Component({
  selector: 'app-create-agent-group-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-agent-group-dialog.component.html',
  styleUrls: ['./create-agent-group-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateAgentGroupDialogComponent implements OnInit, OnDestroy {

  groupForm: FormGroup;
  departments: Department[] = [];
  employees: { id: string; name: string; code?: string }[] = [];
  categories: CategoryDto[] = [];

  loading = false;
  submitted = false;
  isEditMode = false;
  editGroup: TicketGroup | null = null;

  employeeDropdownOpen = false;
  employeeFilter = '';
  categoryDropdownOpen = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private helpDeskService: HelpDeskService,
    private employeeService: EmployeeService,
    private dialogRef: MatDialogRef<CreateAgentGroupDialogComponent>,
    private cdr: ChangeDetectorRef,
    private notification: NotificationService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: { group: TicketGroup }
  ) {
    this.groupForm = this.fb.group({
      groupTitle: ['', Validators.required],
      departmentId: [''],
      categoryId: [''],
      employeeIds: [[], this.atLeastOneSelected]
    });
  }

  ngOnInit(): void {
    this.loadDepartments();
    this.loadEmployees();
    this.loadCategories();
    this.setupDepartmentFilter();

    // If data is provided, we're in edit mode
    if (this.data?.group) {
      this.isEditMode = true;
      this.editGroup = this.data.group;
      this.populateFormForEdit();
    }
  }

  private populateFormForEdit(): void {
    if (!this.editGroup) return;

    // Parse employee IDs from employeeNames or use existing employeeIds if available
    let employeeIds: string[] = [];
    if (this.editGroup.employeeIds && Array.isArray(this.editGroup.employeeIds)) {
      employeeIds = this.editGroup.employeeIds;
    } else if (this.editGroup.employeeNames) {
      // If employeeNames is a string, try to parse it
      const namesValue = this.editGroup.employeeNames as any;
      const names: string[] = typeof namesValue === 'string'
        ? namesValue.split(',').map((n: string) => n.trim())
        : Array.isArray(namesValue) ? namesValue : [];
      
      // Match employee names to IDs
      employeeIds = this.employees
        .filter((emp: any) => names.some((name: string) => emp.name.includes(name) || name.includes(emp.name)))
        .map((emp: any) => emp.id);
    }

    this.groupForm.patchValue({
      groupTitle: this.editGroup.groupTitle || '',
      departmentId: this.editGroup.departmentId || '',
      categoryId: this.editGroup.categoryId || '',
      employeeIds: employeeIds
    });

    this.cdr.markForCheck();
  }

  // ───────── Dropdown ─────────

  toggleCategoryDropdown(event?: MouseEvent): void {
    event?.stopPropagation();
    this.categoryDropdownOpen = !this.categoryDropdownOpen;
    this.cdr.markForCheck();
  }

  openCategoryDropdown(): void {
    this.categoryDropdownOpen = true;
  }

  closeCategoryDropdown(): void {
    this.categoryDropdownOpen = false;
    this.cdr.markForCheck();
  }

  toggleEmployeeDropdown(event?: MouseEvent): void {
    event?.stopPropagation();
    this.employeeDropdownOpen = !this.employeeDropdownOpen;
    this.employeeFilter = '';
    this.cdr.markForCheck();
  }

  openEmployeeDropdown(): void {
    this.employeeDropdownOpen = true;
  }

  closeEmployeeDropdown(): void {
    this.employeeDropdownOpen = false;
    this.employeeFilter = '';
    this.cdr.markForCheck();
  }

  onEmployeeSearch(value: string): void {
    this.employeeFilter = value;
  }

  // ───────── Outside Click ─────────

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const insideEmployee =
      target.closest('[data-dropdown="employee"]');
    const insideCategory =
      target.closest('[data-dropdown="category"]');

    if (!insideEmployee && this.employeeDropdownOpen) {
      this.closeEmployeeDropdown();
    }
    if (!insideCategory && this.categoryDropdownOpen) {
      this.closeCategoryDropdown();
    }
  }

  // ───────── Selection ─────────

  selectCategory(categoryId: string): void {
    this.groupForm.get('categoryId')?.setValue(categoryId);
    this.closeCategoryDropdown();
    this.cdr.markForCheck();
  }

  getSelectedCategoryName(): string {
    const categoryId = this.groupForm.get('categoryId')?.value;
    if (!categoryId) return '';
    const category = this.categories.find(c => c.categoryId === categoryId);
    return category?.categoryName || '';
  }

  get getCategoryDisplay(): string {
    return this.getSelectedCategoryName() || 'Select category';
  }

  toggleEmployee(emp: { id: string; name: string }): void {
    const control = this.groupForm.get('employeeIds');
    const current: string[] = control?.value || [];

    const updated = current.includes(emp.id)
      ? current.filter(id => id !== emp.id)
      : [...current, emp.id];

    control?.setValue(updated);
    this.cdr.markForCheck();
  }

  isEmployeeSelected(id: string): boolean {
    return (this.groupForm.get('employeeIds')?.value || []).includes(id);
  }

  toggleSelectAll(): void {
    const control = this.groupForm.get('employeeIds');
    const visible = this.filteredEmployees.map(e => e.id);
    const current: string[] = control?.value || [];

    const allSelected = visible.every(id => current.includes(id));

    control?.setValue(
      allSelected
        ? current.filter(id => !visible.includes(id))
        : [...new Set([...current, ...visible])]
    );

    this.cdr.markForCheck();
  }

  isAllVisibleSelected(): boolean {
    const selected = this.groupForm.get('employeeIds')?.value || [];
    const visible = this.filteredEmployees;
    return visible.length > 0 && visible.every(e => selected.includes(e.id));
  }

  getSelectedEmployeeNames(): string {
    const selectedIds = this.groupForm.get('employeeIds')?.value || [];
    const selectedNames = this.employees
      .filter(emp => selectedIds.includes(emp.id))
      .map(emp => emp.name)
      .join(', ');
    const count = selectedIds.length;
    return selectedNames ? `${selectedNames} (${count} selected)` : 'No employees selected';
  }

  get filteredEmployees() {
    const q = this.employeeFilter.toLowerCase().trim();
    return !q
      ? this.employees
      : this.employees.filter(e =>
          e.name.toLowerCase().includes(q) ||
          (e.code || '').toLowerCase().includes(q)
        );
  }

  get filteredCategories() {
    return this.categories.filter(cat => cat.status === true);
  }

  // ───────── API ─────────

  private setupDepartmentFilter(): void {
    // Department filter removed - categories are now independent of department
  }

  loadDepartments(): void {
    this.employeeService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.departments = res || [];
        this.cdr.markForCheck();
      });
  }

  loadEmployees(): void {
    this.employeeService.getEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        const list = res?.employees || res || [];
        this.employees = list.map((e: any) => ({
          id: e.employeeId,
          name: e.fullName,
          code: e.employeeCode
        }));
        this.cdr.markForCheck();
      });
  }

  loadCategories(): void {
    this.helpDeskService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.categories = res || [];
        this.cdr.markForCheck();
      });
  }

  // ───────── Submit ─────────

  submit(): void {
    this.submitted = true;
    if (this.groupForm.invalid) return;

    this.loading = true;

    if (this.isEditMode && this.editGroup) {
      // Call update endpoint
      const updateRequest = {
        groupId: this.editGroup.groupId,
        ...this.groupForm.value
      };
      this.helpDeskService.updateGroup(updateRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notification.showSuccess('Group updated successfully');
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.notification.showError(err?.message || 'Failed to update group');
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
    } else {
      // Call create endpoint
      this.helpDeskService.createGroup(this.groupForm.value)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notification.showSuccess('Group created successfully');
            this.dialogRef.close(true);
          },
          error: (err) => {
            this.notification.showError(err?.message || 'Failed to create group');
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  closeOnBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('cg-overlay')) {
      this.dialogRef.close(false);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private atLeastOneSelected(control: AbstractControl) {
    return control.value?.length ? null : { required: true };
  }
}