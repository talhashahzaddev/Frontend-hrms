import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-employee-detail',
    imports: [CommonModule],
    template: `
    <div class="employee-detail-container">
      <h1>Employee Detail</h1>
      <p>Employee detail functionality coming soon...</p>
    </div>
  `,
    styles: [`
    .employee-detail-container {
      padding: 2rem;
      text-align: center;
    }
  `]
})
export class EmployeeDetailComponent {}
