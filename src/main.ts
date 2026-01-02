import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ServiceWorkerModule } from '@angular/service-worker';
import { ToastrModule } from 'ngx-toastr';
import { NgxSpinnerModule } from 'ngx-spinner';

// Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { ChartModule } from 'primeng/chart';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MenuModule } from 'primeng/menu';
import { PanelMenuModule } from 'primeng/panelmenu';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

// App modules and services
import { appRoutes } from './app/app.routes';
import { AuthInterceptor } from './app/core/interceptors/auth.interceptor';
import { ErrorInterceptor } from './app/core/interceptors/error.interceptor';
import { LoadingInterceptor } from './app/core/interceptors/loading.interceptor';

import { environment } from './environments/environment';
import { APP_INITIALIZER } from '@angular/core';
import { domainInitializer } from './app/core/initializers/domain.initializer';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserAnimationsModule,
      HttpClientModule,
      RouterModule.forRoot(appRoutes, {
        enableTracing: false,
        scrollPositionRestoration: 'top'
      }),
      ReactiveFormsModule,
      FormsModule,
      
      // Material Modules
      MatToolbarModule,
      MatSidenavModule,
      MatListModule,
      MatIconModule,
      MatButtonModule,
      MatCardModule,
      MatInputModule,
      MatFormFieldModule,
      MatTableModule,
      MatPaginatorModule,
      MatSortModule,
      MatDialogModule,
      MatSelectModule,
      MatDatepickerModule,
      MatNativeDateModule,
      MatCheckboxModule,
      MatMenuModule,
      MatBadgeModule,
      MatProgressSpinnerModule,
      MatSnackBarModule,
      MatTabsModule,
      MatExpansionModule,
      MatChipsModule,
      
      // PrimeNG Modules
      ButtonModule,
      CardModule,
      InputTextModule,
      TableModule,
      DialogModule,
      CalendarModule,
      DropdownModule,
      ChartModule,
      ProgressSpinnerModule,
      ToastModule,
      MenuModule,
      PanelMenuModule,
      AvatarModule,
      BadgeModule,
      TagModule,
      
      // External Libraries
      ToastrModule.forRoot({
        timeOut: 3000,
        positionClass: 'toast-top-right',
        preventDuplicates: true,
        progressBar: true,
        progressAnimation: 'increasing',
        newestOnTop: true,
        closeButton: true,
        enableHtml: true
      }),
      NgxSpinnerModule.forRoot({
        type: 'ball-spin-clockwise'
      }),
      
      // Service Worker (PWA)
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: environment.production,
        registrationStrategy: 'registerWhenStable:30000'
      })
    ),
    
    // PrimeNG Services
    MessageService,
    
    // App Initializers - Domain validation runs BEFORE app loads
    {
      provide: APP_INITIALIZER,
      useFactory: domainInitializer,
      multi: true
    },
    
    // HTTP Interceptors
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true
    }
  ]
}).catch(err => console.error(err));
