import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimesheetService } from '../../services/timesheet.service';
import { TimesheetAuditEntry } from '../../models/timesheet.models';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

interface TimelineEntry {
  audit: TimesheetAuditEntry;
  icon: string;
  iconClass: string;
  label: string;
  colorVar: string;
  oldParsed?: Record<string, any>;
  newParsed?: Record<string, any>;
  expanded: boolean;
}

@Component({
  selector: 'app-timesheet-audit-timeline',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule, EmptyStateComponent],
  template: `
    <div class="audit-timeline-wrap">
      @if (loading()) {
        <div class="audit-loading">
          <p-progressSpinner strokeWidth="3" [style]="{'width': '28px', 'height': '28px'}"></p-progressSpinner>
        </div>
      } @else if (entries().length === 0) {
        <app-empty-state icon="pi-history" title="No audit history" message="No actions have been recorded for this timesheet yet."></app-empty-state>
      } @else {
        <div class="audit-timeline">
          @for (entry of entries(); track entry.audit.auditId; let i = $index; let last = $last) {
            <div class="audit-entry" [class.expanded]="entry.expanded">
              <!-- Timeline spine -->
              <div class="audit-spine">
                <div class="audit-dot" [style.background]="entry.colorVar" [style.box-shadow]="'0 0 0 3px ' + entry.colorVar + '22'"></div>
                @if (!last) {
                  <div class="audit-line"></div>
                }
              </div>

              <!-- Entry content -->
              <div class="audit-content" (click)="entry.expanded = !entry.expanded">
                <div class="audit-row">
                  <div class="audit-icon-wrap" [style.background]="entry.colorVar + '14'" [style.color]="entry.colorVar">
                    <i class="pi" [ngClass]="entry.icon"></i>
                  </div>
                  <div class="audit-text">
                    <span class="audit-label">{{ entry.label }}</span>
                    <span class="audit-meta">
                      <span class="audit-role">{{ entry.audit.actorRole }}</span>
                      <span class="audit-dot-sep">&middot;</span>
                      <span class="audit-time">{{ entry.audit.createdAt | date:'MMM d, y HH:mm' }}</span>
                    </span>
                  </div>
                  <i class="pi" [ngClass]="entry.expanded ? 'pi-chevron-up' : 'pi-chevron-down'" class="audit-toggle"></i>
                </div>

                <!-- Expanded diff view -->
                @if (entry.expanded) {
                  <div class="audit-diff">
                    @if (entry.audit.reason) {
                      <div class="audit-reason">
                        <strong>Reason:</strong> {{ entry.audit.reason }}
                      </div>
                    }
                    <div class="audit-diff-grid">
                      @if (entry.oldParsed) {
                        <div class="audit-diff-col">
                          <span class="audit-diff-header">Before</span>
                          @for (key of getObjectKeys(entry.oldParsed); track key) {
                            <div class="audit-diff-row">
                              <span class="audit-diff-key">{{ formatKey(key) }}</span>
                              <span class="audit-diff-val before">{{ formatVal(entry.oldParsed[key]) }}</span>
                            </div>
                          }
                        </div>
                      }
                      @if (entry.newParsed) {
                        <div class="audit-diff-col">
                          <span class="audit-diff-header">After</span>
                          @for (key of getObjectKeys(entry.newParsed); track key) {
                            <div class="audit-diff-row">
                              <span class="audit-diff-key">{{ formatKey(key) }}</span>
                              <span class="audit-diff-val after">{{ formatVal(entry.newParsed[key]) }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./timesheet-audit-timeline.component.scss']
})
export class TimesheetAuditTimelineComponent implements OnInit {
  @Input() timesheetId = '';

  entries = signal<TimelineEntry[]>([]);
  loading = signal(true);

  private actionConfig: Record<string, { icon: string; iconClass: string; label: string; colorVar: string }> = {
    'transition':          { icon: 'pi-arrow-right-arrow-left', iconClass: '', label: 'Status Transition', colorVar: '#2563eb' },
    'CorrectionApproved':  { icon: 'pi-check-circle',          iconClass: '', label: 'Correction Approved', colorVar: '#16A34A' },
    'CorrectionRejected':  { icon: 'pi-times-circle',          iconClass: '', label: 'Correction Rejected', colorVar: '#DC2626' },
    'OverrideApplied':     { icon: 'pi-pencil',                iconClass: '', label: 'Manager Override', colorVar: '#D97706' },
    'Finalized':           { icon: 'pi-lock',                  iconClass: '', label: 'Timesheet Finalized', colorVar: '#2563eb' },
    'Locked':              { icon: 'pi-lock',                  iconClass: '', label: 'Timesheet Locked', colorVar: '#DC2626' },
    'ReopenRequested':     { icon: 'pi-undo',                  iconClass: '', label: 'Reopen Requested', colorVar: '#D97706' },
  };

  private defaultConfig = { icon: 'pi-info-circle', iconClass: '', label: 'Action', colorVar: '#6B7280' };

  constructor(private api: TimesheetService) {}

  ngOnInit() {
    if (this.timesheetId) {
      this.loadAuditLog();
    }
  }

  private loadAuditLog() {
    this.loading.set(true);
    this.api.getAuditLog(this.timesheetId).subscribe({
      next: (data) => {
        this.entries.set(data.map(a => this.mapToTimeline(a)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private mapToTimeline(audit: TimesheetAuditEntry): TimelineEntry {
    const action = audit.action || '';
    const config = this.actionConfig[action] || { ...this.defaultConfig, label: this.formatActionLabel(action) };

    // Build a richer label for transitions
    let label = config.label;
    if (action === 'transition') {
      const oldStatus = this.tryParseJson(audit.oldValues)?.['status'];
      const newStatus = this.tryParseJson(audit.newValues)?.['status'];
      if (oldStatus && newStatus) {
        label = `Transitioned: ${oldStatus} → ${newStatus}`;
      }
    }

    return {
      audit,
      icon: config.icon,
      iconClass: config.iconClass,
      label,
      colorVar: config.colorVar,
      oldParsed: this.tryParseJson(audit.oldValues),
      newParsed: this.tryParseJson(audit.newValues),
      expanded: false
    };
  }

  private tryParseJson(str?: string): Record<string, any> | undefined {
    if (!str) return undefined;
    try {
      const parsed = JSON.parse(str);
      return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  private formatActionLabel(action: string): string {
    return action
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim();
  }

  getObjectKeys(obj: Record<string, any>): string[] {
    return Object.keys(obj);
  }

  formatKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  }

  formatVal(val: any): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }
}
