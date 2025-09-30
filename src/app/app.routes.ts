import { Routes } from '@angular/router';

// Guards
import { authGuard } from './shared/guards/auth.guard';
import { salesGuard } from './shared/guards/sales.guard';

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
    path: 'blog',
    loadComponent: () =>
      import('./modules/blog/blog-list.component').then((m) => m.BlogListComponent)
  },
  {
    path: 'blog/admin',
    loadComponent: () =>
      import('./modules/blog/blog-admin.component').then((m) => m.BlogAdminComponent),
    canActivate: [salesGuard]
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('./modules/blog/blog-detail.component').then((m) => m.BlogDetailComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./modules/login/login.component').then((m) => m.LoginComponent)
  },

  // --- Webshop routes ---
  {
    path: 'webshop',
    loadComponent: () =>
      import('./modules/webshop/webshop.component').then((m) => m.WebshopComponent)
  },
  {
    path: 'webshop/manufacturers/:name',
    loadComponent: () =>
      import('./modules/webshop/webshop.component').then((m) => m.WebshopComponent)
  },
  {
    path: 'webshop/category/:name',
    loadComponent: () =>
      import('./modules/webshop/webshop.component').then((m) => m.WebshopComponent)
  },
  {
    path: 'webshop/category/:name/:subcategory',
    loadComponent: () =>
      import('./modules/webshop/webshop.component').then((m) => m.WebshopComponent)
  },
  {
    path: 'webshop/:id',
    loadComponent: () =>
      import('./modules/webshop/webshop-details/webshop-details.component').then((m) => m.WebshopDetailsComponent)
  },

  // --- Cart & personal ---
  {
    path: 'cart',
    loadComponent: () =>
      import('./modules/cart/cart.component').then((m) => m.CartComponent)
  },
  {
    path: 'invoices',
    loadComponent: () =>
      import('./modules/personal/invoices/invoices.component').then((m) => m.InvoicesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'invoices/:id',
    loadComponent: () =>
      import('./modules/personal/invoices/invoice-details/invoice-details.component').then((m) => m.InvoiceDetailsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sales-reports',
    loadComponent: () =>
      import('./modules/personal/sales-reports/sales-reports.component').then((m) => m.SalesReportsComponent),
    canActivate: [salesGuard]
  },
  {
    path: 'logs',
    loadComponent: () =>
      import('./modules/personal/logs/logs.component').then((m) => m.LogsComponent),
    canActivate: [salesGuard]
  },

  // --- Catch all ---
  {
    path: '**',
    loadComponent: () =>
      import('./modules/dashboard/not-found/not-found.component').then((m) => m.PageNotFoundComponent)
  },
];
