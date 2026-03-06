import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { PlatformAdminAuthService } from '../services/platform-admin-auth.service';

@Injectable({ providedIn: 'root' })
export class PlatformAdminGuard implements CanActivate, CanActivateChild {

  constructor(
    private platformAuthService: PlatformAdminAuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | boolean {
    return this.checkAuth();
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | boolean {
    return this.checkAuth();
  }

  private checkAuth(): Observable<boolean> {
    return this.platformAuthService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated && this.platformAuthService.isPlatformAdmin()) {
          return true;
        }
        this.router.navigate(['/platform-admin/login']);
        return false;
      })
    );
  }
}
