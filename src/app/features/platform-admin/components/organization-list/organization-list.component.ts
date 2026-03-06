import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SuperAdminService } from '../../services/super-admin.service';
import { OrganizationListItem, OrganizationFilter, SubscriptionPlan } from '../../models/super-admin.models';

@Component({
  selector: 'app-organization-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule
  ],
  templateUrl: './organization-list.component.html',
  styleUrls: ['./organization-list.component.scss']
})
export class OrganizationListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['name', 'industry', 'totalActiveEmployees', 'subscriptionPlanName', 'subscriptionStatus', 'subscriptionExpiryDate', 'createdAt', 'actions'];

  organizations: OrganizationListItem[] = [];
  totalCount = 0;
  isLoading = true;

  // Filters
  searchTerm = '';
  statusFilter = '';
  planFilter = '';

  // Pagination
  pageIndex = 0;
  pageSize = 15;

  // Sort
  sortBy = 'created_at';
  sortDirection = 'desc';

  statusOptions = ['active', 'trial', 'expired', 'cancelled', 'pending'];
  plans: SubscriptionPlan[] = [];
  planOptions: string[] = [];

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private superAdminService: SuperAdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrganizations();
    this.loadPlans();

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.pageIndex = 0;
      this.loadOrganizations();
    });
  }

  loadOrganizations(): void {
    this.isLoading = true;

    // Resolve plan name to planId
    const selectedPlan = this.planFilter
      ? this.plans.find(p => p.name === this.planFilter)
      : undefined;

    const filter: OrganizationFilter = {
      page: this.pageIndex + 1,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection as 'asc' | 'desc',
      search: this.searchTerm || undefined,
      status: this.statusFilter || undefined,
      planId: selectedPlan?.planId || undefined
    };

    this.superAdminService.getOrganizations(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.organizations = res.data.data;
            this.totalCount = res.data.totalCount;
          }
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  private loadPlans(): void {
    this.superAdminService.getSubscriptionPlans()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.plans = res.data;
            this.planOptions = res.data.map(p => p.name);
          }
        }
      });
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadOrganizations();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadOrganizations();
  }

  onSortChange(sort: Sort): void {
    const sortMap: Record<string, string> = {
      name: 'name',
      totalActiveEmployees: 'total_active_employees',
      subscriptionStatus: 'subscription_status',
      createdAt: 'created_at'
    };
    this.sortBy = sortMap[sort.active] || 'created_at';
    this.sortDirection = sort.direction || 'desc';
    this.loadOrganizations();
  }

  viewOrganization(org: OrganizationListItem): void {
    this.router.navigate(['/platform-admin/organizations', org.organizationId]);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.planFilter = '';
    this.pageIndex = 0;
    this.loadOrganizations();
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: '#4caf50',
      trial: '#9c27b0',
      expired: '#f44336',
      cancelled: '#757575',
      pending: '#ff9800'
    };
    return colors[status?.toLowerCase()] || '#9c27b0';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
