import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-loading-spinner',
    imports: [
        CommonModule,
        MatProgressSpinnerModule
    ],
    template: `
    <div class="loading-overlay">
      <div class="loading-content">
        <div class="spinner-container">
          <div class="custom-spinner"></div>
        </div>
        <div class="loading-text">
          <h3>{{ title }}</h3>
          <p>{{ message }}</p>
        </div>
      </div>
    </div>
  `,
    styleUrls: ['./loading-spinner.component.scss']
})
export class LoadingSpinnerComponent {
  @Input() title: string = 'Loading...';
  @Input() message: string = 'Please wait while we process your request';
}
