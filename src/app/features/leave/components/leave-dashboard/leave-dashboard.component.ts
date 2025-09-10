import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { Subject, takeUntil } from 'rxjs';

import { LeaveBalance, LeaveRequest, LeaveRequestStatus } from '../../../../core/models/leave.models';

@Component({
  selector: 'app-leave-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTabsModule
  ],
  template: `
    <!-- Leave Dashboard Container -->
    <div class="leave-dashboard-container">
      
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">
            <mat-icon>event_available</mat-icon>
            Leave Management
          </h1>
          <p class="page-subtitle">Manage your leave requests and view balances</p>
        </div>
        
        <div class="header-actions">
          <button mat-flat-button 
                  routerLink="/leave/apply" 
                  class="apply-leave-button">
            <mat-icon>add</mat-icon>
            Apply for Leave
          </button>
        </div>
      </div>

      <!-- Leave Balances -->
      <div class="balances-section">
        <h2>Your Leave Balances</h2>
        <div class="balances-grid">
          <mat-card *ngFor="let balance of mockLeaveBalances" class="balance-card">
            <div class="balance-content">
              <div class="balance-header">
                <h3>{{ balance.leaveTypeName }}</h3>
                <div class="balance-available">{{ balance.availableDays }}</div>
              </div>
              <div class="balance-details">
                <div class="balance-item">
                  <span class="label">Total:</span>
                  <span class="value">{{ balance.totalDays }}</span>
                </div>
                <div class="balance-item">
                  <span class="label">Used:</span>
                  <span class="value">{{ balance.usedDays }}</span>
                </div>
                <div class="balance-item">
                  <span class="label">Pending:</span>
                  <span class="value">{{ balance.pendingDays }}</span>
                </div>
              </div>
              <div class="balance-progress">
                <div class="progress-bar">
                  <div class="progress-fill" 
                       [style.width.%]="(balance.usedDays / balance.totalDays) * 100">
                  </div>
                </div>
              </div>
            </div>
          </mat-card>
        </div>
      </div>

      <!-- Recent Requests -->
      <div class="requests-section">
        <mat-card class="requests-card">
          <mat-card-header>
            <mat-card-title>Recent Leave Requests</mat-card-title>
            <div class="card-actions">
              <button mat-stroked-button routerLink="/leave/history">View All</button>
            </div>
          </mat-card-header>
          
          <mat-card-content>
            <div class="requests-list">
              <div *ngFor="let request of mockRecentRequests" class="request-item">
                <div class="request-info">
                  <div class="request-type">{{ request.leaveType?.name }}</div>
                  <div class="request-dates">
                    {{ formatDate(request.startDate) }} - {{ formatDate(request.endDate) }}
                    ({{ request.totalDays }} days)
                  </div>
                  <div class="request-reason">{{ request.reason }}</div>
                </div>
                <div class="request-status">
                  <mat-chip [class]="'status-' + request.status">
                    {{ request.status | titlecase }}
                  </mat-chip>
                </div>
              </div>
            </div>
            
            <div class="empty-state" *ngIf="mockRecentRequests.length === 0">
              <mat-icon>event_note</mat-icon>
              <h3>No recent requests</h3>
              <p>You haven't applied for any leave recently.</p>
              <button mat-flat-button routerLink="/leave/apply">Apply for Leave</button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styleUrls: ['./leave-dashboard.component.scss']
})
export class LeaveDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Mock data for demonstration
  mockLeaveBalances: LeaveBalance[] = [
    {
      leaveTypeId: '1',
      leaveTypeName: 'Annual Leave',
      totalDays: 25,
      usedDays: 8,
      availableDays: 17,
      pendingDays: 3,
      carryForwardDays: 0
    },
    {
      leaveTypeId: '2',
      leaveTypeName: 'Sick Leave',
      totalDays: 12,
      usedDays: 2,
      availableDays: 10,
      pendingDays: 0,
      carryForwardDays: 0
    },
    {
      leaveTypeId: '3',
      leaveTypeName: 'Personal Leave',
      totalDays: 5,
      usedDays: 1,
      availableDays: 4,
      pendingDays: 0,
      carryForwardDays: 0
    }
  ];

  mockRecentRequests: LeaveRequest[] = [
    {
      leaveRequestId: '1',
      employeeId: '1',
      leaveTypeId: '1',
      startDate: '2024-03-15',
      endDate: '2024-03-17',
      totalDays: 3,
      reason: 'Family vacation',
      status: LeaveRequestStatus.PENDING,
      appliedDate: '2024-03-01',
      isEmergency: false,
      leaveType: { 
        leaveTypeId: '1', 
        name: 'Annual Leave', 
        maxDaysPerYear: 25, 
        carryForwardDays: 0, 
        isCarryForwardAllowed: false, 
        requiresApproval: true, 
        approvalHierarchy: [], 
        isActive: true, 
        createdAt: '' 
      }
    },
    {
      leaveRequestId: '2',
      employeeId: '1',
      leaveTypeId: '2',
      startDate: '2024-02-20',
      endDate: '2024-02-21',
      totalDays: 2,
      reason: 'Medical appointment',
      status: LeaveRequestStatus.APPROVED,
      appliedDate: '2024-02-15',
      isEmergency: false,
      leaveType: { 
        leaveTypeId: '2', 
        name: 'Sick Leave', 
        maxDaysPerYear: 12, 
        carryForwardDays: 0, 
        isCarryForwardAllowed: false, 
        requiresApproval: true, 
        approvalHierarchy: [], 
        isActive: true, 
        createdAt: '' 
      }
    }
  ];

  ngOnInit(): void {
    // Load actual data here
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }
}
