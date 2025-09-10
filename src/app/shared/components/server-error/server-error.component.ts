import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-server-error',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule
  ],
  template: `
    <div class="server-error-container">
      <div class="server-error-content">
        <mat-card class="error-card">
          <mat-card-content>
            <div class="error-icon">
              <mat-icon>error_outline</mat-icon>
            </div>
            
            <div class="error-code">500</div>
            <h1 class="error-title">Internal Server Error</h1>
            <p class="error-description">
              Something went wrong on our servers. We're working to fix this issue. 
              Please try again later or contact support if the problem persists.
            </p>
            
            <div class="error-actions">
              <button mat-flat-button (click)="retryAction()" class="primary-action">
                <mat-icon>refresh</mat-icon>
                Try Again
              </button>
              <button mat-stroked-button routerLink="/dashboard" class="secondary-action">
                <mat-icon>home</mat-icon>
                Go to Dashboard
              </button>
            </div>

            <mat-expansion-panel class="troubleshooting-panel">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon>help_outline</mat-icon>
                  Troubleshooting Steps
                </mat-panel-title>
              </mat-expansion-panel-header>
              
              <div class="troubleshooting-content">
                <h4>What you can try:</h4>
                <ol>
                  <li>Refresh the page (F5 or Ctrl+R)</li>
                  <li>Clear your browser cache and cookies</li>
                  <li>Try again in a few minutes</li>
                  <li>Check your internet connection</li>
                  <li>Try accessing from a different browser</li>
                </ol>

                <h4>Still having issues?</h4>
                <p>
                  Contact our support team with the following information:
                </p>
                <ul>
                  <li><strong>Error Code:</strong> 500</li>
                  <li><strong>Time:</strong> {{ getCurrentTime() }}</li>
                  <li><strong>URL:</strong> {{ getCurrentUrl() }}</li>
                  <li><strong>Browser:</strong> {{ getBrowserInfo() }}</li>
                </ul>
              </div>
            </mat-expansion-panel>

            <div class="support-section">
              <h3>Need Immediate Help?</h3>
              <div class="support-options">
                <div class="support-option">
                  <mat-icon>email</mat-icon>
                  <div>
                    <strong>Email Support</strong>
                    <p>support&#64;company.com</p>
                  </div>
                </div>
                <div class="support-option">
                  <mat-icon>phone</mat-icon>
                  <div>
                    <strong>Phone Support</strong>
                    <p>+1 (555) 123-4567</p>
                  </div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .server-error-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: var(--spacing-lg);
      background: linear-gradient(135deg, var(--gray-50) 0%, var(--orange-50) 100%);
    }

    .server-error-content {
      max-width: 700px;
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
      background: var(--warning-100);
      border-radius: 50%;

      mat-icon {
        font-size: 4rem;
        width: 4rem;
        height: 4rem;
        color: var(--warning-600);
      }
    }

    .error-code {
      font-size: 6rem;
      font-weight: 900;
      color: var(--warning-600);
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

    .troubleshooting-panel {
      text-align: left;
      margin: var(--spacing-xl) 0;
      box-shadow: none;
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-lg);

      ::ng-deep .mat-expansion-panel-header {
        padding: var(--spacing-lg);

        .mat-panel-title {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-weight: 600;

          mat-icon {
            color: var(--primary-600);
          }
        }
      }

      .troubleshooting-content {
        padding: 0 var(--spacing-lg) var(--spacing-lg);

        h4 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
          margin: 0 0 var(--spacing-md) 0;
        }

        ol, ul {
          margin: 0 0 var(--spacing-lg) 0;
          padding-left: var(--spacing-lg);

          li {
            font-size: 0.875rem;
            color: var(--gray-600);
            margin-bottom: var(--spacing-xs);
            line-height: 1.5;
          }
        }

        p {
          font-size: 0.875rem;
          color: var(--gray-600);
          line-height: 1.5;
          margin: 0 0 var(--spacing-md);
        }

        strong {
          font-weight: 600;
          color: var(--gray-800);
        }
      }
    }

    .support-section {
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
        margin: 0 0 var(--spacing-lg);
        text-align: center;
      }
    }

    .support-options {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    .support-option {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);

      mat-icon {
        color: var(--primary-600);
        flex-shrink: 0;
      }

      div {
        flex: 1;

        strong {
          display: block;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: var(--spacing-xs);
          font-size: 0.875rem;
        }

        p {
          font-size: 0.8125rem;
          color: var(--gray-600);
          margin: 0;
        }
      }
    }

    @media (max-width: 640px) {
      .server-error-container {
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

      .support-section {
        padding: var(--spacing-lg);
      }

      .support-options {
        gap: var(--spacing-md);
      }
    }

    // Dark theme support
    .dark-theme {
      .server-error-container {
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

      .troubleshooting-panel {
        background: var(--gray-700);
        border-color: var(--gray-600);

        .troubleshooting-content {
          h4 {
            color: var(--gray-200);
          }

          p, li {
            color: var(--gray-400);
          }

          strong {
            color: var(--gray-200);
          }
        }
      }

      .support-section {
        background: var(--gray-700);
        border-color: var(--gray-600);

        h3 {
          color: var(--gray-200);
        }

        .support-option div {
          strong {
            color: var(--gray-200);
          }

          p {
            color: var(--gray-400);
          }
        }
      }
    }
  `]
})
export class ServerErrorComponent {
  
  retryAction(): void {
    window.location.reload();
  }

  getCurrentTime(): string {
    return new Date().toLocaleString();
  }

  getCurrentUrl(): string {
    return window.location.href;
  }

  getBrowserInfo(): string {
    return navigator.userAgent;
  }
}
