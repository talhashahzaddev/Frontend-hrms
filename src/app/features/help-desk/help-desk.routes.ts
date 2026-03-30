import { Routes } from '@angular/router';

export const helpdeskRoutes: Routes = [

    {
    path: 'tickets',
    loadComponent: () => import('./components/tickets-dashboard/tickets-dashboard.component')
      .then(m => m.TicketsDashboardComponent),
  },
   {
    path: 'agent-group',
    loadComponent: () => import('./components/agent-group-dashboard/agent-group-dashboard.component')
      .then(m => m.AgentGroupDashboardComponent),
  },
  {
    path: 'ticket-invlovement',
    loadComponent: () => import('./components/ticket-involvement/ticket-involvement.component')
      .then(m => m.TicketInvolvementComponent),
  },
   {
    path: 'tickets/view/:id',
    loadComponent: () => import('./components/view-ticket-details/view-ticket-details.component')
      .then(m => m.ViewTicketDetailsComponent),
  },
{
  path: 'ticket-category',
  loadComponent: () => import('./components/ticket-category/ticket-category.component')
    .then(m => m.TicketCategoryComponent),

},


];
