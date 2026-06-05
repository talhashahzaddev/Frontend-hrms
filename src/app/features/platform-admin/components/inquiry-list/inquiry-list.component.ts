import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { DemoInquiryService } from '../../services/demo-inquiry.service';
import { DemoInquiry, DemoInquiryFilter } from '../../models/super-admin.models';
import { InquiryDetailDialogComponent } from '../inquiry-detail-dialog/inquiry-detail-dialog.component';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-inquiry-list',
  standalone: true,
  imports: [
    SharedCommonModule,
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
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './inquiry-list.component.html',
  styleUrls: ['./inquiry-list.component.scss']
})
export class InquiryListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['fullName', 'email', 'companyName', 'companySize', 'status', 'createdAt', 'actions'];

  inquiries: DemoInquiry[] = [];
  totalCount = 0;
  isLoading = true;

  searchTerm = '';
  statusFilter = '';
  pageIndex = 0;
  pageSize = 15;
  sortBy = 'created_at';
  sortDirection = 'desc';

  statusOptions = ['new', 'contacted', 'demo_scheduled', 'converted', 'closed'];

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private inquiryService: DemoInquiryService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadInquiries();

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.pageIndex = 0;
      this.loadInquiries();
    });
  }

  loadInquiries(): void {
    this.isLoading = true;

    const filter: DemoInquiryFilter = {
      page: this.pageIndex + 1,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection as 'asc' | 'desc',
      search: this.searchTerm || undefined,
      status: this.statusFilter || undefined
    };

    this.inquiryService.getInquiries(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.inquiries = res.data.data;
            this.totalCount = res.data.totalCount;
          }
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadInquiries();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadInquiries();
  }

  onSortChange(sort: Sort): void {
    const sortMap: Record<string, string> = {
      fullName: 'full_name',
      email: 'email',
      companyName: 'company_name',
      status: 'status',
      createdAt: 'created_at'
    };
    this.sortBy = sortMap[sort.active] || 'created_at';
    this.sortDirection = sort.direction || 'desc';
    this.loadInquiries();
  }

  viewInquiry(inquiry: DemoInquiry): void {
    const dialogRef = this.dialog.open(InquiryDetailDialogComponent, {
      width: '560px',
      data: inquiry
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result === 'updated') {
          this.loadInquiries();
        }
      });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.pageIndex = 0;
    this.loadInquiries();
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      new: '#2196f3',
      contacted: '#ff9800',
      demo_scheduled: '#9c27b0',
      converted: '#4caf50',
      closed: '#757575'
    };
    return colors[status?.toLowerCase()] || '#bdbdbd';
  }

  formatStatus(status: string): string {
    return status?.replace(/_/g, ' ') || '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
