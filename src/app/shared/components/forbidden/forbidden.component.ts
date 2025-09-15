import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-forbidden',
    imports: [
        CommonModule,
        RouterModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule
    ],
    template: `
    <div class="forbidden-container">
      <div class="forbidden-content">
        <mat-card class="error-card">
          <mat-card-content>
            <div class="error-icon">
              <mat-icon>block</mat-icon>
            </div>
            
            <div class="error-code">403</div>
            <h1 class="error-title">Access Forbidden</h1>
            <p class="error-description">
              You don't have permission to access this resource. 
              Please contact your administrator if you believe this is an error.
            </p>
            
            <div class="error-actions">
              <button mat-flat-button routerLink="/dashboard" class="primary-action">
                <mat-icon>home</mat-icon>
                Go to Dashboard
              </button>
              <button mat-stroked-button (click)="goBack()" class="secondary-action">
                <mat-icon>arrow_back</mat-icon>
                Go Back
              </button>
            </div>

            <div class="help-section">
              <h3>Need Help?</h3>
              <p>If you think you should have access to this page:</p>
              <ul>
                <li>Contact your system administrator</li>
                <li>Check if you're logged in with the correct account</li>
                <li>Verify your user permissions</li>
              </ul>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
    styles: [`
    .forbidden-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: var(--spacing-lg);
      background: linear-gradient(135deg, var(--gray-50) 0%, var(--red-50) 100%);
    }

    .forbidden-content {
      max-width: 600px;
      width: 100%;
    }

    .error-card {
      text-align: center;
      padding: var(--spacing-xl);
      border-radius: var(--radius-2xl);
      box-shadow: var(--shadow-xl);
      border: 1px solid var(--gray-200);
    }

    .error-icon {
      margin: 0 auto var(--spacing-xl);
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--danger-100);
      border-radius: 50%;

      mat-icon {
        font-size: 4rem;
        width: 4rem;
        height: 4rem;
        color: var(--danger-600);
      }
    }

    .error-code {
      font-size: 6rem;
      font-weight: 900;
      color: var(--danger-600);
      line-height: 1;
      margin-bottom: var(--spacing-lg);
    }

    .error-title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--gray-900);
      margin: 0 0 var(--spacing-lg);
      letter-spacing: -0.025em;
    }

    .error-description {
      font-size: 1.125rem;
      color: var(--gray-600);
      line-height: 1.6;
      margin: 0 0 var(--spacing-2xl);
    }

    .error-actions {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      align-items: center;
      margin-bottom: var(--spacing-2xl);
    }

    .primary-action {
      background: var(--gradient-primary);
      color: white;
      font-weight: 600;
      padding: var(--spacing-md) var(--spacing-xl);
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      min-width: 200px;

      &:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-lg);
      }
    }

    .secondary-action {
      border: 2px solid var(--gray-300);
      color: var(--gray-700);
      font-weight: 500;
      padding: var(--spacing-sm) var(--spacing-lg);
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      min-width: 200px;

      &:hover {
        border-color: var(--primary-300);
        background: var(--primary-50);
        color: var(--primary-700);
      }
    }

    .help-section {
      text-align: left;
      padding: var(--spacing-xl);
      background: var(--gray-50);
      border-radius: var(--radius-lg);
      border: 1px solid var(--gray-200);
      margin-top: var(--spacing-xl);

      h3 {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--gray-900);
        margin: 0 0 var(--spacing-md);
      }

      p {
        font-size: 0.875rem;
        color: var(--gray-600);
        margin: 0 0 var(--spacing-md);
      }

      ul {
        margin: 0;
        padding-left: var(--spacing-lg);
        
        li {
          font-size: 0.875rem;
          color: var(--gray-600);
          margin-bottom: var(--spacing-xs);
          line-height: 1.5;
        }
      }
    }

    @media (max-width: 640px) {
      .forbidden-container {
        padding: var(--spacing-md);
      }

      .error-code {
        font-size: 4rem;
      }

      .error-title {
        font-size: 1.5rem;
      }

      .error-description {
        font-size: 1rem;
      }

      .error-actions {
        gap: var(--spacing-sm);
      }

      .primary-action,
      .secondary-action {
        width: 100%;
      }

      .help-section {
        padding: var(--spacing-lg);
      }
    }

    // Dark theme support
    .dark-theme {
      .forbidden-container {
        background: linear-gradient(135deg, var(--gray-900) 0%, var(--gray-800) 100%);
      }

      .error-card {
        background: var(--gray-800);
        border-color: var(--gray-700);
      }

      .error-title {
        color: var(--gray-100);
      }

      .error-description {
        color: var(--gray-400);
      }

      .help-section {
        background: var(--gray-700);
        border-color: var(--gray-600);

        h3 {
          color: var(--gray-200);
        }

        p, li {
          color: var(--gray-400);
        }
      }
    }
  `]
})
export class ForbiddenComponent {
  
  goBack(): void {
    window.history.back();
  }
}
