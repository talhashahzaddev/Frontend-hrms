import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UiScaleService {
  private renderer: Renderer2;
  private scaleSubject = new BehaviorSubject<number>(100);
  private readonly SCALE_COOKIE = 'hrms-ui-scale';
  private readonly MIN = 70;
  private readonly MAX = 150;
  private readonly STEP = 10;

  public scale$: Observable<number> = this.scaleSubject.asObservable();

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  initializeScale(): void {
    const saved = this.getCookie(this.SCALE_COOKIE);
    const value = saved ? this.toNumber(saved, 100) : 100;
    const clamped = this.clamp(value);
    this.applyScale(clamped);
  }

  setScale(percent: number): void {
    const clamped = this.clamp(percent);
    this.applyScale(clamped);
    this.setCookie(this.SCALE_COOKIE, String(clamped), 365);
  }

  increase(): void {
    this.setScale(this.scaleSubject.value + this.STEP);
  }

  decrease(): void {
    this.setScale(this.scaleSubject.value - this.STEP);
  }

  reset(): void {
    this.setScale(100);
  }

  private applyScale(percent: number): void {
    this.scaleSubject.next(percent);
    const factor = percent / 100;
    
    // Apply zoom to body instead of html to prevent coordinate system conflicts
    this.renderer.setStyle(document.body, 'zoom', String(factor));
    
    // Apply inverse zoom to CDK overlay container to fix positioning
    // This counteracts the body zoom and keeps overlays positioned correctly
    const overlayContainer = document.querySelector('.cdk-overlay-container');
    if (overlayContainer) {
      const inverseFactor = 1 / factor;
      this.renderer.setStyle(overlayContainer, 'zoom', String(inverseFactor));
    }
  }

  private clamp(value: number): number {
    return Math.max(this.MIN, Math.min(this.MAX, Math.round(value)));
  }

  private toNumber(value: string, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private setCookie(name: string, value: string, days: number): void {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = 'expires=' + date.toUTCString();
    document.cookie = `${name}=${value};${expires};path=/`;
  }

  private getCookie(name: string): string | null {
    const decoded = decodeURIComponent(document.cookie || '');
    const parts = decoded.split(';');
    for (let c of parts) {
      c = c.trim();
      if (c.indexOf(name + '=') === 0) {
        return c.substring(name.length + 1);
      }
    }
    return null;
  }
}
