import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subject, combineLatest, debounceTime, distinctUntilChanged, startWith, takeUntil } from 'rxjs';
import { HelpDeskService } from '../../services/help-desk.services';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { NotificationService } from '@/app/core/services/notification.service';
import { AuthService } from '@/app/core/services/auth.service';
import { CreateTicketCategoryDialogComponent } from '../create-ticket-category-dialog/create-ticket-category-dialog.component';
import { MatMenuModule } from '@angular/material/menu';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '../../../../shared/components/confirm-delete-dialog/confirm-delete-dialog.component'; 
import { SharedCommonModule } from '@shared/shared-common.module';
export interface Department {
  departmentId: string;
  departmentName: string;
}
interface Category {
  categoryId: string;
  departmentId: string;
  departmentName: string;
  categoryName: string;
  status: boolean;
  createdAt: string;
}


@Component({
  selector: 'app-ticket-category',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTableModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatPaginatorModule,
    MatMenuModule
  ],
  templateUrl: './ticket-category.component.html',
  styleUrls: ['./ticket-category.component.scss']
})
export class TicketCategoryComponent implements OnInit, OnDestroy {

  categories: Category[] = [];
  paginatedCategories: Category[] = [];
  departments: Department[] = [];
  loading = false;

  searchControl = new FormControl('');
  departmentControl = new FormControl('');

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  totalCategories = 0;
  pageSizeOptions = [10, 25, 50];

  private destroy$ = new Subject<void>();

  displayedColumns = ['categoryName', 'departmentName', 'status', 'createdAt', 'actions'];

  constructor(
    private helpDeskService: HelpDeskService,
    private employeeService: EmployeeService,
    private dialog: MatDialog,
    private notification: NotificationService
    , private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.setupFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDepartments(): void {
    this.employeeService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.departments = res || [],
        error: (err) => console.error('Failed to load departments', err)
      });
  }

  private setupFilters(): void {
    combineLatest([
      this.searchControl.valueChanges.pipe(startWith(this.searchControl.value || '')),
      this.departmentControl.valueChanges.pipe(startWith(this.departmentControl.value || ''))
    ])
    .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
    .subscribe(([search, deptId]) => {
      this.pageIndex = 0;
      this.getCategories(search || '', deptId || undefined);
    });
  }

  getCategories(search: string = '', departmentId?: string): void {
    this.loading = true;
    this.helpDeskService.getCategories({ searchTerm: search, departmentId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: Category[]) => {
          this.categories = res || [];
          this.totalCategories = this.categories.length;
          this.updatePaginatedCategories();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching categories', err);
          this.loading = false;
        }
      });
  }

  private updatePaginatedCategories(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedCategories = this.categories.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedCategories();
  }

  openCreateCategoryDialog(): void {
    const dialogRef = this.dialog.open(CreateTicketCategoryDialogComponent, {
      width: '450px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((created: boolean) => {
      if (created) {
        // Refresh categories after creating new one
        this.getCategories(this.searchControl.value || '', this.departmentControl.value || undefined);
      }
    });
  }

  editCategory(category: Category): void {
    const dialogRef = this.dialog.open(CreateTicketCategoryDialogComponent, {
      width: '450px',
      disableClose: true,
      data: category
    });

    dialogRef.afterClosed().subscribe((updated: boolean) => {
      if (updated) {
        // Refresh categories after updating
        this.getCategories(this.searchControl.value || '', this.departmentControl.value || undefined);
      }
    });
  }

  deleteCategory(category: Category): void {
    const confirmButtonText = 'Yes, Delete';
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category?',
      itemName: category.categoryName,
      confirmButtonText
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loading = true;
        this.helpDeskService.deleteCategory(category.categoryId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (success) => {
              if (success) {
                this.notification.showSuccess('Category deleted successfully');
                // Refresh the categories list
                this.getCategories(this.searchControl.value || '', this.departmentControl.value || undefined);
              } else {
                this.notification.showError('Failed to delete category');
              }
              this.loading = false;
            },
            error: (err) => {
              console.error('Error deleting category', err);
              this.notification.showError(err?.message || 'Error deleting category');
              this.loading = false;
            }
          });
      }
    });
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Help Desk', 'Ticket Category', actionKey);
  }
}

// Permission helper
// Uses sidebar naming: Menu = 'Help Desk', SubMenu = 'Ticket Category'
export interface _TicketCategoryPermissionHelper {}
