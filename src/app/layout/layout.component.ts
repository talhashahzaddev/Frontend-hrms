import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Material Modules
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

// Components
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';

// Services
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({
    selector: 'app-layout',
    imports: [
        CommonModule,
        RouterOutlet,
        MatSidenavModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatListModule,
        HeaderComponent,
        SidebarComponent
    ],
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
  @ViewChild('drawer') drawer!: MatSidenav;
  
  isHandset = false;
  sidenavMode: 'side' | 'over' | 'push' = 'side';
  sidenavOpened = true;
  
  private destroy$ = new Subject<void>();

  constructor(
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    this.observeBreakpoints();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private observeBreakpoints(): void {
    this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.Tablet])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isHandset = result.matches;
        
        if (this.isHandset) {
          this.sidenavMode = 'over';
          this.sidenavOpened = false;
        } else {
          this.sidenavMode = 'side';
          this.sidenavOpened = true;
        }
      });
  }

  onMenuToggle(): void {
    if (this.drawer) {
      this.drawer.toggle();
    }
  }

  onSidenavClosed(): void {
    if (this.isHandset) {
      this.sidenavOpened = false;
    }
  }
}
