import { Routes } from '@angular/router';

// Guards
import { authGuard } from './shared/guards/auth.guard';
import { adminGuard } from './shared/guards/admin.guard';
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
    path: 'naslovna',
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
    path: 'uslovi-kupovine',
    loadComponent: () =>
      import('./modules/policies/purchase-terms/purchase-terms.component').then((m) => m.PurchaseTermsComponent)
  },
  {
    path: 'dostava',
    loadComponent: () =>
      import('./modules/policies/shipping-policy/shipping-policy.component').then((m) => m.ShippingPolicyComponent)
  },
  {
    path: 'placanje',
    loadComponent: () =>
      import('./modules/policies/payment-policy/payment-policy.component').then((m) => m.PaymentPolicyComponent)
  },
  {
    path: 'povrat-garancija',
    loadComponent: () =>
      import('./modules/policies/return-policy/return-policy.component').then((m) => m.ReturnPolicyComponent)
  },
  {
    path: 'blog',
    loadComponent: () =>
      import('./modules/blog/blog-list.component').then((m) => m.BlogListComponent)
  },
  {
    path: 'blog/admin',
    loadComponent: () =>
      import('./modules/blog/admin/blog-admin.component').then((m) => m.BlogAdminComponent),
    canActivate: [salesGuard]
  },
  {
    path: 'blog/:slug',
    loadComponent: () =>
      import('./modules/blog/detail/blog-detail.component').then((m) => m.BlogDetailComponent)
  },
  {
    path: 'brendovi/:slug',
    loadComponent: () =>
      import('./modules/brands/brand-page/brand-page.component').then((m) => m.BrandPageComponent)
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
    path: 'webshop/vozila',
    loadComponent: () =>
      import('./modules/webshop/vehicle-pages/catalog-landing/vehicle-catalog-landing.component').then((m) => m.VehicleCatalogLandingComponent)
  },
  {
    path: 'webshop/vozila/:manufacturerSlug',
    loadComponent: () =>
      import('./modules/webshop/vehicle-pages/manufacturer/vehicle-manufacturer-page.component').then((m) => m.VehicleManufacturerPageComponent)
  },
  {
    path: 'webshop/vozila/:manufacturerSlug/:modelSlug',
    loadComponent: () =>
      import('./modules/webshop/vehicle-pages/model/vehicle-model-page.component').then((m) => m.VehicleModelPageComponent)
  },
  {
    path: 'webshop/vozila/:manufacturerSlug/:modelSlug/:vehicleSlug/:groupSlug',
    loadComponent: () =>
      import('./modules/webshop/webshop.component').then((m) => m.WebshopComponent)
  },
  {
    path: 'webshop/vozila/:manufacturerSlug/:modelSlug/:vehicleSlug',
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
    path: 'partner-card',
    loadComponent: () =>
      import('./modules/personal/partner-card/partner-card.component').then((m) => m.PartnerCardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'partner-card/dokument/:vrdok/:brdok',
    loadComponent: () =>
      import('./modules/personal/partner-card/details/partner-card-document.component').then((m) => m.PartnerCardDocumentComponent),
    canActivate: [authGuard]
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
  {
    path: 'admin/invoices',
    loadComponent: () =>
      import('./modules/admin/invoices/admin-invoices.component').then((m) => m.AdminInvoicesComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'admin/invoices/:id',
    loadComponent: () =>
      import('./modules/personal/invoices/invoice-details/invoice-details.component').then((m) => m.InvoiceDetailsComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'admin/invoices/:ppid/:id',
    loadComponent: () =>
      import('./modules/personal/invoices/invoice-details/invoice-details.component').then((m) => m.InvoiceDetailsComponent),
    canActivate: [adminGuard]
  },

  // --- Catch all ---
  {
    path: '**',
    loadComponent: () =>
      import('./modules/dashboard/not-found/not-found.component').then((m) => m.PageNotFoundComponent)
  },
];
