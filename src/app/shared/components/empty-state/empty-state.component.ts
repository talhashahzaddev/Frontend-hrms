import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ts-empty-state">
      <div class="ts-empty-icon">
        <i [class]="'pi ' + icon"></i>
      </div>
      <div class="ts-empty-title">{{ title }}</div>
      @if (message) { <div class="ts-empty-message">{{ message }}</div> }
      <ng-content></ng-content>
    </div>
  `
})
export class EmptyStateComponent {
  @Input() icon = 'pi-inbox';
  @Input() title = 'No data found';
  @Input() message = '';
}
