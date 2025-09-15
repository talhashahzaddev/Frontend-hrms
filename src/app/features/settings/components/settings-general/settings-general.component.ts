import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-settings-general',
    imports: [CommonModule],
    template: `
    <div class="settings-general-container">
      <h1>General Settings</h1>
      <p>Settings functionality coming soon...</p>
    </div>
  `,
    styles: [`
    .settings-general-container {
      padding: 2rem;
      text-align: center;
    }
  `]
})
export class SettingsGeneralComponent {}
