import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ts-page-header">
      <div class="ts-ph-left">
        <h1 class="ts-ph-title">{{ title }}</h1>
        @if (subtitle) { <span class="ts-ph-subtitle">{{ subtitle }}</span> }
      </div>
      <div class="ts-ph-actions">
        <ng-content select="[actions]"></ng-content>
      </div>
    </div>
    @if (breadcrumb) {
      <div class="ts-ph-breadcrumb">
        <ng-content select="[breadcrumb]"></ng-content>
      </div>
    }
  `,
  styles: [`
    .ts-page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--ts-space-6);
    }
    .ts-ph-left { min-width: 0; }
    .ts-ph-title {
      font-size: 20px;
      font-weight: 600;
      color: #1F2937;
      margin: 0;
      line-height: 1.3;
    }
    .ts-ph-subtitle {
      font-size: 13px;
      color: #6B7280;
      display: block;
      margin-top: 2px;
    }
    .ts-ph-actions {
      display: flex;
      gap: var(--ts-space-2);
      align-items: center;
      flex-shrink: 0;
    }
    .ts-ph-breadcrumb { margin-bottom: var(--ts-space-4); }
  `]
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() breadcrumb = false;
}
