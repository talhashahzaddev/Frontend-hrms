import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <header class="dashboard-header">
      <div class="header-left">
        @if (matIcon || icon) {
          <div class="app-icon">
            @if (matIcon) {
              <mat-icon>{{ matIcon }}</mat-icon>
            } @else {
              <i [class]="'pi ' + icon"></i>
            }
          </div>
        }
        <div class="header-info">
          <h2 class="header-title">{{ title }}</h2>
          @if (subtitle) {
            <p class="header-subtitle">{{ subtitle }}</p>
          }
        </div>
      </div>
      <div class="header-actions">
        <ng-content select="[actions]"></ng-content>
      </div>
    </header>
    @if (breadcrumb) {
      <div class="page-breadcrumb">
        <ng-content select="[breadcrumb]"></ng-content>
      </div>
    }
  `,
  styleUrls: ['./page-header.component.scss']
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() matIcon = '';
  @Input() icon = '';
  @Input() breadcrumb = false;
}
