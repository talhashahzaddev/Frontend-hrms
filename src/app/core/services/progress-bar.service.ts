import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProgressBarService {
  private progressSubject = new BehaviorSubject<number>(0);
  private visibleSubject = new BehaviorSubject<boolean>(false);
  
  public progress$: Observable<number> = this.progressSubject.asObservable();
  public visible$: Observable<boolean> = this.visibleSubject.asObservable();

  private progressTimer: any;
  private currentProgress = 0;
  private startTime: number = 0;
  private readonly animationDuration = 2000; // 2 seconds to reach 90%

  /**
   * Start the progress bar (for navigation or API calls)
   */
  start(): void {
    // Reset any existing progress
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }
    
    this.visibleSubject.next(true);
    this.currentProgress = 0;
    this.progressSubject.next(0);
    this.startTime = Date.now();
    
    // Smooth animation from 0 to 90%
    this.progressTimer = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      const progress = Math.min((elapsed / this.animationDuration) * 90, 90);
      
      if (progress < 90) {
        this.currentProgress = progress;
        this.progressSubject.next(progress);
      } else {
        // Stop at 90% and wait for complete()
        clearInterval(this.progressTimer);
        this.progressTimer = null;
      }
    }, 16); // ~60fps for smooth animation
  }

  /**
   * Complete the progress bar (set to 100% and hide)
   */
  complete(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    
    // Smoothly complete to 100%
    this.currentProgress = 100;
    this.progressSubject.next(100);
    
    // Hide after a short delay
    setTimeout(() => {
      this.visibleSubject.next(false);
      this.currentProgress = 0;
      this.progressSubject.next(0);
    }, 300);
  }

  /**
   * Set progress to a specific value
   */
  setProgress(value: number): void {
    this.currentProgress = Math.max(0, Math.min(100, value));
    this.progressSubject.next(this.currentProgress);
  }

  /**
   * Reset progress bar
   */
  reset(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    this.currentProgress = 0;
    this.progressSubject.next(0);
    this.visibleSubject.next(false);
  }
}
