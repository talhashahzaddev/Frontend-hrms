import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetService } from '../../services/timesheet.service';
import { RouterModule } from '@angular/router';
import { PendingCorrection } from '../../models/timesheet.models';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TimesheetAuditTimelineComponent } from '../timesheet-audit-timeline/timesheet-audit-timeline.component';
import { AuthService } from '../../../../core/services/auth.service';

interface QueueItem extends PendingCorrection {
  riskLevel: 'flagged' | 'routine';
  riskReasons: string[];
  changeSummary: string;
  changeDetail: string;
  sortPriority: number;
  submittedRelative: string;
}

@Component({
  selector: 'app-timesheet-approval-panel',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, MatSnackBarModule,
    ButtonModule, InputTextareaModule, ProgressSpinnerModule,
    PageHeaderComponent, StatusBadgeComponent,
    TimesheetAuditTimelineComponent
  ],
  template: `
    @if (!selectedPeriodId()) {
      <div class="ts-page-layout">
        <app-page-header matIcon="fact_check" title="Pending Corrections" subtitle="Select a period to review pending corrections"></app-page-header>
        @if (loadingPeriods) {
          <div class="ts-loading"><p-progressSpinner></p-progressSpinner></div>
        } @else {
          <div class="ts-period-grid">
            @for (p of periods(); track p.timesheetId) {
              <div class="ts-card ts-period-card" (click)="selectPeriod(p.timesheetId, p.timesheetName)">
                <span class="ts-pc-name">{{ p.timesheetName }}</span>
                <span class="ts-pc-dates">{{ p.periodStart | date:'MMM d' }} — {{ p.periodEnd | date:'MMM d, y' }}</span>
                <app-status-badge [status]="p.status"></app-status-badge>
              </div>
            }
          </div>
        }
      </div>
    } @else {
      <div class="ts-page-layout">
        <app-page-header matIcon="fact_check" [title]="'Pending Corrections'" [subtitle]="selectedPeriodName() ? 'Period: ' + selectedPeriodName() : ''">
          <button actions class="ts-btn-text" (click)="deselectPeriod()"><i class="pi pi-arrow-left"></i> Back to Periods</button>
        </app-page-header>
        @if (loading) {
          <div class="ts-loading"><p-progressSpinner></p-progressSpinner></div>
        } @else if (queueItems().length === 0) {
          <div class="ts-empty-state">
            <div class="ts-empty-icon"><i class="pi pi-check-circle"></i></div>
            <div class="ts-empty-title">All caught up</div>
            <div class="ts-empty-message">No pending corrections for this period.</div>
          </div>
        } @else {
          <div class="ts-queue-header">
            <div class="ts-queue-filters">
              <button class="ts-filter-chip" [class.active]="activeFilter() === 'all'" (click)="activeFilter.set('all')">All <span class="ts-chip-count">{{ queueItems().length }}</span></button>
              <button class="ts-filter-chip" [class.active]="activeFilter() === 'flagged'" (click)="activeFilter.set('flagged')"><i class="pi pi-exclamation-triangle"></i> Needs Attention <span class="ts-chip-count">{{ flaggedItems().length }}</span></button>
              <button class="ts-filter-chip" [class.active]="activeFilter() === 'routine'" (click)="activeFilter.set('routine')">Routine <span class="ts-chip-count">{{ routineItems().length }}</span></button>
            </div>
            <div class="ts-density-toggle">
              <button class="ts-density-btn" [class.active]="density() === 'compact'" (click)="density.set('compact')" title="Compact"><i class="pi pi-bars"></i></button>
              <button class="ts-density-btn" [class.active]="density() === 'comfortable'" (click)="density.set('comfortable')" title="Comfortable"><i class="pi pi-th-large"></i></button>
            </div>
          </div>

          @if (activeFilter() === 'all' || activeFilter() === 'flagged') {
            @if (flaggedItems().length > 0) {
              <div class="ts-group-section">
                <div class="ts-group-header ts-group-flagged"><i class="pi pi-exclamation-triangle"></i><span>Needs Attention</span><span class="ts-group-count">{{ flaggedItems().length }}</span></div>
                @for (item of flaggedItems(); track item.requestId) {
                  <div class="ts-queue-row" [class.expanded]="expandedId() === item.requestId" [class.flagged]="item.riskLevel === 'flagged'" [class.selected]="selectedIds().has(item.requestId)" [class.comfortable]="density() === 'comfortable'" (click)="toggleExpand(item.requestId, $event)">
                    <label class="ts-queue-check" (click)="$event.stopPropagation()"><input type="checkbox" [checked]="selectedIds().has(item.requestId)" (change)="toggleSelect(item.requestId)"></label>
                    <div class="ts-avatar" [style.background]="getAvatarColor(item.employeeName)">{{ getInitials(item.employeeName) }}</div>
                    <div class="ts-queue-info"><span class="ts-queue-name">{{ item.employeeName }}</span><span class="ts-queue-date">{{ item.workDate | date:'MMM d, y' }}</span></div>
                    <div class="ts-change-chip" [class]="'ts-chip-' + getChangeChipType(item)">{{ item.changeSummary }}@if (item.changeDetail) { <span class="ts-change-extra">{{ item.changeDetail }}</span> }</div>
                    <div class="ts-risk-badge">@if (item.riskLevel === 'flagged') { <span class="ts-badge-flag"><i class="pi pi-exclamation-triangle"></i> Review</span> }</div>
                    <span class="ts-queue-relative">{{ item.submittedRelative }}</span>
                    <div class="ts-queue-actions" (click)="$event.stopPropagation()">
                      @if (canApprove) {
                        <button class="ts-action-btn approve" title="Approve" (click)="quickApprove(item.requestId)"><i class="pi pi-check"></i></button>
                      }
                      @if (canReject) {
                        <button class="ts-action-btn reject" title="Reject" (click)="showQuickReject(item, $event)"><i class="pi pi-times"></i></button>
                      }
                    </div>
                  </div>
                  @if (expandedId() === item.requestId) {
                    <div class="ts-inline-expand">
                      <div class="ts-compare-grid">
                        @if (hasChange(item.originalStatus, item.requestedStatus)) { <div class="ts-compare-row"><span class="ts-compare-label">Status</span><span class="ts-compare-old">{{ item.originalStatus | titlecase }}</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ item.requestedStatus | titlecase }}</span></div> }
                        @if (hasChange(item.originalCheckIn, item.requestedCheckIn)) { <div class="ts-compare-row"><span class="ts-compare-label">Clock In</span><span class="ts-compare-old">{{ item.originalCheckIn ? (item.originalCheckIn | date:'HH:mm') : '—' }}</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ item.requestedCheckIn ? (item.requestedCheckIn | date:'HH:mm') : '—' }}</span></div> }
                        @if (hasChange(item.originalCheckOut, item.requestedCheckOut)) { <div class="ts-compare-row"><span class="ts-compare-label">Clock Out</span><span class="ts-compare-old">{{ item.originalCheckOut ? (item.originalCheckOut | date:'HH:mm') : '—' }}</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ item.requestedCheckOut ? (item.requestedCheckOut | date:'HH:mm') : '—' }}</span></div> }
                        @if (hasNumChange(item.originalOvertimeHours, item.requestedOvertimeHours)) { <div class="ts-compare-row"><span class="ts-compare-label">Overtime</span><span class="ts-compare-old">{{ item.originalOvertimeHours || 0 }}h</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ item.requestedOvertimeHours || 0 }}h</span></div> }
                        @if (hasNumChange(item.originalLateMinutes, item.requestedLateMinutes)) { <div class="ts-compare-row"><span class="ts-compare-label">Late</span><span class="ts-compare-old">{{ item.originalLateMinutes || 0 }}m</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ item.requestedLateMinutes || 0 }}m</span></div> }
                      </div>
                      @if (item.riskReasons.length > 0) {
                        <div class="ts-risk-reasons">
                          @for (reason of item.riskReasons; track reason) { <span class="ts-risk-tag"><i class="pi pi-info-circle"></i> {{ reason }}</span> }
                        </div>
                      }
                      <div class="ts-reason-block"><span class="ts-reason-label">Reason:</span> {{ item.reasonForEdit }}</div>
                      @if (item.requestedNotes) { <div class="ts-reason-block ts-notes"><span class="ts-reason-label">Notes:</span> {{ item.requestedNotes }}</div> }
                      <div class="ts-expand-footer"><button class="ts-link-btn" (click)="openReviewView(item, $event)">Open Full Review <i class="pi pi-arrow-right"></i></button></div>
                    </div>
                  }
                }
              </div>
            }
          }

          @if (activeFilter() === 'all' || activeFilter() === 'routine') {
            @if (routineItems().length > 0) {
              <div class="ts-group-section">
                <div class="ts-group-header ts-group-routine"><i class="pi pi-check-circle"></i><span>Routine</span><span class="ts-group-count">{{ routineItems().length }}</span></div>
                @for (item of routineItems(); track item.requestId) {
                  <div class="ts-queue-row" [class.expanded]="expandedId() === item.requestId" [class.selected]="selectedIds().has(item.requestId)" [class.comfortable]="density() === 'comfortable'" (click)="toggleExpand(item.requestId, $event)">
                    <label class="ts-queue-check" (click)="$event.stopPropagation()"><input type="checkbox" [checked]="selectedIds().has(item.requestId)" (change)="toggleSelect(item.requestId)"></label>
                    <div class="ts-avatar" [style.background]="getAvatarColor(item.employeeName)">{{ getInitials(item.employeeName) }}</div>
                    <div class="ts-queue-info"><span class="ts-queue-name">{{ item.employeeName }}</span><span class="ts-queue-date">{{ item.workDate | date:'MMM d, y' }}</span></div>
                    <div class="ts-change-chip" [class]="'ts-chip-' + getChangeChipType(item)">{{ item.changeSummary }}@if (item.changeDetail) { <span class="ts-change-extra">{{ item.changeDetail }}</span> }</div>
                    <div class="ts-risk-badge"></div>
                    <span class="ts-queue-relative">{{ item.submittedRelative }}</span>
                    <div class="ts-queue-actions" (click)="$event.stopPropagation()">
                      @if (canApprove) {
                        <button class="ts-action-btn approve" title="Approve" (click)="quickApprove(item.requestId)"><i class="pi pi-check"></i></button>
                      }
                      @if (canReject) {
                        <button class="ts-action-btn reject" title="Reject" (click)="showQuickReject(item, $event)"><i class="pi pi-times"></i></button>
                      }
                    </div>
                  </div>
                  @if (expandedId() === item.requestId) {
                    <div class="ts-inline-expand">
                      <div class="ts-compare-grid">
                        @if (hasChange(item.originalStatus, item.requestedStatus)) { <div class="ts-compare-row"><span class="ts-compare-label">Status</span><span class="ts-compare-old">{{ item.originalStatus | titlecase }}</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ item.requestedStatus | titlecase }}</span></div> }
                        @if (hasChange(item.originalCheckIn, item.requestedCheckIn)) { <div class="ts-compare-row"><span class="ts-compare-label">Clock In</span><span class="ts-compare-old">{{ item.originalCheckIn ? (item.originalCheckIn | date:'HH:mm') : '—' }}</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ item.requestedCheckIn ? (item.requestedCheckIn | date:'HH:mm') : '—' }}</span></div> }
                        @if (hasChange(item.originalCheckOut, item.requestedCheckOut)) { <div class="ts-compare-row"><span class="ts-compare-label">Clock Out</span><span class="ts-compare-old">{{ item.originalCheckOut ? (item.originalCheckOut | date:'HH:mm') : '—' }}</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ item.requestedCheckOut ? (item.requestedCheckOut | date:'HH:mm') : '—' }}</span></div> }
                        @if (hasNumChange(item.originalOvertimeHours, item.requestedOvertimeHours)) { <div class="ts-compare-row"><span class="ts-compare-label">Overtime</span><span class="ts-compare-old">{{ item.originalOvertimeHours || 0 }}h</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ item.requestedOvertimeHours || 0 }}h</span></div> }
                        @if (hasNumChange(item.originalLateMinutes, item.requestedLateMinutes)) { <div class="ts-compare-row"><span class="ts-compare-label">Late</span><span class="ts-compare-old">{{ item.originalLateMinutes || 0 }}m</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ item.requestedLateMinutes || 0 }}m</span></div> }
                      </div>
                      <div class="ts-reason-block"><span class="ts-reason-label">Reason:</span> {{ item.reasonForEdit }}</div>
                      <div class="ts-expand-footer"><button class="ts-link-btn" (click)="openReviewView(item, $event)">Open Full Review <i class="pi pi-arrow-right"></i></button></div>
                    </div>
                  }
                }
              </div>
            }
          }

          @if (selectedIds().size > 0) {
            <div class="ts-bulk-bar">
              <div class="ts-bulk-left">
                <span class="ts-bulk-count">{{ selectedIds().size }} selected</span>
                <button class="ts-link-btn ts-link-light" (click)="clearSelection()">Clear</button>
              </div>
              <div class="ts-bulk-right">
                @if (hasFlaggedInSelection()) {
                  <div class="ts-bulk-warning">
                    <i class="pi pi-exclamation-triangle"></i>
                    <span>{{ flaggedInSelectionCount() }} flagged item(s) selected for review.</span>
                    <label class="ts-bulk-confirm-label"><input type="checkbox" [ngModel]="bulkConfirmChecked()" (ngModelChange)="bulkConfirmChecked.set($event)"> I've reviewed them</label>
                  </div>
                }
                @if (canReject) {
                  <button class="ts-btn-outline-light" (click)="bulkReject()">Reject Selected</button>
                }
                @if (canApprove) {
                  <button class="ts-btn-solid-light" (click)="bulkApprove()" [disabled]="hasFlaggedInSelection() && !bulkConfirmChecked()">Approve Selected</button>
                }
              </div>
            </div>
          }

          @if (quickRejectVisible()) {
            <div class="ts-quick-reject-overlay" (click)="quickRejectVisible.set(false)">
              <div class="ts-quick-reject-popover" (click)="$event.stopPropagation()">
                <div class="ts-qr-header"><span>Reject — {{ quickRejectTarget()?.employeeName }}</span><span class="ts-qr-date">{{ quickRejectTarget()?.workDate | date:'MMM d, y' }}</span></div>
                <div class="ts-qr-chips">
                  @for (reason of quickRejectReasons; track reason) { <button class="ts-reject-chip" (click)="applyQuickRejectReason(reason)">{{ reason }}</button> }
                </div>
                <textarea pInputTextarea [(ngModel)]="quickRejectReasonText" rows="3" placeholder="Explain why this correction is rejected..." class="ts-qr-textarea"></textarea>
                <div class="ts-qr-hint">This will be visible to the employee and shown when they resubmit.</div>
                <div class="ts-qr-actions">
                  <button class="ts-btn-cancel" (click)="quickRejectVisible.set(false)">Cancel</button>
                  <button class="ts-btn-reject" [disabled]="!quickRejectReasonText" (click)="confirmQuickReject()">Reject</button>
                </div>
              </div>
            </div>
          }
        }
      </div>

      @if (reviewItem()) {
        <div class="ts-review-backdrop" (click)="closeReviewView()"></div>
        <div class="ts-review-panel">
          <div class="ts-review-header">
            <button class="ts-review-close" (click)="closeReviewView()"><i class="pi pi-times"></i></button>
            <div class="ts-review-title-row">
              <div class="ts-avatar ts-avatar-lg" [style.background]="getAvatarColor(reviewItem()!.employeeName)">{{ getInitials(reviewItem()!.employeeName) }}</div>
              <div><div class="ts-review-emp-name">{{ reviewItem()!.employeeName }}</div><div class="ts-review-subtitle">Correction for {{ reviewItem()!.workDate | date:'EEE, MMM d, y' }}</div></div>
              <app-status-badge [status]="reviewItem()!.status"></app-status-badge>
            </div>
            <div class="ts-review-nav">
              <button class="ts-link-btn" [disabled]="!hasPrevReview()" (click)="prevReviewItem()"><i class="pi pi-chevron-left"></i> Previous</button>
              <span class="ts-review-position">{{ reviewIndex() + 1 }} of {{ reviewQueue().length }}</span>
              <button class="ts-link-btn" [disabled]="!hasNextReview()" (click)="nextReviewItem()">Next <i class="pi pi-chevron-right"></i></button>
            </div>
          </div>
          <div class="ts-review-body">
            @if (reviewItem()!.riskLevel === 'flagged') {
              <div class="ts-review-risk-banner"><i class="pi pi-exclamation-triangle"></i><div><strong>Flagged for review</strong><span>{{ reviewItem()!.riskReasons.join('; ') }}</span></div></div>
            }
            <div class="ts-review-section">
              <h4 class="ts-review-section-title">Original vs Proposed</h4>
              <div class="ts-compare-grid">
                @if (hasChange(reviewItem()!.originalStatus, reviewItem()!.requestedStatus)) { <div class="ts-compare-row"><span class="ts-compare-label">Status</span><span class="ts-compare-old">{{ reviewItem()!.originalStatus | titlecase }}</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ reviewItem()!.requestedStatus | titlecase }}</span></div> }
                @if (hasChange(reviewItem()!.originalCheckIn, reviewItem()!.requestedCheckIn)) { <div class="ts-compare-row"><span class="ts-compare-label">Clock In</span><span class="ts-compare-old">{{ reviewItem()!.originalCheckIn ? (reviewItem()!.originalCheckIn | date:'HH:mm') : '—' }}</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ reviewItem()!.requestedCheckIn ? (reviewItem()!.requestedCheckIn | date:'HH:mm') : '—' }}</span></div> }
                @if (hasChange(reviewItem()!.originalCheckOut, reviewItem()!.requestedCheckOut)) { <div class="ts-compare-row"><span class="ts-compare-label">Clock Out</span><span class="ts-compare-old">{{ reviewItem()!.originalCheckOut ? (reviewItem()!.originalCheckOut | date:'HH:mm') : '—' }}</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ reviewItem()!.requestedCheckOut ? (reviewItem()!.requestedCheckOut | date:'HH:mm') : '—' }}</span></div> }
                @if (hasNumChange(reviewItem()!.originalOvertimeHours, reviewItem()!.requestedOvertimeHours)) { <div class="ts-compare-row"><span class="ts-compare-label">Overtime</span><span class="ts-compare-old">{{ reviewItem()!.originalOvertimeHours || 0 }}h</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ reviewItem()!.requestedOvertimeHours || 0 }}h</span></div> }
                @if (hasNumChange(reviewItem()!.originalLateMinutes, reviewItem()!.requestedLateMinutes)) { <div class="ts-compare-row"><span class="ts-compare-label">Late</span><span class="ts-compare-old">{{ reviewItem()!.originalLateMinutes || 0 }}m</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ reviewItem()!.requestedLateMinutes || 0 }}m</span></div> }
                @if (hasChange(reviewItem()!.originalLeaveTypeName || reviewItem()!.originalLeaveTypeId, reviewItem()!.requestedLeaveTypeName || reviewItem()!.requestedLeaveTypeId)) { <div class="ts-compare-row"><span class="ts-compare-label">Leave</span><span class="ts-compare-old">{{ reviewItem()!.originalLeaveTypeName || '—' }}</span><span class="ts-compare-arrow">→</span><span class="ts-compare-new">{{ reviewItem()!.requestedLeaveTypeName || '—' }}</span></div> }
              </div>
            </div>
            @if (hasPayrollImpact(reviewItem()!)) {
              <div class="ts-review-section"><div class="ts-payroll-warning"><i class="pi pi-dollar"></i><div><strong>Payroll Impact</strong><span>Overtime or hours change may affect payroll calculation.</span></div></div></div>
            }
            <div class="ts-review-section">
              <h4 class="ts-review-section-title">Reason from {{ reviewItem()!.employeeName }}</h4>
              <div class="ts-review-reason">{{ reviewItem()!.reasonForEdit }}</div>
              @if (reviewItem()!.requestedNotes) { <div class="ts-review-notes"><span class="ts-reason-label">Notes:</span> {{ reviewItem()!.requestedNotes }}</div> }
            </div>
            <div class="ts-review-section">
              <button class="ts-link-btn" (click)="showPatternContext.set(!showPatternContext())"><i class="pi" [ngClass]="showPatternContext() ? 'pi-chevron-down' : 'pi-chevron-right'"></i> {{ reviewItem()!.employeeName }}'s corrections this period ({{ employeeCorrectionsCount() }})</button>
              @if (showPatternContext()) {
                <div class="ts-pattern-list">
                  @for (pc of employeeCorrections(); track pc.requestId) {
                    <div class="ts-pattern-item" [class.current]="pc.requestId === reviewItem()!.requestId"><span class="ts-pattern-date">{{ pc.workDate | date:'MMM d' }}</span><span class="ts-pattern-summary">{{ pc.changeSummary }}</span><app-status-badge [status]="pc.status"></app-status-badge></div>
                  }
                  @if (employeeCorrections().length === 0) { <div class="ts-pattern-empty">No other corrections this period.</div> }
                </div>
              }
            </div>
            <div class="ts-review-section">
              <button class="ts-link-btn" (click)="showAuditTimeline.set(!showAuditTimeline())"><i class="pi" [ngClass]="showAuditTimeline() ? 'pi-chevron-down' : 'pi-chevron-right'"></i> View full audit history for this record</button>
              @if (showAuditTimeline()) {
                <div class="ts-audit-container"><app-timesheet-audit-timeline [timesheetId]="selectedPeriodId()!"></app-timesheet-audit-timeline></div>
              }
            </div>
          </div>
          <div class="ts-review-footer">
            @if (canReject) {
              <button class="ts-btn-reject-full" (click)="openReviewReject()"><i class="pi pi-times"></i> Reject</button>
            }
            @if (canApprove) {
              <button class="ts-btn-approve-full" (click)="approve(reviewItem()!.requestId)"><i class="pi pi-check"></i> Approve</button>
            }
          </div>
        </div>
        @if (reviewRejectVisible()) {
          <div class="ts-quick-reject-overlay" style="z-index:1100" (click)="reviewRejectVisible.set(false)">
            <div class="ts-quick-reject-popover ts-review-reject-pop" (click)="$event.stopPropagation()">
              <div class="ts-qr-header"><span>Reject Correction</span><span class="ts-qr-date">{{ reviewItem()?.workDate | date:'MMM d, y' }}</span></div>
              <div class="ts-qr-chips">
                @for (reason of quickRejectReasons; track reason) { <button class="ts-reject-chip" (click)="applyReviewRejectReason(reason)">{{ reason }}</button> }
              </div>
              <textarea pInputTextarea [(ngModel)]="reviewRejectText" rows="3" placeholder="Explain why this correction is rejected..." class="ts-qr-textarea"></textarea>
              <div class="ts-qr-hint">This will be visible to the employee and shown when they resubmit.</div>
              <div class="ts-qr-actions">
                <button class="ts-btn-cancel" (click)="reviewRejectVisible.set(false)">Cancel</button>
                <button class="ts-btn-reject" [disabled]="!reviewRejectText" (click)="confirmReviewReject()">Reject</button>
              </div>
            </div>
          </div>
        }
      }
    }
  `,
  styleUrls: ['./timesheet-approval-panel.component.scss']
})
export class TimesheetApprovalPanelComponent implements OnInit {
  periods = signal<{ timesheetId: string; timesheetName: string; periodStart: string; periodEnd: string; status: string }[]>([]);
  loadingPeriods = true;
  selectedPeriodId = signal<string | null>(null);
  selectedPeriodName = signal<string | null>(null);
  loading = false;

  rawCorrections = signal<PendingCorrection[]>([]);
  activeFilter = signal<'all' | 'flagged' | 'routine'>('all');
  density = signal<'compact' | 'comfortable'>('compact');
  expandedId = signal<string | null>(null);
  selectedIds = signal(new Set<string>());
  bulkConfirmChecked = signal(false);

  quickRejectVisible = signal(false);
  quickRejectTarget = signal<PendingCorrection | null>(null);
  quickRejectReasonText = '';
  readonly quickRejectReasons = ['Missing details', 'Time discrepancy', 'Needs manager discussion', 'Other'];

  reviewItem = signal<QueueItem | null>(null);
  reviewIndex = signal(0);
  showPatternContext = signal(false);
  showAuditTimeline = signal(false);
  reviewRejectVisible = signal(false);
  reviewRejectText = '';

  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  get canApprove(): boolean {
    return this.authService.hasPermissionByActionKey('timesheet_approvals_approve');
  }

  get canReject(): boolean {
    return this.authService.hasPermissionByActionKey('timesheet_approvals_reject');
  }

  queueItems = computed(() => {
    const raw = this.rawCorrections();
    const all = raw.map(c => this.classifyRisk(c));
    return all.sort((a, b) => {
      if (a.sortPriority !== b.sortPriority) return b.sortPriority - a.sortPriority;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    });
  });

  flaggedItems = computed(() => this.queueItems().filter(i => i.riskLevel === 'flagged'));
  routineItems = computed(() => this.queueItems().filter(i => i.riskLevel === 'routine'));

  reviewQueue = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'flagged') return this.flaggedItems();
    if (filter === 'routine') return this.routineItems();
    return this.queueItems();
  });

  hasFlaggedInSelection = computed(() => {
    const ids = this.selectedIds();
    return this.flaggedItems().some(i => ids.has(i.requestId));
  });

  flaggedInSelectionCount = computed(() => {
    const ids = this.selectedIds();
    return this.flaggedItems().filter(i => ids.has(i.requestId)).length;
  });

  employeeCorrections = computed(() => {
    const rev = this.reviewItem();
    if (!rev) return [];
    return this.queueItems().filter(i => i.employeeId === rev.employeeId);
  });

  employeeCorrectionsCount = computed(() => this.employeeCorrections().length);

  constructor(private api: TimesheetService) {}

  ngOnInit() {
    this.api.getPeriods().subscribe({
      next: (data) => { this.periods.set(data); this.loadingPeriods = false; },
      error: () => { this.loadingPeriods = false; }
    });
  }

  selectPeriod(timesheetId: string, timesheetName: string) {
    this.selectedPeriodId.set(timesheetId);
    this.selectedPeriodName.set(timesheetName);
    this.loadCorrections(timesheetId);
  }

  deselectPeriod() {
    this.selectedPeriodId.set(null);
    this.selectedPeriodName.set(null);
    this.rawCorrections.set([]);
    this.closeReviewView();
  }

  loadCorrections(timesheetId: string) {
    this.loading = true;
    this.api.getPendingCorrections(timesheetId).subscribe({
      next: (data) => { this.rawCorrections.set(data); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  private classifyRisk(c: PendingCorrection): QueueItem {
    const reasons: string[] = [];
    let flagged = false;

    const otDelta = Math.abs((c.requestedOvertimeHours || 0) - (c.originalOvertimeHours || 0));
    if (otDelta > 2) { reasons.push('Overtime change exceeds 2h (' + otDelta.toFixed(1) + 'h delta)'); flagged = true; }

    if (c.originalStatus && c.requestedStatus && c.originalStatus !== c.requestedStatus && c.originalStatus.toLowerCase() === 'present') {
      reasons.push('Status changed from Present to ' + (c.requestedStatus || ''));
      flagged = true;
    }

    const sameEmployeeCount = this.rawCorrections().filter(r => r.employeeId === c.employeeId).length;
    if (sameEmployeeCount >= 2) { reasons.push(c.employeeName + ' has ' + sameEmployeeCount + ' corrections this period'); flagged = true; }

    return {
      ...c,
      riskLevel: flagged ? 'flagged' : 'routine',
      riskReasons: reasons,
      changeSummary: this.buildChangeSummary(c),
      changeDetail: this.buildChangeDetail(c),
      sortPriority: flagged ? 1 : 0,
      submittedRelative: this.relativeTime(c.submittedAt),
    };
  }

  private buildChangeSummary(c: PendingCorrection): string {
    if (this.hasChange(c.originalStatus, c.requestedStatus)) {
      return 'Status → ' + (c.requestedStatus ? c.requestedStatus.charAt(0).toUpperCase() + c.requestedStatus.slice(1) : '—');
    }
    if (this.hasNumChange(c.originalOvertimeHours, c.requestedOvertimeHours)) {
      const delta = (c.requestedOvertimeHours || 0) - (c.originalOvertimeHours || 0);
      return (delta >= 0 ? '+' : '') + delta.toFixed(1) + 'h OT';
    }
    if (this.hasNumChange(c.originalLateMinutes, c.requestedLateMinutes)) {
      return 'Late: ' + (c.originalLateMinutes || 0) + 'm → ' + (c.requestedLateMinutes || 0) + 'm';
    }
    if (this.hasChange(c.originalCheckIn, c.requestedCheckIn) || this.hasChange(c.originalCheckOut, c.requestedCheckOut)) {
      const fields = [];
      if (this.hasChange(c.originalCheckIn, c.requestedCheckIn)) fields.push('Check-in');
      if (this.hasChange(c.originalCheckOut, c.requestedCheckOut)) fields.push('Check-out');
      return fields.join(', ');
    }
    if (this.hasChange(c.originalLeaveTypeName, c.requestedLeaveTypeName)) {
      return 'Leave → ' + (c.requestedLeaveTypeName || '—');
    }
    return 'Notes updated';
  }

  private buildChangeDetail(c: PendingCorrection): string {
    const count = this.getChangedFieldCount(c);
    return count > 1 ? '+' + (count - 1) + ' more' : '';
  }

  getChangedFieldCount(c: PendingCorrection): number {
    let count = 0;
    if (this.hasChange(c.originalStatus, c.requestedStatus)) count++;
    if (this.hasChange(c.originalCheckIn, c.requestedCheckIn)) count++;
    if (this.hasChange(c.originalCheckOut, c.requestedCheckOut)) count++;
    if (this.hasNumChange(c.originalOvertimeHours, c.requestedOvertimeHours)) count++;
    if (this.hasNumChange(c.originalLateMinutes, c.requestedLateMinutes)) count++;
    if (this.hasChange(c.originalLeaveTypeName || c.originalLeaveTypeId, c.requestedLeaveTypeName || c.requestedLeaveTypeId)) count++;
    return count || 1;
  }

  getChangeChipType(c: PendingCorrection): string {
    if (this.hasChange(c.originalStatus, c.requestedStatus)) return 'status';
    if (this.hasNumChange(c.originalOvertimeHours, c.requestedOvertimeHours)) return 'ot';
    if (this.hasNumChange(c.originalLateMinutes, c.requestedLateMinutes)) return 'late';
    if (this.hasChange(c.originalCheckIn, c.requestedCheckIn) || this.hasChange(c.originalCheckOut, c.requestedCheckOut)) return 'time';
    if (this.hasChange(c.originalLeaveTypeName, c.requestedLeaveTypeName)) return 'leave';
    return 'mixed';
  }

  hasChange(original?: string | null, requested?: string | null): boolean {
    return (original || '').trim().toLowerCase() !== (requested || '').trim().toLowerCase();
  }

  hasNumChange(original?: number | null, requested?: number | null): boolean {
    return (original ?? 0) !== (requested ?? 0);
  }

  hasPayrollImpact(c: PendingCorrection): boolean {
    return this.hasNumChange(c.originalOvertimeHours, c.requestedOvertimeHours) || this.hasChange(c.originalStatus, c.requestedStatus);
  }

  getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = ['#2563eb', '#E74C3C', '#2ECC71', '#F39C12', '#3b82f6', '#1ABC9C', '#E67E22', '#3498DB'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  relativeTime(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    return days + 'd ago';
  }

  toggleExpand(id: string, event: Event) {
    const target = event.target as HTMLElement;
    if (target.closest('.ts-queue-actions') || target.closest('.ts-queue-check')) return;
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  toggleSelect(id: string) {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.selectedIds.set(next);
    this.bulkConfirmChecked.set(false);
  }

  clearSelection() { this.selectedIds.set(new Set()); this.bulkConfirmChecked.set(false); }

  quickApprove(requestId: string) {
    this.api.approveCorrection(requestId).subscribe({
      next: () => {
        this.snackBar.open('Approved', '✓', { duration: 2500, panelClass: ['ts-toast-success'] });
        this.loadCorrections(this.selectedPeriodId()!);
        if (this.reviewItem()?.requestId === requestId) this.advanceReviewOrClose();
      },
      error: () => { this.snackBar.open('Approval failed', 'Dismiss', { duration: 3000 }); }
    });
  }

  approve(requestId: string) { this.quickApprove(requestId); }

  bulkApprove() {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;
    this.api.approveBulk({ correctionIds: ids }).subscribe({
      next: (count) => {
        this.snackBar.open(count + ' correction(s) approved', '✓', { duration: 3000, panelClass: ['ts-toast-success'] });
        this.clearSelection();
        this.loadCorrections(this.selectedPeriodId()!);
      },
      error: (err) => {
        this.snackBar.open('Bulk approval failed: ' + (err?.error?.message || 'Unknown error') + '. Try approving individually.', 'Dismiss', { duration: 5000 });
      }
    });
  }

  bulkReject() {
    this.quickRejectTarget.set(null);
    this.quickRejectReasonText = '';
    this.quickRejectVisible.set(true);
  }

  showQuickReject(item: PendingCorrection, event: Event) {
    event.stopPropagation();
    this.quickRejectTarget.set(item);
    this.quickRejectReasonText = '';
    this.quickRejectVisible.set(true);
  }

  applyQuickRejectReason(reason: string) { this.quickRejectReasonText = reason + ': '; }

  confirmQuickReject() {
    if (!this.quickRejectReasonText) return;
    const target = this.quickRejectTarget();
    if (target) {
      this.api.rejectCorrection(target.requestId, this.quickRejectReasonText).subscribe({
        next: () => {
          this.snackBar.open('Rejected — ' + target.employeeName + ' will be notified', '✓', { duration: 3000 });
          this.quickRejectVisible.set(false);
          this.loadCorrections(this.selectedPeriodId()!);
          if (this.reviewItem()?.requestId === target.requestId) this.advanceReviewOrClose();
        },
        error: () => { this.snackBar.open('Rejection failed', 'Dismiss', { duration: 3000 }); }
      });
    } else {
      const ids = Array.from(this.selectedIds());
      let completed = 0; let failed = 0;
      ids.forEach(id => {
        this.api.rejectCorrection(id, this.quickRejectReasonText).subscribe({
          next: () => { completed++; this.checkBulkDone(completed, failed, ids.length); },
          error: () => { failed++; this.checkBulkDone(completed, failed, ids.length); }
        });
      });
    }
  }

  private checkBulkDone(completed: number, failed: number, total: number) {
    if (completed + failed === total) {
      this.quickRejectVisible.set(false);
      this.clearSelection();
      this.loadCorrections(this.selectedPeriodId()!);
      this.snackBar.open(failed > 0 ? completed + ' rejected, ' + failed + ' failed' : completed + ' correction(s) rejected', failed > 0 ? '⚠' : '✓', { duration: 3000 });
    }
  }

  openReviewView(item: QueueItem, event: Event) {
    event.stopPropagation();
    const queue = this.reviewQueue();
    const idx = queue.findIndex(q => q.requestId === item.requestId);
    this.reviewIndex.set(idx >= 0 ? idx : 0);
    this.reviewItem.set(queue[idx >= 0 ? idx : 0]);
    this.showPatternContext.set(false);
    this.showAuditTimeline.set(false);
  }

  closeReviewView() { this.reviewItem.set(null); this.reviewRejectVisible.set(false); }
  hasPrevReview(): boolean { return this.reviewIndex() > 0; }
  hasNextReview(): boolean { return this.reviewIndex() < this.reviewQueue().length - 1; }

  prevReviewItem() {
    if (!this.hasPrevReview()) return;
    const idx = this.reviewIndex() - 1;
    this.reviewIndex.set(idx);
    this.reviewItem.set(this.reviewQueue()[idx]);
    this.showPatternContext.set(false);
    this.showAuditTimeline.set(false);
  }

  nextReviewItem() {
    if (!this.hasNextReview()) return;
    const idx = this.reviewIndex() + 1;
    this.reviewIndex.set(idx);
    this.reviewItem.set(this.reviewQueue()[idx]);
    this.showPatternContext.set(false);
    this.showAuditTimeline.set(false);
  }

  advanceReviewOrClose() { if (this.hasNextReview()) this.nextReviewItem(); else this.closeReviewView(); }

  openReviewReject() { this.reviewRejectText = ''; this.reviewRejectVisible.set(true); }
  applyReviewRejectReason(reason: string) { this.reviewRejectText = reason + ': '; }

  confirmReviewReject() {
    const item = this.reviewItem();
    if (!item || !this.reviewRejectText) return;
    this.api.rejectCorrection(item.requestId, this.reviewRejectText).subscribe({
      next: () => {
        this.snackBar.open('Rejected — ' + item.employeeName + ' will be notified', '✓', { duration: 3000 });
        this.reviewRejectVisible.set(false);
        this.loadCorrections(this.selectedPeriodId()!);
        this.advanceReviewOrClose();
      },
      error: () => { this.snackBar.open('Rejection failed', 'Dismiss', { duration: 3000 }); }
    });
  }
}
