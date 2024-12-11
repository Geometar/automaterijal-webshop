import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./modules/dashboard/home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'onama',
    loadComponent: () =>
      import('./modules/dashboard/o-nama/o-nama.component').then((m) => m.ONamaComponent)
  },
  {
    path: 'kontakt',
    loadComponent: () =>
      import('./modules/dashboard/kontakt/kontakt.component').then((m) => m.KontaktComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./modules/login/login.component').then((m) => m.LoginComponent)
  }
];
