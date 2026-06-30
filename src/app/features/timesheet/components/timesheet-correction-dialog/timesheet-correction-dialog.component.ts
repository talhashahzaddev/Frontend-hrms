import { Component, Inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TimesheetService } from '../../services/timesheet.service';
import { TimesheetDay, TimesheetCorrection } from '../../models/timesheet.models';
import { SelectItem } from 'primeng/api';

@Component({
  selector: 'app-timesheet-correction-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule
  ],
  template: `
    <!-- ═══════════════════════════════════════════════════════════════════════
         MATCHED TO: Create Shift dialog (attendance/create-shift)
         Uses Angular Material components + plain HTML stepper — same as shift.
         ═══════════════════════════════════════════════════════════════════════ -->
    <div class="dialog-container">
      <!-- HEADER — identical structure to Create Shift -->
      <div class="dialog-header">
        <div class="header-left">
          <div class="header-icon">
            <mat-icon>edit</mat-icon>
          </div>
          <div class="header-info">
            <h2 class="header-title">Request Correction — {{ day.date | date:'MMM d, y' }}</h2>
          </div>
        </div>
        <button mat-icon-button mat-dialog-close class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- BODY — same padding/scroll as Create Shift -->
      <div class="dialog-body">
        <!-- Rejection Reason Banner -->
        @if (day.rejectionReason) {
          <div class="rejection-banner">
            <mat-icon class="rejection-icon">warning</mat-icon>
            <div class="rejection-text">
              <strong>Previous correction was rejected</strong>
              <span>{{ day.rejectionReason }}</span>
            </div>
          </div>
        }

        <!-- Current State Summary -->
        <div class="state-card">
          <div class="state-card-title">
            <mat-icon class="state-icon">schedule</mat-icon>
            <span>Current Record</span>
          </div>
          <div class="state-grid">
            <span class="state-item">
              <span class="state-label">Status</span>
              <span class="state-value">{{ day.status | titlecase }}</span>
            </span>
            @if (day.checkInTime) {
              <span class="state-item">
                <span class="state-label">Clock In</span>
                <span class="state-value">{{ day.checkInTime | date:'HH:mm' }}</span>
              </span>
            }
            @if (day.checkOutTime) {
              <span class="state-item">
                <span class="state-label">Clock Out</span>
                <span class="state-value">{{ day.checkOutTime | date:'HH:mm' }}</span>
              </span>
            }
            @if (day.totalHours > 0) {
              <span class="state-item">
                <span class="state-label">Total Hours</span>
                <span class="state-value">{{ day.totalHours }}h</span>
              </span>
            }
            @if (day.overtimeHours > 0) {
              <span class="state-item">
                <span class="state-label">Overtime</span>
                <span class="state-value">{{ day.overtimeHours }}h{{ day.overtimeType ? ' (' + day.overtimeType + ')' : '' }}</span>
              </span>
            }
            @if (day.lateMinutes > 0) {
              <span class="state-item">
                <span class="state-label">Late</span>
                <span class="state-value">{{ day.lateMinutes }}m</span>
              </span>
            }
          </div>
        </div>

        <!-- Request Changes Section -->
        <div class="section-divider">Request Changes</div>

        <!-- Attendance Status — mat-select like shift dialog's mat-select -->
        <div class="form-row">
          <label class="field-label">Attendance Status</label>
          <mat-form-field appearance="outline" class="mat-field">
            <mat-select [(ngModel)]="form.status" placeholder="No change" name="status"
                        (selectionChange)="onStatusChange()">
              <mat-option *ngFor="let opt of statusOptions" [value]="opt.value">
                {{ opt.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Check-in / Check-out Time — two-column grid like shift's Start Time / End Time -->
        <div class="form-row-grid two-col">
          <div class="form-col">
            <label class="field-label">Check-in Time</label>
            <mat-form-field appearance="outline" class="mat-field time-field">
              <mat-icon matPrefix class="prefix-icon">schedule</mat-icon>
              <mat-select [(ngModel)]="form.checkInTime" placeholder="Select check-in" name="checkInTime">
                <mat-option *ngFor="let t of timeSlots" [value]="t.value">{{ t.label }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="form-col">
            <label class="field-label">Check-out Time</label>
            <mat-form-field appearance="outline" class="mat-field time-field">
              <mat-icon matPrefix class="prefix-icon">schedule</mat-icon>
              <mat-select [(ngModel)]="form.checkOutTime" placeholder="Select check-out" name="checkOutTime">
                <mat-option *ngFor="let t of timeSlots" [value]="t.value">{{ t.label }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <!-- Overtime Hours — plain HTML stepper EXACTLY like shift's Break (Min) -->
        <div class="form-row-grid two-col">
          <div class="form-col">
            <label class="field-label">Overtime Hours</label>
            <div class="stepper-wrapper">
              <button type="button" class="stepper-btn" (click)="decrementOvertime()">
                <mat-icon>remove</mat-icon>
              </button>
              <input class="stepper-input" type="number" [(ngModel)]="form.overtimeHours"
                     name="overtimeHours" min="0" max="24" step="0.5" />
              <button type="button" class="stepper-btn" (click)="incrementOvertime()">
                <mat-icon>add</mat-icon>
              </button>
            </div>
          </div>
          @if (form.overtimeHours > 0) {
            <div class="form-col">
              <label class="field-label">Overtime Type</label>
              <mat-form-field appearance="outline" class="mat-field">
                <mat-select [(ngModel)]="form.overtimeType" name="overtimeType">
                  <mat-option *ngFor="let opt of overtimeTypeOptions" [value]="opt.value">
                    {{ opt.label }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          }
        </div>

        <!-- Late Minutes — only show if late -->
        @if (form.status === 'late' || day.status === 'late') {
          <div class="form-row">
            <label class="field-label">Late Minutes</label>
            <mat-form-field appearance="outline" class="mat-field">
              <input matInput type="number" [(ngModel)]="form.lateMinutes" name="lateMinutes"
                     min="0" max="480" placeholder="0" />
            </mat-form-field>
          </div>
        }

        <!-- Leave Type — only show if on_leave -->
        @if (form.status === 'on_leave') {
          <div class="form-row">
            <label class="field-label">Leave Type</label>
            <mat-form-field appearance="outline" class="mat-field">
              <mat-select [(ngModel)]="form.leaveTypeId" placeholder="Select leave type" name="leaveType">
                <mat-option *ngFor="let opt of leaveTypeOptions" [value]="opt.value">
                  {{ opt.label }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        }

        <!-- Notes — textarea styled like mat-field -->
        <div class="form-row">
          <label class="field-label">Notes</label>
          <mat-form-field appearance="outline" class="mat-field">
            <textarea matInput [(ngModel)]="form.notes" name="notes" rows="2"
                      placeholder="Optional notes..."></textarea>
          </mat-form-field>
        </div>

        <!-- Reason for Correction — required -->
        <div class="form-row">
          <label class="field-label">Reason for Correction <span class="required">*</span></label>
          <mat-form-field appearance="outline" class="mat-field">
            <textarea matInput [(ngModel)]="form.reason" name="reason" rows="3"
                      placeholder="Explain why this day needs correction..."></textarea>
          </mat-form-field>
        </div>

        @if (error()) {
          <div class="error-text">{{ error() }}</div>
        }
      </div>

      <!-- FOOTER — Cancel (stroked) + Save Draft (stroked) + Submit (flat) like shift's Cancel + Create -->
      <div class="dialog-footer">
        <button mat-stroked-button type="button" mat-dialog-close class="btn-cancel">Cancel</button>
        <button mat-stroked-button type="button" class="btn-draft" [disabled]="saving()" (click)="saveDraft()">
          {{ saving() ? 'Saving...' : 'Save Draft' }}
        </button>
        <button mat-flat-button class="btn-save" [disabled]="saving()" (click)="submit()">
          {{ saving() ? 'Submitting...' : 'Submit' }}
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./timesheet-correction-dialog.component.scss']
})
export class TimesheetCorrectionDialog implements OnInit {
  day: TimesheetDay;
  periodId: string;
  saving = signal(false);
  error = signal('');
  leaveTypes: { id: string; name: string }[] = [];

  // Time slots for mat-select (matching shift dialog's timeSlots approach)
  timeSlots: SelectItem[] = [];

  // Mat-select options
  statusOptions: SelectItem[] = [
    { label: 'No change', value: '' },
    { label: 'Present', value: 'present' },
    { label: 'Absent', value: 'absent' },
    { label: 'Late', value: 'late' },
    { label: 'Half Day', value: 'half_day' },
    { label: 'On Leave', value: 'on_leave' }
  ];
  overtimeTypeOptions: SelectItem[] = [
    { label: 'Regular', value: 'regular' },
    { label: 'Weekend', value: 'weekend' },
    { label: 'Holiday', value: 'holiday' }
  ];
  leaveTypeOptions: SelectItem[] = [];

  form = {
    status: '',
    checkInTime: '',
    checkOutTime: '',
    overtimeHours: 0,
    overtimeType: 'regular',
    lateMinutes: 0,
    leaveTypeId: '',
    notes: '',
    reason: ''
  };

  constructor(
    public dialogRef: MatDialogRef<TimesheetCorrectionDialog>,
    @Inject(MAT_DIALOG_DATA) data: { day: TimesheetDay; periodId: string },
    private api: TimesheetService
  ) {
    this.day = data.day;
    this.periodId = data.periodId;
  }

  ngOnInit() {
    this.generateTimeSlots();
    this.prePopulateForm();
    this.loadLeaveTypes();
  }

  private generateTimeSlots() {
    // Generate 30-minute interval time slots like the shift dialog
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        const value = `${hh}:${mm}`;
        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const ampm = h < 12 ? 'AM' : 'PM';
        const label = `${displayH}:${mm} ${ampm}`;
        this.timeSlots.push({ label, value });
      }
    }
  }

  private prePopulateForm() {
    if (this.day.checkInTime) {
      const d = new Date(this.day.checkInTime);
      this.form.checkInTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    if (this.day.checkOutTime) {
      const d = new Date(this.day.checkOutTime);
      this.form.checkOutTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    if (this.day.overtimeHours > 0) {
      this.form.overtimeHours = this.day.overtimeHours;
      this.form.overtimeType = this.day.overtimeType || 'regular';
    }
    if (this.day.lateMinutes > 0) {
      this.form.lateMinutes = this.day.lateMinutes;
    }
  }

  private loadLeaveTypes() {
    this.api.getLeaveTypes().subscribe({
      next: (types) => {
        this.leaveTypes = types;
        this.leaveTypeOptions = types.map(t => ({ label: t.name, value: t.id }));
      },
      error: () => this.leaveTypes = []
    });
  }

  decrementOvertime() {
    this.form.overtimeHours = Math.max(0, this.form.overtimeHours - 0.5);
  }

  onStatusChange() {
    // Auto-clear time fields and hours when status is absent (no meaningful clock data)
    if (this.form.status === 'absent') {
      this.form.checkInTime = '';
      this.form.checkOutTime = '';
      this.form.overtimeHours = 0;
      this.form.lateMinutes = 0;
      this.form.leaveTypeId = '';
    }
  }

  incrementOvertime() {
    this.form.overtimeHours = Math.min(24, this.form.overtimeHours + 0.5);
  }

  saveDraft() {
    this.submitCorrection('draft');
  }

  submit() {
    if (!this.form.reason) { this.error.set('Reason is required.'); return; }
    this.submitCorrection('submitted');
  }

  private submitCorrection(status: string) {
    this.saving.set(true);
    const idempotencyKey = crypto.randomUUID();

    // Extract the YYYY-MM-DD part from day.date safely.
    // day.date may arrive as "2026-06-15", "2026-06-15T00:00:00", or a Date object.
    const dateStr = typeof this.day.date === 'string'
      ? this.day.date.substring(0, 10)
      : new Date(this.day.date as any).toISOString().substring(0, 10);

    // Convert time strings (HH:mm) to ISO DateTime strings for the API
    let requestedCheckIn: string | undefined;
    let requestedCheckOut: string | undefined;
    if (this.form.checkInTime) {
      requestedCheckIn = `${dateStr}T${this.form.checkInTime}:00`;
    }
    if (this.form.checkOutTime) {
      requestedCheckOut = `${dateStr}T${this.form.checkOutTime}:00`;
    }

    // Build workDate as a date-only ISO string
    const workDate = `${dateStr}T00:00:00`;

    const dto: TimesheetCorrection = {
      timesheetId: this.periodId,
      attendanceId: this.day.attendanceId,
      employeeId: this.day.employeeId,
      workDate,
      requestedStatus: this.form.status || undefined,
      requestedCheckIn,
      requestedCheckOut,
      requestedOvertimeHours: this.form.overtimeHours > 0 ? this.form.overtimeHours : undefined,
      requestedOvertimeType: this.form.overtimeHours > 0 ? this.form.overtimeType : undefined,
      requestedLateMinutes: this.form.lateMinutes > 0 ? this.form.lateMinutes : undefined,
      requestedLeaveTypeId: this.form.status === 'on_leave' ? this.form.leaveTypeId || undefined : undefined,
      requestedNotes: this.form.notes || undefined,
      reasonForEdit: this.form.reason,
      idempotencyKey,
      status
    };
    this.api.submitCorrection(dto).subscribe({
      next: () => this.dialogRef.close({ submitted: true, status }),
      error: (err) => { this.error.set(err?.error?.message || err?.error?.errorMessage || 'Failed to save. Please try again.'); this.saving.set(false); }
    });
  }
}
