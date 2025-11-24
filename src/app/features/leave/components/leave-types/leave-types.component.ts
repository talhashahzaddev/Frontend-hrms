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
import { LEAVE_COLOR_TOKEN, ColorOption } from '../../constants/leave-colors';

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
       <mat-card *ngFor="let type of leaveTypes; let i = index" 
          class="stat-card stat-card-dynamic-color" 
          [style.background]="type.color || '#2196F3'">
          <mat-card-content>
            <div class="stat-item">
              <div class="stat-icon-wrapper">
                <mat-icon class="stat-icon">category</mat-icon>
              </div>
              <div class="stat-details">
                <div class="stat-label">{{ type.typeName }}</div>
                <div class="stat-value">{{ type.maxDaysPerYear }}</div>
                <div class="stat-footer">
                  <mat-icon class="stat-indicator">event</mat-icon>
                  <span>Days per year</span>
                </div>
              </div>
              <div class="card-actions">
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
            </div>

            <!-- Type Description -->
            <div class="type-description" *ngIf="type.description">
              <p>{{ type.description }}</p>
            </div>

            <!-- Type Flags -->
            <div class="type-flags">
              <mat-chip *ngIf="type.isPaid" class="flag-chip flag-paid">
                <mat-icon>attach_money</mat-icon>
                Paid
              </mat-chip>
              <mat-chip *ngIf="type.carryForwardAllowed" class="flag-chip flag-carry">
                <mat-icon>arrow_forward</mat-icon>
                Carry Forward
              </mat-chip>
              <mat-chip *ngIf="!type.isActive" class="flag-chip flag-inactive">
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
  styleUrls: ['./leave-types.component.scss']
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

  getCardColorClass(index: number): string {
    const colors = ['primary', 'success', 'warning', 'info', 'employee'];
    return colors[index % colors.length];
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
        <mat-icon>category</mat-icon>
        Create New Leave Type
      </h2>
      <button mat-icon-button mat-dialog-close class="close-button">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="dialog-content">
        
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

      <div class="dialog-actions">
        <button mat-stroked-button type="button" mat-dialog-close [disabled]="isSubmitting">
          Cancel
        </button>
        <button 
          mat-raised-button 
          color="primary" 
          class="submit-button"
          type="submit"
          [disabled]="form.invalid || isSubmitting">
          <mat-icon *ngIf="!isSubmitting">add</mat-icon>
          Create Leave Type
        </button>
      </div>
    </form>
  `,
  styles: [`
    ::ng-deep .mat-mdc-dialog-container {
      border-radius: 16px !important;
      padding: 0 !important;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: white;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
          color: white;
        }
      }

      .close-button {
        color: white;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: rotate(90deg);
        }
      }
    }

    .dialog-content {
      padding: 28px !important;
      min-width: 550px;
      max-width: 700px;
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
        &.mat-form-field-appearance-outline {
          .mat-mdc-text-field-wrapper {
            background: #f9fafb;
            border-radius: 12px;
            transition: all 0.3s ease;
          }

          .mat-mdc-form-field-flex {
            padding: 0 16px;
          }

          .mat-mdc-notch-piece {
            border-color: #e5e7eb !important;
            transition: border-color 0.3s ease;
          }

          &:hover .mat-mdc-text-field-wrapper {
            background: white;
          }

          &:hover .mat-mdc-notch-piece {
            border-color: #667eea !important;
          }

          &.mat-focused {
            .mat-mdc-text-field-wrapper {
              background: white;
              box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            .mat-mdc-notch-piece {
              border-color: #667eea !important;
              border-width: 2px !important;
            }
          }

          .mat-mdc-form-field-label {
            color: #6b7280;
            font-weight: 500;
          }

          &.mat-focused .mat-mdc-form-field-label {
            color: #667eea;
          }

          input,
          textarea {
            color: #1f2937;
            font-weight: 500;
          }

          // Error state
          &.mat-form-field-invalid {
            .mat-mdc-notch-piece {
              border-color: #dc2626 !important;
            }

            .mat-mdc-form-field-label {
              color: #dc2626;
            }
          }

          // Hints
          .mat-mdc-form-field-hint {
            color: #9ca3af;
            font-size: 12px;
            font-weight: 500;
          }

          .mat-mdc-form-field-icon-prefix {
            padding-right: 8px;
            
            mat-icon {
              color: #667eea;
            }
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

    // Dialog Actions (Payroll Period Style)
    .dialog-actions {
      padding: 20px 28px !important;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 12px;

      button {
        height: 44px;
        padding: 0 28px !important;
        border-radius: 12px !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        text-transform: none !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;

        // Cancel Button
        &[mat-stroked-button] {
          background: white !important;
          color: #6b7280 !important;
          border: 2px solid #e5e7eb !important;

          &:hover:not([disabled]) {
            background: #f9fafb !important;
            border-color: #cbd5e1 !important;
            color: #374151 !important;
          }
        }

        // Submit Button (Auth Style with Shimmer)
        &.submit-button:not([disabled]) {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          border: none !important;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3) !important;
          position: relative;
          overflow: hidden;

          &::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.5s;
          }

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;

            &::before {
              left: 100%;
            }
          }

          &:active {
            transform: translateY(0);
          }

          mat-icon {
            margin-right: 8px;
          }
        }

        // Disabled State
        &[disabled] {
          background: #f3f4f6 !important;
          color: #9ca3af !important;
          border: 1px solid #e5e7eb !important;
          cursor: not-allowed;
          box-shadow: none !important;

          &:hover {
            transform: none !important;
          }
        }
      }
    }

    // Error Messages
    ::ng-deep mat-error {
      font-size: 13px;
      font-weight: 500;
      color: #dc2626;
      margin-top: 4px;
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
  isSubmitting = false;

  readonly colors: ColorOption[] = inject(LEAVE_COLOR_TOKEN);

  // default to the first color in the shared palette
  private readonly defaultColor = this.colors?.[0]?.value ?? '#2196f3';

  readonly form = inject(FormBuilder).group({
    typeName: ['', Validators.required],
    description: [''],
    maxDaysPerYear: [15, [Validators.required, Validators.min(1)]],
    isPaid: [true],
    carryForwardAllowed: [false],
    color: [this.defaultColor, Validators.required]
  });

  private dialogRef = inject(MatDialogRef<AddLeaveTypeDialogTemplate>);

  submit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}

