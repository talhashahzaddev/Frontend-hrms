import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, takeUntil } from 'rxjs';

import { LeaveService } from '../../services/leave.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LeaveType } from '../../../../core/models/leave.models';

@Component({
  selector: 'app-leave-types',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule
  ],
  template: `
    <div class="leave-types-container">
      
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">
            <mat-icon>category</mat-icon>
            Leave Types Management
          </h1>
          <p class="page-subtitle">Manage organization leave types and policies</p>
        </div>
        <button mat-raised-button color="primary" (click)="addLeaveType()">
          <mat-icon>add</mat-icon>
          Add Leave Type
        </button>
      </div>

      <!-- Leave Types Grid -->
      <div class="types-grid" *ngIf="!isLoading">
        <mat-card *ngFor="let type of leaveTypes" class="type-card">
          <div class="card-header">
            <div class="type-icon" [style.background-color]="type.color + '20'">
              <mat-icon [style.color]="type.color">category</mat-icon>
            </div>
            <button mat-icon-button [matMenuTriggerFor]="menu" class="menu-button">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="editLeaveType(type)">
                <mat-icon>edit</mat-icon>
                Edit
              </button>
              <button mat-menu-item (click)="deleteLeaveType(type)" class="delete-action">
                <mat-icon>delete</mat-icon>
                Delete
              </button>
            </mat-menu>
          </div>

          <mat-card-content>
            <h3 class="type-name">{{ type.typeName }}</h3>
            <p class="type-description">{{ type.description || 'No description provided' }}</p>

            <div class="type-details">
              <div class="detail-item">
                <mat-icon>event</mat-icon>
                <div class="detail-content">
                  <span class="detail-label">Max Days Per Year</span>
                  <span class="detail-value">{{ type.maxDaysPerYear }} days/year</span>
                </div>
              </div>

              <div class="detail-item" *ngIf="type.maxDaysPerRequest">
                <mat-icon>timer</mat-icon>
                <div class="detail-content">
                  <span class="detail-label">Max per Request</span>
                  <span class="detail-value">{{ type.maxDaysPerRequest }} days</span>
                </div>
              </div>

              <div class="detail-item" *ngIf="type.advanceNoticeDays">
                <mat-icon>notifications</mat-icon>
                <div class="detail-content">
                  <span class="detail-label">Notice Required</span>
                  <span class="detail-value">{{ type.advanceNoticeDays }} days</span>
                </div>
              </div>
            </div>

            <div class="type-flags">
              <mat-chip *ngIf="type.requiresApproval" color="accent" class="flag-chip">
                <mat-icon>check_circle</mat-icon>
                Requires Approval
              </mat-chip>
              <mat-chip *ngIf="type.isPaid" color="primary" class="flag-chip">
                <mat-icon>attach_money</mat-icon>
                Paid Leave
              </mat-chip>
              <mat-chip *ngIf="type.carryForwardAllowed" class="flag-chip">
                <mat-icon>arrow_forward</mat-icon>
                Carry Forward
              </mat-chip>
              <mat-chip *ngIf="!type.isActive" color="warn" class="flag-chip">
                <mat-icon>block</mat-icon>
                Inactive
              </mat-chip>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && leaveTypes.length === 0" class="empty-state">
        <mat-icon>category</mat-icon>
        <h3>No Leave Types Configured</h3>
        <p>Get started by creating your first leave type</p>
        <button mat-raised-button color="primary" (click)="addLeaveType()">
          <mat-icon>add</mat-icon>
          Add Leave Type
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Loading leave types...</p>
      </div>

    </div>
  `,
  styles: [`
    .leave-types-container {
      padding: var(--spacing-lg);
      min-height: calc(100vh - 64px);
      background: var(--gray-50);
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--spacing-2xl);
      flex-wrap: wrap;
      gap: var(--spacing-lg);

      .header-content {
        .page-title {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 2rem;
          font-weight: 700;
          color: var(--gray-900);
          margin: 0 0 var(--spacing-sm);

          mat-icon {
            color: var(--primary-600);
            font-size: 2rem;
            width: 2rem;
            height: 2rem;
          }
        }

        .page-subtitle {
          font-size: 1.125rem;
          color: var(--gray-600);
          margin: 0;
        }
      }

      button {
        font-weight: 600;
        border-radius: var(--radius-lg);
        padding: var(--spacing-md) var(--spacing-xl);
      }
    }

    .types-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: var(--spacing-xl);
    }

    .type-card {
      border-radius: var(--radius-xl);
      border: 1px solid var(--gray-200);
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-xl);
        border-color: var(--primary-300);
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-lg) var(--spacing-lg) 0;

        .type-icon {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-xl);
          display: flex;
          align-items: center;
          justify-content: center;

          mat-icon {
            font-size: 2rem;
            width: 2rem;
            height: 2rem;
          }
        }

        .menu-button {
          mat-icon {
            color: var(--gray-600);
          }
        }
      }

      ::ng-deep .mat-mdc-card-content {
        padding: var(--spacing-lg);
      }

      .type-name {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--gray-900);
        margin: 0 0 var(--spacing-sm);
      }

      .type-description {
        font-size: 0.875rem;
        color: var(--gray-600);
        line-height: 1.5;
        margin: 0 0 var(--spacing-lg);
        min-height: 40px;
      }

      .type-details {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-lg);

        .detail-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm);
          background: var(--gray-50);
          border-radius: var(--radius-md);

          mat-icon {
            color: var(--primary-600);
            font-size: 1.25rem;
            width: 1.25rem;
            height: 1.25rem;
          }

          .detail-content {
            display: flex;
            flex-direction: column;
            flex: 1;

            .detail-label {
              font-size: 0.75rem;
              color: var(--gray-600);
              font-weight: 500;
            }

            .detail-value {
              font-size: 0.875rem;
              color: var(--gray-900);
              font-weight: 600;
            }
          }
        }
      }

      .type-flags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-sm);

        .flag-chip {
          font-size: 0.75rem;
          height: 28px;

          ::ng-deep {
            .mat-mdc-chip-action-label {
              display: flex;
              align-items: center;
              gap: 4px;
            }

            mat-icon {
              font-size: 0.875rem;
              width: 0.875rem;
              height: 0.875rem;
              margin: 0;
            }
          }
        }
      }
    }

    .empty-state {
      text-align: center;
      padding: var(--spacing-4xl);
      background: white;
      border-radius: var(--radius-xl);
      border: 2px dashed var(--gray-300);

      mat-icon {
        font-size: 5rem;
        width: 5rem;
        height: 5rem;
        color: var(--gray-400);
        margin-bottom: var(--spacing-xl);
      }

      h3 {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--gray-900);
        margin: 0 0 var(--spacing-md);
      }

      p {
        font-size: 1.125rem;
        color: var(--gray-600);
        margin: 0 0 var(--spacing-2xl);
      }

      button {
        font-weight: 600;
        border-radius: var(--radius-lg);
        padding: var(--spacing-md) var(--spacing-xl);
      }
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-4xl);
      gap: var(--spacing-lg);

      p {
        color: var(--gray-600);
      }
    }

    .delete-action {
      color: var(--danger-600);

      mat-icon {
        color: var(--danger-600);
      }
    }

    @media (max-width: 768px) {
      .leave-types-container {
        padding: var(--spacing-md);
      }

      .page-header {
        flex-direction: column;
        align-items: stretch;

        button {
          width: 100%;
        }
      }

      .types-grid {
        grid-template-columns: 1fr;
        gap: var(--spacing-lg);
      }
    }
  `]
})
export class LeaveTypesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  leaveTypes: LeaveType[] = [];
  isLoading = false;

  constructor(
    private leaveService: LeaveService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadLeaveTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLeaveTypes(): void {
    this.isLoading = true;

    this.leaveService.getLeaveTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => {
          this.leaveTypes = types;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading leave types:', error);
          this.notificationService.showError('Failed to load leave types');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  addLeaveType(): void {
    this.notificationService.showInfo('Add leave type dialog will be implemented');
  }

  editLeaveType(type: LeaveType): void {
    this.notificationService.showInfo(`Edit leave type: ${type.typeName} will be implemented`);
  }

  deleteLeaveType(type: LeaveType): void {
    if (confirm(`Are you sure you want to delete "${type.typeName}" leave type? This action cannot be undone.`)) {
      this.notificationService.showWarning('Delete functionality will be implemented');
    }
  }
}