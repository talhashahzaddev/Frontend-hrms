import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
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
    MatMenuModule,
    MatDialogModule
  ],
  template: `
    <div class="leave-types-container">
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
            </div>

            <div class="type-flags">
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

      <div *ngIf="!isLoading && leaveTypes.length === 0" class="empty-state">
        <mat-icon>category</mat-icon>
        <h3>No Leave Types Configured</h3>
        <p>Get started by creating your first leave type</p>
        <button mat-raised-button color="primary" (click)="addLeaveType()">
          <mat-icon>add</mat-icon>
          Add Leave Type
        </button>
      </div>

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
    private notificationService: NotificationService,
    private dialog: MatDialog
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
        error: () => {
          this.notificationService.showError('Failed to load leave types');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  addLeaveType(): void {
    const dialogRef = this.dialog.open(AddLeaveTypeDialogTemplate, {
      width: '600px',
      maxWidth: '90vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.leaveService.createCustomLeaveType(result).subscribe({
          next: () => {
            this.notificationService.showSuccess('Leave type created successfully');
            this.loadLeaveTypes();
          },
          error: (err) => {
            console.error(err);
            this.notificationService.showError('Failed to create leave type');
          }
        });
      }
    });
  }

  editLeaveType(type: LeaveType): void {
    this.notificationService.showInfo(`Edit leave type: ${type.typeName} will be implemented`);
  }

  deleteLeaveType(type: LeaveType): void {
    if (confirm(`Are you sure you want to delete "${type.typeName}" leave type?`)) {
      this.notificationService.showWarning('Delete functionality will be implemented');
    }
  }
}

/* ------------------------------------------------------------------
   Inline Dialog Component for Adding Leave Type
------------------------------------------------------------------- */
@Component({
  selector: 'add-leave-type-dialog-template',
  standalone: true,
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>
        <mat-icon>add_circle</mat-icon>
        Create New Leave Type
      </h2>
      <button mat-icon-button mat-dialog-close>
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        
        <!-- Basic Information Section -->
        <div class="form-section">
          <h3 class="section-title">
            <mat-icon>info</mat-icon>
            Basic Information
          </h3>
          
          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Leave Type Name</mat-label>
              <input matInput formControlName="typeName" placeholder="e.g., Annual Leave" required />
              <mat-icon matPrefix>label</mat-icon>
              <mat-error *ngIf="form.get('typeName')?.hasError('required')">
                Leave type name is required
              </mat-error>
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea 
                matInput 
                formControlName="description" 
                rows="3"
                placeholder="Describe the purpose and eligibility of this leave type"></textarea>
              <mat-icon matPrefix>description</mat-icon>
            </mat-form-field>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Configuration Section -->
        <div class="form-section">
          <h3 class="section-title">
            <mat-icon>settings</mat-icon>
            Leave Configuration
          </h3>

          <div class="form-row two-columns">
            <mat-form-field appearance="outline">
              <mat-label>Maximum Days Per Year</mat-label>
              <input 
                matInput 
                type="number" 
                formControlName="maxDaysPerYear" 
                min="1" 
                max="365"
                required />
              <mat-icon matPrefix>event</mat-icon>
              <mat-hint>Total days allowed per year</mat-hint>
              <mat-error *ngIf="form.get('maxDaysPerYear')?.hasError('required')">
                Required
              </mat-error>
              <mat-error *ngIf="form.get('maxDaysPerYear')?.hasError('min')">
                Must be at least 1
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Color Theme</mat-label>
              <mat-select formControlName="color" required>
                <mat-option *ngFor="let c of colors" [value]="c.value">
                  <div class="color-option">
                    <span class="color-preview" [style.background-color]="c.value"></span>
                    <span>{{ c.name }}</span>
                  </div>
                </mat-option>
              </mat-select>
              <mat-icon matPrefix>palette</mat-icon>
              <mat-hint>Visual identifier for this leave type</mat-hint>
            </mat-form-field>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Leave Policies Section -->
        <div class="form-section">
          <h3 class="section-title">
            <mat-icon>policy</mat-icon>
            Leave Policies
          </h3>

          <div class="checkbox-group">
            <mat-checkbox formControlName="isPaid" class="policy-checkbox">
              <div class="checkbox-content">
                <div class="checkbox-label">
                  <mat-icon>attach_money</mat-icon>
                  <strong>Paid Leave</strong>
                </div>
                <span class="checkbox-description">Employees receive salary during this leave</span>
              </div>
            </mat-checkbox>

            <mat-checkbox formControlName="carryForwardAllowed" class="policy-checkbox">
              <div class="checkbox-content">
                <div class="checkbox-label">
                  <mat-icon>arrow_forward</mat-icon>
                  <strong>Carry Forward Allowed</strong>
                </div>
                <span class="checkbox-description">Unused days can be carried to next year</span>
              </div>
            </mat-checkbox>
          </div>
        </div>

      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>
          Cancel
        </button>
        <button 
          mat-raised-button 
          color="primary" 
          type="submit"
          [disabled]="form.invalid">
          <mat-icon>check</mat-icon>
          Create Leave Type
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px 0;
      margin-bottom: 8px;

      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--gray-900);

        mat-icon {
          color: var(--primary-600);
        }
      }

      button {
        mat-icon {
          color: var(--gray-600);
        }
      }
    }

    ::ng-deep .mat-mdc-dialog-content {
      padding: 0 24px !important;
      max-height: 70vh;
      overflow-y: auto;
    }

    .form-section {
      padding: 24px 0;

      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--gray-800);
        margin: 0 0 20px;

        mat-icon {
          font-size: 1.25rem;
          width: 1.25rem;
          height: 1.25rem;
          color: var(--primary-600);
        }
      }
    }

    .form-row {
      margin-bottom: 16px;

      &.two-columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
    }

    .full-width {
      width: 100%;
    }

    mat-form-field {
      ::ng-deep {
        .mat-mdc-text-field-wrapper {
          background: var(--gray-50);
        }

        .mat-mdc-form-field-icon-prefix {
          padding-right: 8px;
          
          mat-icon {
            color: var(--gray-600);
          }
        }
      }
    }

    .color-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 0;

      .color-preview {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        border: 2px solid white;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
        flex-shrink: 0;
      }
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .policy-checkbox {
        padding: 16px;
        border: 2px solid var(--gray-200);
        border-radius: 12px;
        transition: all 0.2s ease;

        &:hover {
          border-color: var(--primary-300);
          background: var(--primary-25);
        }

        ::ng-deep {
          .mdc-form-field {
            width: 100%;
          }

          .mdc-checkbox {
            margin-right: 12px;
          }
        }

        .checkbox-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;

          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.95rem;

            mat-icon {
              font-size: 1.125rem;
              width: 1.125rem;
              height: 1.125rem;
              color: var(--primary-600);
            }

            strong {
              color: var(--gray-900);
            }
          }

          .checkbox-description {
            font-size: 0.875rem;
            color: var(--gray-600);
            margin-left: 28px;
          }
        }
      }
    }

    mat-divider {
      margin: 8px 0;
    }

    ::ng-deep .mat-mdc-dialog-actions {
      padding: 16px 24px 20px;
      gap: 12px;

      button {
        font-weight: 600;
        border-radius: 8px;
        padding: 0 24px;

        mat-icon {
          margin-right: 4px;
        }
      }
    }

    @media (max-width: 600px) {
      .form-row.two-columns {
        grid-template-columns: 1fr;
      }
    }
  `],
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    CommonModule
  ]
})
export class AddLeaveTypeDialogTemplate {
  readonly form = inject(FormBuilder).group({
    typeName: ['', Validators.required],
    description: [''],
    maxDaysPerYear: [15, [Validators.required, Validators.min(1)]],
    isPaid: [true],
    carryForwardAllowed: [false],
    color: ['#2196f3', Validators.required]
  });

  readonly colors = [
    { name: 'Red', value: '#f44336' },
    { name: 'Pink', value: '#e91e63' },
    { name: 'Purple', value: '#9c27b0' },
    { name: 'Deep Purple', value: '#673ab7' },
    { name: 'Indigo', value: '#3f51b5' },
    { name: 'Blue', value: '#2196f3' },
    { name: 'Light Blue', value: '#03a9f4' },
    { name: 'Cyan', value: '#00bcd4' },
    { name: 'Teal', value: '#009688' },
    { name: 'Green', value: '#4caf50' },
    { name: 'Light Green', value: '#8bc34a' },
    { name: 'Lime', value: '#cddc39' },
    { name: 'Yellow', value: '#ffeb3b' },
    { name: 'Amber', value: '#ffc107' },
    { name: 'Orange', value: '#ff9800' },
    { name: 'Deep Orange', value: '#ff5722' }
  ];

  private dialogRef = inject(MatDialogRef<AddLeaveTypeDialogTemplate>);

  submit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}