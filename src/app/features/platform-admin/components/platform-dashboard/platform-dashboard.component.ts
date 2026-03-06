import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

import { SuperAdminService } from '../../services/super-admin.service';
import { PlatformDashboard } from '../../models/super-admin.models';

interface KpiCard {
  label: string;
  value: number;
  icon: string;
  color: string;
  route?: string;
}

@Component({
  selector: 'app-platform-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    NgChartsModule
  ],
  templateUrl: './platform-dashboard.component.html',
  styleUrls: ['./platform-dashboard.component.scss']
})
export class PlatformDashboardComponent implements OnInit, OnDestroy {
  dashboard: PlatformDashboard | null = null;
  isLoading = true;
  errorMessage = '';
  kpiCards: KpiCard[] = [];

  // Org by plan chart
  orgByPlanChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  orgByPlanChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  // Subscription status chart
  subStatusChartData: ChartData<'pie'> = { labels: [], datasets: [] };
  subStatusChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  private destroy$ = new Subject<void>();

  private superAdminService = inject(SuperAdminService);

  constructor() {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.superAdminService.getDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.dashboard = res.data;
            this.buildKpiCards();
            this.buildCharts();
          }
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load dashboard data.';
          this.isLoading = false;
        }
      });
  }

  private buildKpiCards(): void {
    if (!this.dashboard) return;
    const d = this.dashboard;

    this.kpiCards = [
      { label: 'Total Organizations', value: d.totalOrganizations, icon: 'business', color: '#3f51b5', route: '/platform-admin/organizations' },
      { label: 'New Org This Month', value: d.newOrganizationsThisMonth, icon: 'trending_up', color: '#4caf50' },
      { label: 'Total Employees', value: d.totalActiveEmployees, icon: 'people', color: '#2196f3' },
      { label: 'Active Subscriptions', value: d.activeSubscriptions, icon: 'card_membership', color: '#ff9800' },
      { label: 'Trial Accounts', value: d.trialAccounts, icon: 'hourglass_top', color: '#9c27b0' },
      { label: 'Expired Subscriptions', value: d.expiredSubscriptions, icon: 'cancel', color: '#f44336' },
      { label: 'Monthly Revenue', value: d.monthlyRecurringRevenue, icon: 'attach_money', color: '#009688' },
      { label: 'Demo Inquiries', value: d.totalDemoInquiries, icon: 'contact_mail', color: '#e91e63', route: '/platform-admin/inquiries' }
    ];
  }

  private buildCharts(): void {
    if (!this.dashboard) return;
    const d = this.dashboard;

    // Doughnut - Organizations by plan
    this.orgByPlanChartData = {
      labels: ['Active', 'Trial', 'Expired', 'Other'],
      datasets: [{
        data: [
          d.activeSubscriptions,
          d.trialAccounts,
          d.expiredSubscriptions,
          Math.max(0, d.totalOrganizations - d.activeSubscriptions - d.trialAccounts - d.expiredSubscriptions)
        ],
        backgroundColor: ['#4caf50', '#9c27b0', '#f44336', '#bdbdbd']
      }]
    };

    // Pie - New vs Existing orgs this month
    this.subStatusChartData = {
      labels: ['New This Month', 'Existing'],
      datasets: [{
        data: [d.newOrganizationsThisMonth, d.totalOrganizations - d.newOrganizationsThisMonth],
        backgroundColor: ['#2196f3', '#e0e0e0']
      }]
    };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
