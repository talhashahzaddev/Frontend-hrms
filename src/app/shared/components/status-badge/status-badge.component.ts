import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="ts-badge" [ngClass]="cssClass">
      @if (showLock) { <i class="pi pi-lock" style="font-size: 10px; margin-right: 3px;"></i> }{{ status }}
    </span>
  `
})
export class StatusBadgeComponent implements OnChanges {
  @Input() status = '';
  cssClass = '';
  showLock = false;

  private map: Record<string, string> = {
    draft: 'ts-draft',
    inprogress: 'ts-inprogress',
    submitted: 'ts-submitted',
    underreview: 'ts-underreview',
    approved: 'ts-approved',
    finalized: 'ts-finalized',
    locked: 'ts-locked',
    archived: 'ts-archived',
    pending: 'ts-pending',
    active: 'ts-active',
    inactive: 'ts-inactive',
    rejected: 'ts-error',
  };

  ngOnChanges() {
    const key = this.status?.toLowerCase() || '';
    this.cssClass = this.map[key] || 'ts-draft';
    this.showLock = key === 'locked' || key === 'finalized';
  }
}
