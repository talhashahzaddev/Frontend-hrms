import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SharedCommonModule } from '@shared/shared-common.module';

@Component({
  selector: 'app-plan-access',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, SharedCommonModule],
  template: `
    <main class="plan-access">
      <mat-icon aria-hidden="true">{{ hasLoadError ? 'error_outline' : 'lock' }}</mat-icon>
      <h1>{{ hasLoadError ? 'Plan access unavailable' : 'Upgrade your plan' }}</h1>
      <p *ngIf="hasLoadError">
        We could not load your organization's plan access. Please retry or contact your administrator.
      </p>
      <p *ngIf="!hasLoadError">
        This feature is not included in your organization's current plan.
        Ask your administrator about upgrading your subscription.
      </p>
      <a mat-flat-button color="primary" routerLink="/subscription">View plans</a>
      <a mat-button routerLink="/dashboard">Back to dashboard</a>
    </main>
  `,
  styles: [`
    .plan-access { min-height: 60vh; display: grid; justify-items: center; align-content: center; gap: 12px; text-align: center; padding: 32px; }
    .plan-access > mat-icon { width: 56px; height: 56px; font-size: 56px; color: #64748b; }
    .plan-access p { max-width: 520px; color: #64748b; }
  `]
})
export class PlanAccessComponent {
  readonly hasLoadError: boolean;

  constructor(route: ActivatedRoute) {
    this.hasLoadError = route.snapshot.queryParamMap.get('error') === 'entitlements';
  }
}
