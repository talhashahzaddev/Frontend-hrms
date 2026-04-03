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
import { NotificationService } from '@/app/core/services/notification.service';
import { TicketGroup } from '../../../../core/models/helpdesk.models';
import { CreateAgentGroupDialogComponent } from '../create-agent-group-dialog/create-agent-group-dialog.component';
import { ViewGroupAgentDetailsComponent } from './view-Group-agent-details';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

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
    private dialog: MatDialog,
    private notificationService: NotificationService
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
    this.dialog.open(ViewGroupAgentDetailsComponent, {
      width: '600px',
      disableClose: false,
      autoFocus: false,
      data: { group }
    });
  }

  editGroup(group: TicketGroup): void {
    const dialogRef = this.dialog.open(CreateAgentGroupDialogComponent, {
      width: '450px',
      disableClose: true,
      data: { group }
    });

    dialogRef.afterClosed().subscribe((updated: boolean) => {
      if (updated) {
        // Refresh groups if the group was updated
        const deptId = this.departmentControl.value || undefined;
        this.getGroups(this.searchControl.value || '', deptId);
      }
    });
  }

  deleteGroup(group: TicketGroup): void {
    const confirmButtonText = 'Yes, Delete';
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group? This action cannot be undone.',
      itemName: group.groupTitle,
      confirmButtonText
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.helpDeskService.deleteGroup(group.groupId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (success: boolean) => {
              if (success) {
                this.notificationService.showSuccess(`Group "${group.groupTitle}" deleted successfully`);
                // Refresh groups list
                const deptId = this.departmentControl.value || undefined;
                this.getGroups(this.searchControl.value || '', deptId);
              } else {
                this.notificationService.showError('Failed to delete the group');
              }
            },
            error: (err) => {
              console.error('Error deleting group', err);
              this.notificationService.showError(err?.error?.message || 'An error occurred while deleting the group');
            }
          });
      }
    });
  }
}