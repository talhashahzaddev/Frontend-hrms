import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-payroll-period',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './payroll-period.component.html',
  styleUrl: './payroll-period.component.scss'
})
export class PayrollPeriodComponent implements OnInit {
  records: any[] = [];
  page = 1;
  pageSize = 5;
  totalCount = 12;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pageRange(): number[] {
    const delta = 2;
    const start = Math.max(1, this.page - delta);
    const end   = Math.min(this.totalPages, this.page + delta);
    const range: number[] = [];
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }

  get fromRecord(): number {
    return this.totalCount === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get toRecord(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  // Summary card stats
  totalPeriods = 12;
  openCount = 2;
  processedCount = 1;
  lockedCount = 1;

  // Pending filter state (bound to UI controls)
  pendingSearch = '';
  pendingStatus = 'All';

  // Applied filter state
  filterSearch = '';
  filterStatus = 'All';

  get hasActiveFilters(): boolean {
    return !!(this.pendingSearch || this.pendingStatus !== 'All');
  }

  get hasAppliedFilters(): boolean {
    return !!(this.filterSearch || this.filterStatus !== 'All');
  }

  constructor(private notification: NotificationService) {}

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords() {
    // Mock data based on the stitch screen
    this.records = [
      {
        id: 1, name: 'July 2025', startDate: '01 Jul 2025', endDate: '31 Jul 2025', paymentDate: '05 Aug 2025', status: 'Locked', statusClass: 'type-locked'
      },
      {
        id: 2, name: 'August 2025', startDate: '01 Aug 2025', endDate: '31 Aug 2025', paymentDate: '05 Sep 2025', status: 'Closed', statusClass: 'type-closed'
      },
      {
        id: 3, name: 'September 2025', startDate: '01 Sep 2025', endDate: '30 Sep 2025', paymentDate: '05 Oct 2025', status: 'Processed', statusClass: 'type-processed'
      },
      {
        id: 4, name: 'October 2025', startDate: '01 Oct 2025', endDate: '31 Oct 2025', paymentDate: '05 Nov 2025', status: 'Open', statusClass: 'type-open'
      },
      {
        id: 5, name: 'November 2025', startDate: '01 Nov 2025', endDate: '30 Nov 2025', paymentDate: '05 Dec 2025', status: 'Open', statusClass: 'type-open'
      }
    ];

    // Filter handling locally for mockup
    let filteredRecords = [...this.records];
    if (this.filterSearch) {
      filteredRecords = filteredRecords.filter(r => r.name.toLowerCase().includes(this.filterSearch.toLowerCase()));
    }
    if (this.filterStatus !== 'All') {
      filteredRecords = filteredRecords.filter(r => r.status === this.filterStatus);
    }
    this.totalCount = filteredRecords.length;
  }

  applyFilters() {
    this.filterSearch = this.pendingSearch;
    this.filterStatus = this.pendingStatus;
    this.page = 1;
    this.loadRecords();
  }

  clearFilters() {
    this.pendingSearch = '';
    this.pendingStatus = 'All';
    this.filterSearch = '';
    this.filterStatus = 'All';
    this.page = 1;
    this.loadRecords();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.loadRecords();
  }

  prevPage() { this.goToPage(this.page - 1); }
  nextPage() { this.goToPage(this.page + 1); }

  openDialog(mode: 'add' | 'edit', record?: any) {
    this.notification.showSuccess(`Action ${mode} initiated feature is under development.`);
  }

  onDelete(record: any): void {
     this.notification.showSuccess('Delete feature is under development.');
  }

  onView(record: any): void {
      this.notification.showSuccess('View feature is under development.');
  }
}
