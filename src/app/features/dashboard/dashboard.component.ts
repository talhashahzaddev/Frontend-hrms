import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { SuperAdminDashboardComponent } from './super-admin-dashboard/super-admin-dashboard.component';

/**
 * One dashboard for every role. Super Admins get the organization view; everyone else gets
 * their own work first, plus the team / HR widgets their role and plan allow.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SuperAdminDashboardComponent],
  template: `<app-super-admin-dashboard [mode]="mode" />`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  readonly mode: 'admin' | 'personal' = inject(AuthService).hasRole('Super Admin') ? 'admin' : 'personal';
}
