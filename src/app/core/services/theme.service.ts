import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private themeSubject = new BehaviorSubject<Theme>('light');
  private readonly THEME_KEY = 'hrms-theme';

  public theme$: Observable<Theme> = this.themeSubject.asObservable();

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  initializeTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
    const initialTheme = savedTheme || 'light';
    this.setTheme(initialTheme);
  }

  setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    
    // Remove existing theme classes
    this.renderer.removeClass(document.body, 'light-theme');
    this.renderer.removeClass(document.body, 'dark-theme');
    
    // Apply new theme class
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.renderer.addClass(document.body, prefersDark ? 'dark-theme' : 'light-theme');
    } else {
      this.renderer.addClass(document.body, `${theme}-theme`);
    }
  }

  toggleTheme(): void {
    const currentTheme = this.themeSubject.value;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  getCurrentTheme(): Theme {
    return this.themeSubject.value;
  }

  isDarkMode(): boolean {
    const theme = this.themeSubject.value;
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    // For 'auto', check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
