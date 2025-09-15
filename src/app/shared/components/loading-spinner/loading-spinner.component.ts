import { Component } from '@angular/core';
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
          <h3>Loading...</h3>
          <p>Please wait while we process your request</p>
        </div>
      </div>
    </div>
  `,
    styleUrls: ['./loading-spinner.component.scss']
})
export class LoadingSpinnerComponent {}
