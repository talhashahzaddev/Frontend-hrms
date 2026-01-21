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

  /**
   * Start the progress bar (for navigation or API calls)
   */
  start(): void {
    this.visibleSubject.next(true);
    this.currentProgress = 0;
    this.progressSubject.next(0);
    
    // Simulate progress incrementally
    this.progressTimer = setInterval(() => {
      if (this.currentProgress < 90) {
        // Increment progress slowly
        const increment = Math.random() * 15;
        this.currentProgress = Math.min(this.currentProgress + increment, 90);
        this.progressSubject.next(this.currentProgress);
      }
    }, 200);
  }

  /**
   * Complete the progress bar (set to 100% and hide)
   */
  complete(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    
    // Quickly complete to 100%
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
