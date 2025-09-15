import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-employee-form',
    imports: [CommonModule],
    template: `
    <div class="employee-form-container">
      <h1>Employee Form</h1>
      <p>Employee form functionality coming soon...</p>
    </div>
  `,
    styles: [`
    .employee-form-container {
      padding: 2rem;
      text-align: center;
    }
  `]
})
export class EmployeeFormComponent {}
