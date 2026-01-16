import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      // No token → send to login
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    // Call backend verify-email API
    this.authService.verifyEmail(token).subscribe({
      next: (res) => {
        if (res.success && res.data === true) {
          this.router.navigate(['/login'], { replaceUrl: true });
        } else {
          window.location.replace('https://www.briskpeople.com');
        }
      },
      error: () => {
        window.location.replace('https://www.briskpeople.com');
      }
    });
  }
}
