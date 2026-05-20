import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

/**
 * Redirects /payroll to the first ledger the user may view (bonus or performance), or dashboard.
 */
@Component({
  selector: 'app-payroll-default-redirect',
  standalone: true,
  template: ''
})
export class PayrollDefaultRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    if (this.authService.hasPermissionByActionKey('bonus_entry_view')) {
      void this.router.navigate(['/payroll/bonus'], { replaceUrl: true });
      return;
    }
    if (this.authService.hasPermissionByActionKey('performance_pay_view')) {
      void this.router.navigate(['/payroll/performance'], { replaceUrl: true });
      return;
    }
    void this.router.navigate(['/dashboard'], { replaceUrl: true });
  }
}
