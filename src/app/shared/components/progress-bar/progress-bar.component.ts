import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ProgressBarService } from '@core/services/progress-bar.service';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-bar-container" *ngIf="isVisible">
      <div class="progress-bar" [style.width.%]="progress"></div>
    </div>
  `,
  styles: [`
    .progress-bar-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      z-index: 10000;
      background: transparent;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
      background-size: 200% 100%;
      animation: shimmer 2s infinite;
      transition: width 0.2s linear;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
      transform-origin: left;
    }

    @keyframes shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }

    /* Dark theme support */
    :host-context(.dark-theme) .progress-bar {
      background: linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6);
    }
  `]
})
export class ProgressBarComponent implements OnInit, OnDestroy {
  progress = 0;
  isVisible = false;
  private destroy$ = new Subject<void>();

  constructor(private progressBarService: ProgressBarService) {}

  ngOnInit(): void {
    this.progressBarService.progress$
      .pipe(takeUntil(this.destroy$))
      .subscribe(progress => {
        this.progress = progress;
      });

    this.progressBarService.visible$
      .pipe(takeUntil(this.destroy$))
      .subscribe(visible => {
        this.isVisible = visible;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
