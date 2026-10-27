import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {
  status: 'verifying' | 'verified' | 'failed' = 'verifying';
  message = 'Verifying your email…';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status = 'failed';
      this.message = 'This verification link is missing its token. Request a new verification email.';
      return;
    }

    // Call backend verify-email API
    this.authService.verifyEmail(token).subscribe({
      next: (res) => {
        if (res.success && res.data === true) {
          this.status = 'verified';
          this.message = 'Your email has been verified. You can now log in.';
        } else {
          this.status = 'failed';
          this.message = res.message || 'This verification link is invalid or has expired. Request a new one.';
        }
      },
      error: (error) => {
        this.status = 'failed';
        this.message = error?.error?.message || 'We could not verify your email. Please try again or request a new link.';
      }
    });
  }
}
