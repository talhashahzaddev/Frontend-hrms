import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ts-stat-card">
      @if (icon) {
        <div class="ts-stat-icon" [ngClass]="'ts-' + (color || 'primary')">
          <i [class]="'pi ' + icon"></i>
        </div>
      }
      <div class="ts-stat-content">
        <div class="ts-stat-value">{{ value }}</div>
        <div class="ts-stat-label">{{ label }}</div>
        @if (trend && trend !== 'flat') {
          <div class="ts-stat-trend" [ngClass]="'ts-trend-' + trend">
            <i [class]="'pi pi-arrow-' + (trend === 'up' ? 'up' : 'down')"></i>
            {{ trendValue }}
          </div>
        }
      </div>
    </div>
  `
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() icon = '';
  @Input() trend: 'up' | 'down' | 'flat' = 'flat';
  @Input() trendValue = '';
  @Input() color: 'primary' | 'success' | 'warning' | 'danger' = 'primary';
}
