import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subject, takeUntil } from 'rxjs';

import { PerformanceService } from '../../services/performance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { KRA, CreateKRARequest, UpdateKRARequest } from '../../../../core/models/performance.models';
import { Position, Employee } from '../../../../core/models/employee.models';
import { PaginatedResponse } from '../../../../core/models/common.models';

@Component({
  selector: 'app-kra-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
    MatDividerModule,
    MatCheckboxModule
  ],
  templateUrl: './kra-management.component.html',
  styleUrls: ['./kra-management.component.scss']
})
export class KRAManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isLoading = false;
  kras: KRA[] = [];
  positions: Position[] = [];
  displayedColumns: string[] = ['title', 'position', 'weight', 'status', 'actions'];
  
  // Pagination
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;
  searchTerm = '';

  // Dialog state
  showKRAForm = false;
  isEditMode = false;
  selectedKRA?: KRA;
  kraForm: FormGroup;

  constructor(
    private performanceService: PerformanceService,
    private employeeService: EmployeeService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.kraForm = this.fb.group({
      positionId: ['', Validators.required],
      title: ['', Validators.required],
      description: [''],
      weight: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      measurementCriteria: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadPositions();
    this.loadKRAs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPositions(): void {
    this.employeeService.getPositions().subscribe({
      next: (positions) => {
        this.positions = positions || [];
      },
      error: (error) => {
        console.error('Error loading positions:', error);
      }
    });
  }

  loadKRAs(): void {
    this.isLoading = true;
    this.performanceService.getKRAs(this.pageIndex + 1, this.pageSize, this.searchTerm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // PaginatedResponse has 'items' property, but backend might return PagedResult with 'data'
            const paginatedData = response.data as any;
            this.kras = paginatedData.data || paginatedData.items || [];
            this.totalItems = paginatedData.totalCount || 0;
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading KRAs:', error);
          this.notificationService.showError('Failed to load KRAs');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  openCreateDialog(): void {
    this.isEditMode = false;
    this.selectedKRA = undefined;
    this.kraForm.reset({
      positionId: '',
      title: '',
      description: '',
      weight: 0,
      measurementCriteria: '',
      isActive: true
    });
    this.showKRAForm = true;
  }

  openEditDialog(kra: KRA): void {
    this.isEditMode = true;
    this.selectedKRA = kra;
    this.kraForm.patchValue({
      positionId: kra.positionId || '',
      title: kra.title,
      description: kra.description || '',
      weight: kra.weight,
      measurementCriteria: kra.measurementCriteria || '',
      isActive: kra.isActive
    });
    this.showKRAForm = true;
  }

  closeForm(): void {
    this.showKRAForm = false;
    this.isEditMode = false;
    this.selectedKRA = undefined;
    this.kraForm.reset();
  }

  saveKRA(): void {
    if (this.kraForm.valid) {
      this.isLoading = true;
      const formValue = this.kraForm.value;

      if (this.isEditMode && this.selectedKRA) {
        const updateRequest: UpdateKRARequest = {
          title: formValue.title,
          description: formValue.description,
          weight: formValue.weight,
          measurementCriteria: formValue.measurementCriteria,
          isActive: formValue.isActive
        };

        this.performanceService.updateKRA(this.selectedKRA.kraId, updateRequest)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.notificationService.showSuccess('KRA updated successfully');
                this.closeForm();
                this.loadKRAs();
              } else {
                this.notificationService.showError(response.message || 'Failed to update KRA');
              }
              this.isLoading = false;
              this.cdr.markForCheck();
            },
            error: (error) => {
              console.error('Error updating KRA:', error);
              this.notificationService.showError(error.error?.message || 'Failed to update KRA');
              this.isLoading = false;
              this.cdr.markForCheck();
            }
          });
      } else {
        const createRequest: CreateKRARequest = {
          positionId: formValue.positionId,
          title: formValue.title,
          description: formValue.description,
          weight: formValue.weight,
          measurementCriteria: formValue.measurementCriteria,
          isActive: formValue.isActive !== undefined ? formValue.isActive : true
        };

        this.performanceService.createKRA(createRequest)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.notificationService.showSuccess('KRA created successfully');
                this.closeForm();
                this.loadKRAs();
              } else {
                this.notificationService.showError(response.message || 'Failed to create KRA');
              }
              this.isLoading = false;
              this.cdr.markForCheck();
            },
            error: (error) => {
              console.error('Error creating KRA:', error);
              this.notificationService.showError(error.error?.message || 'Failed to create KRA');
              this.isLoading = false;
              this.cdr.markForCheck();
            }
          });
      }
    }
  }

  deleteKRA(kra: KRA): void {
    if (confirm(`Are you sure you want to delete "${kra.title}"? This action cannot be undone.`)) {
      this.isLoading = true;
      this.performanceService.deleteKRA(kra.kraId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.showSuccess('KRA deleted successfully');
              this.loadKRAs();
            } else {
              this.notificationService.showError(response.message || 'Failed to delete KRA');
            }
            this.isLoading = false;
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error deleting KRA:', error);
            this.notificationService.showError(error.error?.message || 'Failed to delete KRA');
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        });
    }
  }

  toggleKRAStatus(kra: KRA): void {
    this.performanceService.updateKRAStatus(kra.kraId, !kra.isActive)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess(`KRA ${!kra.isActive ? 'activated' : 'deactivated'} successfully`);
            this.loadKRAs();
          } else {
            this.notificationService.showError(response.message || 'Failed to update KRA status');
          }
        },
        error: (error) => {
          console.error('Error updating KRA status:', error);
          this.notificationService.showError('Failed to update KRA status');
        }
      });
  }

  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.pageIndex = 0;
    this.loadKRAs();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadKRAs();
  }

  getPositionName(positionId?: string): string {
    if (!positionId) return 'N/A';
    const position = this.positions.find(p => p.positionId === positionId);
    return position?.positionTitle || 'N/A';
  }

  hasHRRole(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager', 'Manager']);
  }
}

