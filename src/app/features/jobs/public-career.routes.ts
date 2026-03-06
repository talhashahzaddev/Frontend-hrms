import { Routes } from '@angular/router';
import { PublicCareerComponent } from './components/public-career/public-career.component';
import { CareerJobDetailComponent } from './components/career-job-detail/career-job-detail.component';

export const publicCareerRoutes: Routes = [
    {
        path: '',
        component: PublicCareerComponent,
        title: 'Careers - Codified Labs'
    },
    {
        path: 'job/:jobCode',
        component: CareerJobDetailComponent,
        title: 'Job Details - Careers'
    }
];