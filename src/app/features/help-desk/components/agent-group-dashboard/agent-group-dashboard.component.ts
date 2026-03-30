import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subject, combineLatest, debounceTime, distinctUntilChanged, startWith, takeUntil } from 'rxjs';
import { HelpDeskService } from '../../services/help-desk.services';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { TicketGroup } from '../../../../core/models/helpdesk.models';
import { CreateAgentGroupDialogComponent } from '../create-agent-group-dialog/create-agent-group-dialog.component';

interface Department {
  departmentId: string;
  departmentName: string;
}

@Component({
  selector: 'app-agent-group-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTableModule,
    MatButtonModule,
    MatDialogModule,
    MatMenuModule,
    MatIconModule,
    MatPaginatorModule
  ],
  templateUrl: './agent-group-dashboard.component.html',
  styleUrls: ['./agent-group-dashboard.component.scss'],
})
export class AgentGroupDashboardComponent implements OnInit, OnDestroy {
  groups: TicketGroup[] = [];
  paginatedGroups: TicketGroup[] = [];
  departments: Department[] = [];
  loading = false;

  // Pagination
  pageSize = 7;
  pageIndex = 0;
  totalGroups = 0;
  pageSizeOptions = [7, 10, 25, 50];

  // Reactive controls
  searchControl = new FormControl('');
  departmentControl = new FormControl('');

  private destroy$ = new Subject<void>();

  constructor(
    private helpDeskService: HelpDeskService,
    private employeeService: EmployeeService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.setupFilters();

    // Load all groups initially
    const deptId = this.departmentControl.value || undefined;
    this.getGroups(this.searchControl.value || '', deptId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilters(): void {
    combineLatest([
      this.searchControl.valueChanges.pipe(startWith(this.searchControl.value || '')),
      this.departmentControl.valueChanges.pipe(startWith(this.departmentControl.value || ''))
    ])
    .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
    .subscribe(([search, dept]) => {
      const departmentId = dept || undefined;
      this.pageIndex = 0; // Reset to first page on filter change
      this.getGroups(search || '', departmentId);
    });
  }

  getGroups(search: string = '', departmentId?: string): void {
    this.loading = true;
    this.helpDeskService.getAllGroups(search, departmentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.groups = (res?.data || []).map((group: any) => ({
            ...group,
            employeeNames: group.employeeNames
              ? group.employeeNames.split(',').map((name: string) => name.trim())
              : []
          }));
          this.totalGroups = this.groups.length;
          this.updatePaginatedGroups();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching groups', err);
          this.loading = false;
        }
      });
  }

  private loadDepartments(): void {
    this.employeeService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: Department[]) => (this.departments = res || []),
        error: (err) => console.error('Failed to load departments', err)
      });
  }

  // Pagination
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedGroups();
  }

  private updatePaginatedGroups(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedGroups = this.groups.slice(startIndex, endIndex);
  }

  // Create group dialog
  openCreateGroupDialog(): void {
    const dialogRef = this.dialog.open(CreateAgentGroupDialogComponent, {
      width: '450px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((created: boolean) => {
      if (created) {
        // Refresh groups if a new group was created
        const deptId = this.departmentControl.value || undefined;
        this.getGroups(this.searchControl.value || '', deptId);
      }
    });
  }

  // Actions
  viewGroup(group: TicketGroup): void {
    console.log('View group', group);
    // Implement view logic here
  }

  editGroup(group: TicketGroup): void {
    console.log('Edit group', group);
    // Implement edit logic here
  }

  deleteGroup(group: TicketGroup): void {
    console.log('Delete group', group);
    // Implement delete logic here (with confirmation dialog)
  }
}