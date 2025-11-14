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
import { CreateSkillDialogComponent } from './create-skill-dialog.component';
import { AddEmployeeSkillDialogComponent } from './add-employee-skill-dialog.component';
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
    MatTooltipModule
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
  
  // Table
  skillDisplayedColumns: string[] = ['category', 'skillName', 'levelScale', 'status', 'actions'];
  displayedColumns: string[] = ['skillName', 'proficiencyLevel', 'assessorName', 'lastAssessed', 'actions'];
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
      this.selectedTab = 0; // Show skill sets for HR
    } else {
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

  loadEmployeeSkills(employeeId: string) {
    this.isLoadingEmployeeSkills = true;
    this.performanceService.getEmployeeSkillsByEmployee(employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.employeeSkills = response.data;
            this.applyEmployeeSkillFilters();
            this.totalItems = response.data.length;
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

  onEmployeeChange(employeeId: string) {
    if (employeeId) {
      this.loadEmployeeSkills(employeeId);
    } else {
      this.employeeSkills = [];
      this.applyEmployeeSkillFilters();
    }
  }

  onEmployeeFilterChange(employeeId: string) {
    if (employeeId) {
      this.loadEmployeeSkills(employeeId);
    } else {
      this.employeeSkills = [];
      this.applyEmployeeSkillFilters();
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
    let filtered = [...this.employeeSkills];

    // Employee filter (handled separately via onEmployeeFilterChange)
    if (filterValue.employeeId) {
      filtered = filtered.filter(skill => skill.employeeId === filterValue.employeeId);
    }

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
      filtered = filtered.filter(skill => skill.proficiencyLevel === filterValue.proficiencyLevel);
    }

    this.filteredEmployeeSkills = filtered;
    this.filteredEmployeeSkillsDataSource.data = filtered;
    this.totalItems = filtered.length;
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

  editEmployeeSkill(skill: EmployeeSkill): void {
    // TODO: Open edit dialog
    this.notificationService.showInfo('Edit Employee Skill dialog will be implemented');
  }

  openAddEmployeeSkillDialog(): void {
    const currentUser = this.authService.getCurrentUserValue();
    const defaultEmployeeId = this.hasHRRole() ? undefined : currentUser?.userId;

    const dialogRef = this.dialog.open(AddEmployeeSkillDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: {
        employees: this.employees,
        skills: this.skills.filter(s => s.isActive),
        defaultEmployeeId: defaultEmployeeId
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.createEmployeeSkill(result);
        }
      });
  }

  private createEmployeeSkill(request: CreateEmployeeSkillRequest): void {
    this.performanceService.createEmployeeSkill(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess('Employee skill added successfully');
            if (request.employeeId) {
              this.loadEmployeeSkills(request.employeeId);
            } else {
              this.loadCurrentUserSkills();
            }
            this.cdr.markForCheck();
          } else {
            this.notificationService.showError(response.message || 'Failed to add employee skill');
          }
        },
        error: (error) => {
          console.error('Error creating employee skill:', error);
          this.notificationService.showError('Failed to add employee skill');
        }
      });
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
  }
}