// import { Component, OnInit } from '@angular/core';
// import { PerformanceService } from '../../services/performance.service';
// import { SkillSet } from '../../../../core/models/performance.models';

// import { CommonModule } from '@angular/common';

// @Component({
//   selector: 'app-skill-matrix',
//   imports: [CommonModule],
//   templateUrl: './skill-matrix.component.html',
//   styleUrl: './skill-matrix.component.scss'
// })
// export class SkillMatrixComponent implements OnInit {
//   skills: SkillSet[] = [];
//   groupedSkills: { [category: string]: SkillSet[] } = {};
//   loading = true;

//   constructor(private performanceService: PerformanceService) {}

//   ngOnInit() {
//     this.performanceService.getSkillsMatrix().subscribe(res => {
//       this.skills = (res.data || []).map((skill: any) => ({
//         skillId: skill.skillId,
//         skillName: skill.skillName,
//         category: skill.category,
//         description: skill.description,
//         skillLevelScale: skill.skillLevelScale,
//         isActive: skill.isActive,
//         createdAt: skill.createdAt
//       }));
//       this.groupedSkills = this.groupByCategory(this.skills);
//       this.loading = false;
//     });
//   }

//   groupByCategory(skills: SkillSet[]): { [category: string]: SkillSet[] } {
//     return skills.reduce((acc, skill) => {
//       if (!acc[skill.category]) acc[skill.category] = [];
//       acc[skill.category].push(skill);
//       return acc;
//     }, {} as { [category: string]: SkillSet[] });
//   }
// }

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { PerformanceService } from '../../services/performance.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { 
  FormsModule, 
  ReactiveFormsModule, 
  FormBuilder, 
  FormGroup, 
  Validators 
} from '@angular/forms';
import { 
  CreateSkillSetRequest, 
  SkillSet,
  EmployeeSkill,
  CreateEmployeeSkillRequest,
  UpdateEmployeeSkillRequest
} from 'src/app/core/models/performance.models';
import { Employee } from '../../../../core/models/employee.models';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { CreateSkillDialogComponent } from './create-skill-dialog.component';
import { AddEmployeeSkillDialogComponent } from './add-employee-skill-dialog.component';
import { RateEmployeeSkillDialogComponent } from './rate-employee-skill-dialog.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-skill-matrix',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatMenuModule,
    MatDialogModule,
    MatTooltipModule,
    MatButtonToggleModule
  ],
  templateUrl: './skill-matrix.component.html',
  styleUrl: './skill-matrix.component.scss'
})
export class SkillMatrixComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Skill Sets
  skills: SkillSet[] = [];
  filteredSkills: SkillSet[] = [];
  groupedSkills: { [category: string]: SkillSet[] } = {};
  groupedSkillsDataSource = new MatTableDataSource<any>([]);
  categories: string[] = [];
  loading = true;
  
  // Employee Skills
  employeeSkills: EmployeeSkill[] = [];
  filteredEmployeeSkills: EmployeeSkill[] = [];
  filteredEmployeeSkillsDataSource = new MatTableDataSource<EmployeeSkill>([]);
  employees: Employee[] = [];
  selectedEmployeeId: string = '';
  
  // Forms
  skillFilterForm: FormGroup;
  employeeSkillFilterForm: FormGroup;
  
  // UI State
  selectedTab = 0;
  isLoadingEmployeeSkills = false;
  managerViewMode: 'my-skills' | 'team-skills' = 'team-skills'; // For managers: view own skills or team skills
  
  // Table
  skillDisplayedColumns: string[] = ['category', 'skillName', 'levelScale', 'status', 'actions'];
  displayedColumns: string[] = ['employeeName', 'skillName', 'proficiencyLevel', 'assessorName', 'lastAssessed', 'actions'];
  
  // Get displayed columns for employee skills table (exclude actions for managers viewing own skills)
  get employeeSkillsDisplayedColumns(): string[] {
    if (this.isOnlyManager() && this.managerViewMode === 'my-skills') {
      // Managers viewing their own skills - no actions column
      return ['employeeName', 'skillName', 'proficiencyLevel', 'assessorName', 'lastAssessed'];
    }
    // Employees or managers viewing team skills - include actions
    return this.displayedColumns;
  }
  
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;

  constructor(
    private performanceService: PerformanceService,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {
    this.skillFilterForm = this.fb.group({
      search: [''],
      category: [''],
      status: ['']
    });

    this.employeeSkillFilterForm = this.fb.group({
      employeeId: [''],
      search: [''],
      proficiencyLevel: ['']
    });
  }

  ngOnInit() {
    this.loadSkills();
    this.loadEmployees();
    if (this.hasHRRole()) {
      // For HR Managers, show only Skill Sets tab
      this.selectedTab = 0; // Show Skill Sets tab
    } else if (this.isOnlyManager()) {
      // For managers only (not HR Managers), show employee skills tab
      this.selectedTab = 1; // Show employee skills for managers
      this.loadEmployeeSkills(); // Load team employee skills
    } else {
      // For employees, show employee skills tab
      this.selectedTab = 1; // Show employee skills for employees
      this.loadCurrentUserSkills();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSkills() {
    this.loading = true;
    this.performanceService.getSkillsMatrix()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.skills = (res.data || []).map((skill: any) => ({
            skillId: skill.skillId,
            skillName: skill.skillName,
            category: skill.category,
            description: skill.description,
            skillLevelScale: skill.skillLevelScale,
            isActive: skill.isActive,
            createdAt: skill.createdAt
          }));
          this.categories = [...new Set(this.skills.map(s => s.category || 'Uncategorized'))];
          this.applySkillFilters();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading skills:', error);
          this.notificationService.showError('Failed to load skills');
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadEmployees() {
    this.employeeService.getEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.employees = res.employees || [];
        },
        error: () => {
          this.notificationService.showError('Failed to load employees');
        }
      });
  }

  loadCurrentUserSkills() {
    const currentUser = this.authService.getCurrentUserValue();
    if (currentUser?.userId) {
      this.loadEmployeeSkills(currentUser.userId);
    }
  }

  loadEmployeeSkills(employeeId?: string) {
    // Prevent concurrent API calls
    if (this.isLoadingEmployeeSkills) {
      return;
    }
    
    this.isLoadingEmployeeSkills = true;
    
    // If Manager role (not HR Manager), check view mode
    // If HR Manager role, load all employee skills
    // Otherwise load current user's skills
    if (this.isOnlyManager()) {
      // For managers, check if viewing own skills or team skills
      if (this.managerViewMode === 'my-skills') {
        // Load manager's own skills
        const currentUser = this.authService.getCurrentUserValue();
        if (currentUser?.userId) {
          const filterValue = this.employeeSkillFilterForm.value;
          this.performanceService.getEmployeeSkillsByEmployee(currentUser.userId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                if (response.success && response.data) {
                  this.employeeSkills = response.data || [];
                  this.totalItems = this.employeeSkills.length;
                  // Apply filters
                  this.applyEmployeeSkillFilters();
                }
                this.isLoadingEmployeeSkills = false;
                this.cdr.markForCheck();
              },
              error: (error) => {
                console.error('Error loading manager skills:', error);
                this.notificationService.showError('Failed to load your skills');
                this.isLoadingEmployeeSkills = false;
                this.cdr.markForCheck();
              }
            });
        } else {
          this.isLoadingEmployeeSkills = false;
        }
      } else {
        // Load team employee skills
        const filterValue = this.employeeSkillFilterForm.value;
        this.performanceService.getMyTeamEmployeeSkills(
          {
            employeeId: employeeId || filterValue.employeeId || undefined,
            search: filterValue.search || undefined,
            proficiencyLevel: filterValue.proficiencyLevel || undefined
          },
          this.pageIndex + 1,
          this.pageSize
        )
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success && response.data) {
                const paginatedData = response.data as any;
                this.employeeSkills = paginatedData.items || paginatedData.data || [];
                this.totalItems = paginatedData.totalCount || paginatedData.total || 0;
                // Update data source directly - don't call applyEmployeeSkillFilters() to avoid infinite loop
                this.filteredEmployeeSkills = this.employeeSkills;
                this.filteredEmployeeSkillsDataSource.data = this.employeeSkills;
              }
              this.isLoadingEmployeeSkills = false;
              this.cdr.markForCheck();
            },
            error: (error) => {
              console.error('Error loading employee skills:', error);
              this.notificationService.showError('Failed to load employee skills');
              this.isLoadingEmployeeSkills = false;
              this.cdr.markForCheck();
            }
          });
      }
    } else if (this.hasHRRole()) {
      // For HR Managers, load all employee skills
      const filterValue = this.employeeSkillFilterForm.value;
      this.performanceService.getEmployeeSkills(
        {
          employeeId: employeeId || filterValue.employeeId || undefined,
          search: filterValue.search || undefined,
          proficiencyLevel: filterValue.proficiencyLevel || undefined
        },
        this.pageIndex + 1,
        this.pageSize
      )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              const paginatedData = response.data as any;
              this.employeeSkills = paginatedData.items || paginatedData.data || [];
              this.totalItems = paginatedData.totalCount || paginatedData.total || 0;
              // Update data source directly - don't call applyEmployeeSkillFilters() to avoid infinite loop
              this.filteredEmployeeSkills = this.employeeSkills;
              this.filteredEmployeeSkillsDataSource.data = this.employeeSkills;
            }
            this.isLoadingEmployeeSkills = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error loading employee skills:', error);
            this.notificationService.showError('Failed to load employee skills');
            this.isLoadingEmployeeSkills = false;
            this.cdr.markForCheck();
          }
        });
    } else {
      // Employee view - load only their own skills
      const currentUser = this.authService.getCurrentUserValue();
      if (currentUser?.userId) {
        this.performanceService.getEmployeeSkillsByEmployee(currentUser.userId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success && response.data) {
                this.employeeSkills = response.data;
                this.totalItems = response.data.length;
                // Update data source directly - don't call applyEmployeeSkillFilters() to avoid infinite loop
                this.filteredEmployeeSkills = this.employeeSkills;
                this.filteredEmployeeSkillsDataSource.data = this.employeeSkills;
              }
              this.isLoadingEmployeeSkills = false;
              this.cdr.markForCheck();
            },
            error: (error) => {
              console.error('Error loading employee skills:', error);
              this.notificationService.showError('Failed to load employee skills');
              this.isLoadingEmployeeSkills = false;
              this.cdr.markForCheck();
            }
          });
      }
    }
  }

  onEmployeeChange(employeeId: string) {
    if (employeeId) {
      this.loadEmployeeSkills(employeeId);
    } else {
      this.employeeSkills = [];
      this.filteredEmployeeSkills = [];
      this.filteredEmployeeSkillsDataSource.data = [];
      this.totalItems = 0;
    }
  }

  onEmployeeFilterChange(employeeId: string) {
    this.pageIndex = 0; // Reset to first page when changing employee filter
    if (employeeId) {
      this.loadEmployeeSkills(employeeId);
    } else {
      this.loadEmployeeSkills(); // Load all if no employee selected
    }
  }

  groupByCategory(skills: SkillSet[]): { [category: string]: SkillSet[] } {
    return skills.reduce((groups, skill) => {
      const category = skill.category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(skill);
      return groups;
    }, {} as { [category: string]: SkillSet[] });
  }

  applySkillFilters(): void {
    const filterValue = this.skillFilterForm.value;
    let filtered = [...this.skills];

    // Search filter
    if (filterValue.search) {
      const searchLower = filterValue.search.toLowerCase();
      filtered = filtered.filter(skill => 
        skill.skillName.toLowerCase().includes(searchLower) ||
        (skill.category && skill.category.toLowerCase().includes(searchLower)) ||
        (skill.description && skill.description.toLowerCase().includes(searchLower))
      );
    }

    // Category filter
    if (filterValue.category) {
      filtered = filtered.filter(skill => skill.category === filterValue.category);
    }

    // Status filter
    if (filterValue.status) {
      const isActive = filterValue.status === 'active';
      filtered = filtered.filter(skill => skill.isActive === isActive);
    }

    this.filteredSkills = filtered;
    
    // Convert to flat array for table with category info
    const tableData = filtered.map(skill => ({
      ...skill,
      category: skill.category || 'Uncategorized'
    }));
    this.groupedSkillsDataSource.data = tableData;
  }

  clearSkillFilters(): void {
    this.skillFilterForm.reset();
    this.applySkillFilters();
  }

  applyEmployeeSkillFilters(): void {
    const filterValue = this.employeeSkillFilterForm.value;
    
    // If manager viewing team skills or HR Manager, reload from API with filters
    // Otherwise (employee or manager viewing own skills), filter locally
    if (this.hasHRRole() || (this.isOnlyManager() && this.managerViewMode === 'team-skills')) {
      this.pageIndex = 0; // Reset to first page when filtering
      this.loadEmployeeSkills();
    } else {
      // Employee view or manager viewing own skills - filter locally
      let filtered = [...this.employeeSkills];

      // Search filter
      if (filterValue.search) {
        const searchLower = filterValue.search.toLowerCase();
        filtered = filtered.filter(skill => 
          skill.skillName.toLowerCase().includes(searchLower) ||
          (skill.notes && skill.notes.toLowerCase().includes(searchLower))
        );
      }

      // Proficiency level filter
      if (filterValue.proficiencyLevel) {
        filtered = filtered.filter(skill => skill.proficiencyLevel === parseInt(filterValue.proficiencyLevel));
      }

      this.filteredEmployeeSkills = filtered;
      this.filteredEmployeeSkillsDataSource.data = filtered;
      this.totalItems = filtered.length;
    }
  }

  clearEmployeeSkillFilters(): void {
    this.employeeSkillFilterForm.reset();
    this.applyEmployeeSkillFilters();
  }

  openCreateSkillDialog(): void {
    const dialogRef = this.dialog.open(CreateSkillDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: {
        categories: this.categories
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.createSkill(result);
        }
      });
  }

  private createSkill(request: CreateSkillSetRequest): void {
    this.loading = true;
    this.performanceService.createSkillSet(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.notificationService.showSuccess('Skill created successfully');
            this.loadSkills(); // Reload skills
            this.loading = false;
            this.cdr.markForCheck();
          } else {
            this.notificationService.showError(res.message || 'Failed to create skill');
            this.loading = false;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error creating skill:', error);
          this.notificationService.showError('Failed to create skill');
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  editSkill(skill: SkillSet): void {
    // TODO: Open edit dialog
    this.notificationService.showInfo('Edit Skill dialog will be implemented');
  }

  toggleSkillStatus(skill: SkillSet): void {
    // TODO: Implement toggle status
    this.notificationService.showInfo('Toggle skill status will be implemented');
  }

  isSkillAlreadyRated(skill: EmployeeSkill): boolean {
    // Check if skill is already rated (has assessorName and it's not empty)
    // If assessorName exists and is not empty, it means the skill has been rated
    return !!(skill.assessorName && skill.assessorName.trim() !== '');
  }

  rateEmployeeSkill(skill: EmployeeSkill): void {
    // Check if already rated
    if (this.isSkillAlreadyRated(skill)) {
      this.notificationService.showWarning('This skill has already been rated. Cannot rate again.');
      return;
    }

    const dialogRef = this.dialog.open(RateEmployeeSkillDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: {
        employeeId: skill.employeeId,
        employeeName: skill.employeeName || 'Unknown Employee',
        skillId: skill.skillId,
        skillName: skill.skillName,
        employeeSkillId: skill.employeeSkillId,
        currentProficiencyLevel: skill.proficiencyLevel || 0
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result && result.success) {
          this.loadEmployeeSkills(skill.employeeId);
        }
      });
  }

  openAddEmployeeSkillDialog(): void {
    const currentUser = this.authService.getCurrentUserValue();
    const isHRManager = this.hasHRRole();
    const isManager = this.isOnlyManager();
    
    // If manager is viewing their own skills, allow them to add skills to themselves (employee mode)
    // Otherwise, if HR Manager or manager viewing team skills, use manager mode
    let mode: 'employee' | 'manager' = 'employee';
    let defaultEmployeeId: string | undefined = currentUser?.userId;
    
    if (isHRManager || (isManager && this.managerViewMode === 'team-skills')) {
      mode = 'manager';
      defaultEmployeeId = undefined;
    }

    // For employee mode (employees or managers adding to themselves), ensure skills are loaded
    if (mode === 'employee' && currentUser?.userId) {
      // If employee skills haven't been loaded yet, load them first
      if (this.employeeSkills.length === 0 || !this.employeeSkills.some(s => s.employeeId === currentUser.userId)) {
        this.loadCurrentUserSkills();
        // Wait a bit for the skills to load, then open dialog
        setTimeout(() => {
          this.openDialogWithSkills(currentUser.userId, mode, defaultEmployeeId);
        }, 300);
        return;
      }
    }

    this.openDialogWithSkills(currentUser?.userId, mode, defaultEmployeeId);
  }

  onManagerViewModeChange(mode: 'my-skills' | 'team-skills'): void {
    this.managerViewMode = mode;
    this.pageIndex = 0; // Reset pagination
    if (mode === 'my-skills') {
      this.loadEmployeeSkills(); // Load manager's own skills
    } else {
      this.loadEmployeeSkills(); // Load team skills
    }
  }

  private openDialogWithSkills(employeeId?: string, mode: 'employee' | 'manager' = 'employee', defaultEmployeeId?: string): void {
    // For employee mode, get their existing skills to filter out
    const existingEmployeeSkills = mode === 'employee' && employeeId
      ? this.employeeSkills.filter(skill => {
          const skillEmpId = skill.employeeId?.toString().toLowerCase().trim();
          const checkEmpId = employeeId?.toString().toLowerCase().trim();
          return skillEmpId === checkEmpId && skillEmpId !== '';
        })
      : undefined;
    

    const dialogRef = this.dialog.open(AddEmployeeSkillDialogComponent, {
      width: '900px',
      maxWidth: '90vw',
      data: {
        employees: this.employees,
        skills: this.skills.filter(s => s.isActive),
        defaultEmployeeId: defaultEmployeeId,
        mode: mode,
        existingEmployeeSkills: existingEmployeeSkills
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          if (result.mode === 'manager') {
            this.updateEmployeeSkills(result.updates);
          } else {
            this.createEmployeeSkill(result.request);
          }
        }
      });
  }

  private createEmployeeSkill(request: CreateEmployeeSkillRequest): void {
    this.performanceService.createEmployeeSkill(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Only handle success case - all errors go to error handler
          if (response.success) {
            this.notificationService.showSuccess('Employee skill added successfully');
            if (request.employeeId) {
              this.loadEmployeeSkills(request.employeeId);
            } else {
              this.loadCurrentUserSkills();
            }
            this.cdr.markForCheck();
          }
          // Don't show error here - let error handler handle it
        },
        error: (error) => {
          console.error('Error creating employee skill:', error);
          // Check if it's a conflict (duplicate) error
          if (error.status === 409) {
            const errorMessage = error.error?.message || error.error?.error?.message || 'This skill has already been added. Cannot add duplicate skills.';
            this.notificationService.showWarning(errorMessage);
          } else if (error.error?.success === false) {
            // Handle case where backend returns 200 with success: false
            const errorMessage = error.error?.message || 'Failed to add employee skill';
            if (errorMessage.toLowerCase().includes('duplicate') || errorMessage.toLowerCase().includes('already been added') || errorMessage.toLowerCase().includes('already added')) {
              this.notificationService.showWarning(errorMessage);
            } else {
              this.notificationService.showError(errorMessage);
            }
          } else {
            this.notificationService.showError('Failed to add employee skill');
          }
        }
      });
  }

  private updateEmployeeSkills(updates: Array<{ employeeSkillId: string; request: UpdateEmployeeSkillRequest }>): void {
    if (!updates || updates.length === 0) {
      return;
    }

    let completed = 0;
    let failed = 0;
    const total = updates.length;
    let employeeId: string | null = null;

    updates.forEach(({ employeeSkillId, request }) => {
      this.performanceService.updateEmployeeSkill(employeeSkillId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              completed++;
              // Get employeeId from the first response for reloading
              if (!employeeId && response.data) {
                employeeId = response.data.employeeId;
              }
            } else {
              failed++;
            }

            // When all requests are done
            if (completed + failed === total) {
              if (completed > 0) {
                this.notificationService.showSuccess(`Successfully rated ${completed} skill(s)`);
                if (employeeId) {
                  this.loadEmployeeSkills(employeeId);
                }
              }
              if (failed > 0) {
                this.notificationService.showError(`Failed to rate ${failed} skill(s)`);
              }
              this.cdr.markForCheck();
            }
          },
          error: (error) => {
            console.error('Error updating employee skill:', error);
            failed++;
            if (completed + failed === total) {
              if (completed > 0) {
                this.notificationService.showSuccess(`Successfully rated ${completed} skill(s)`);
                if (employeeId) {
                  this.loadEmployeeSkills(employeeId);
                }
              }
              if (failed > 0) {
                this.notificationService.showError(`Failed to rate ${failed} skill(s)`);
              }
              this.cdr.markForCheck();
            }
          }
        });
    });
  }

  hasManagerRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager', 'Manager']);
  }

  isOnlyManager(): boolean {
    const userRole = this.authService.getCurrentUserValue()?.roleName || '';
    return userRole === 'Manager';
  }

  deleteEmployeeSkill(skill: EmployeeSkill) {
    if (confirm(`Are you sure you want to remove this skill from the employee?`)) {
      // Note: Backend might need delete endpoint
      this.notificationService.showInfo('Delete functionality may require backend implementation');
    }
  }

  hasHRRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  getSkillLevelColor(level: number): string {
    if (level >= 4) return 'primary';
    if (level >= 3) return 'accent';
    return 'warn';
  }

  getSkillLevelClass(level: number): string {
    if (level >= 4) return 'level-expert';
    if (level >= 3) return 'level-advanced';
    if (level >= 2) return 'level-intermediate';
    return 'level-beginner';
  }

  getSkillStatusClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadEmployeeSkills(); // Reload with new pagination
  }

  // Helper methods to check if filters are applied
  hasSkillFiltersApplied(): boolean {
    if (!this.skillFilterForm) return false;
    const values = this.skillFilterForm.value;
    return !!(values.search?.trim() || values.category || values.status);
  }

  hasEmployeeSkillFiltersApplied(): boolean {
    if (!this.employeeSkillFilterForm) return false;
    const values = this.employeeSkillFilterForm.value;
    return !!(values.employeeId || values.search?.trim() || values.proficiencyLevel);
  }
}