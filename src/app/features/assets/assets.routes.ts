import { Routes } from '@angular/router';

export const assetsRoutes: Routes = [
  {
    path: '',
    redirectTo: 'types',
    pathMatch: 'full'
  },
  {
    path: 'types',
    data: { roles: ['Super Admin', 'HR Manager'] },
    loadComponent: () => import('./components/asset-types/asset-types.component').then(m => m.AssetTypesComponent)
  },
  {
    path: 'create',
    data: { roles: ['Super Admin', 'HR Manager', 'Manager'] },
    loadComponent: () => import('./components/create-asset/create-asset.component').then(m => m.CreateAssetComponent)
  },
//   {
//   path: 'assign',
//   loadComponent: () =>
//     import('./components/assign-assets/assign-assets.component')
//       .then(m => m.AssignAssetsComponent),
// }

];
