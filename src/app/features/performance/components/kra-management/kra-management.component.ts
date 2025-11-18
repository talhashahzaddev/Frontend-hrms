import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
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
import { CreateKRADialogComponent } from './create-kra-dialog.component';
import { KRADetailsDialogComponent } from './kra-details-dialog.component';

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
  filteredKRAs: KRA[] = [];
  krasDataSource = new MatTableDataSource<KRA>([]);
  positions: Position[] = [];
  displayedColumns: string[] = ['title', 'position', 'weight', 'status', 'actions'];
  
  // Pagination
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;

  // Filter form
  filterForm: FormGroup;

  constructor(
    private performanceService: PerformanceService,
    private employeeService: EmployeeService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      positionId: [''],
      status: ['']
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
    const searchTerm = this.filterForm.get('search')?.value || '';
    this.performanceService.getKRAs(this.pageIndex + 1, this.pageSize, searchTerm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // PaginatedResponse has 'items' property, but backend might return PagedResult with 'data'
            const paginatedData = response.data as any;
            this.kras = paginatedData.data || paginatedData.items || [];
            this.totalItems = paginatedData.totalCount || 0;
            this.applyFilters();
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

  applyFilters(): void {
    const searchTerm = (this.filterForm.get('search')?.value || '').toLowerCase();
    const positionId = this.filterForm.get('positionId')?.value || '';
    const status = this.filterForm.get('status')?.value || '';

    this.filteredKRAs = this.kras.filter(kra => {
      const matchesSearch = !searchTerm || 
        kra.title.toLowerCase().includes(searchTerm) ||
        (kra.description && kra.description.toLowerCase().includes(searchTerm));
      
      const matchesPosition = !positionId || kra.positionId === positionId;
      
      const matchesStatus = !status || 
        (status === 'active' && kra.isActive) ||
        (status === 'inactive' && !kra.isActive);

      return matchesSearch && matchesPosition && matchesStatus;
    });

    this.krasDataSource.data = this.filteredKRAs;
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      positionId: '',
      status: ''
    });
    this.pageIndex = 0;
    this.loadKRAs();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateKRADialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: {
        positions: this.positions,
        isEditMode: false
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result && !result.isEdit) {
          this.createKRA(result.request);
        } else if (result && result.isEdit) {
          this.updateKRA(result.kra.kraId, result.request);
        }
      });
  }

  openEditDialog(kra: KRA): void {
    const dialogRef = this.dialog.open(CreateKRADialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: {
        positions: this.positions,
        kra: kra,
        isEditMode: true
      },
      disableClose: false
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result && result.isEdit) {
          this.updateKRA(result.kra.kraId, result.request);
        }
      });
  }

  private createKRA(request: CreateKRARequest): void {
    this.isLoading = true;
    this.performanceService.createKRA(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess('KRA created successfully');
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

  private updateKRA(kraId: string, request: UpdateKRARequest): void {
    this.isLoading = true;
    this.performanceService.updateKRA(kraId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess('KRA updated successfully');
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

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadKRAs();
  }

  viewKRADetails(kra: KRA): void {
    this.isLoading = true;
    this.performanceService.getKRAById(kra.kraId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const dialogRef = this.dialog.open(KRADetailsDialogComponent, {
              width: '700px',
              maxWidth: '90vw',
              data: {
                kra: response.data,
                positionName: this.getPositionName(response.data.positionId),
                positions: this.positions,
                hasEditPermission: this.hasHRRole()
              },
              disableClose: false
            });

            dialogRef.afterClosed()
              .pipe(takeUntil(this.destroy$))
              .subscribe(result => {
                if (result?.edit) {
                  this.openEditDialog(response.data);
                } else if (result?.refresh) {
                  this.loadKRAs();
                }
              });
          } else {
            this.notificationService.showError('Failed to load KRA details');
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading KRA details:', error);
          this.notificationService.showError('Failed to load KRA details');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
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

