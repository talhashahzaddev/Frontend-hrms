import { Routes } from '@angular/router';
import { PublicCareerComponent } from './components/public-career/public-career.component';

export const publicCareerRoutes: Routes = [
    {
        path: '',
        component: PublicCareerComponent,
        title: 'Careers - Codified Labs'
    }
];