import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { guestGuard } from './core/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: '',
    loadComponent: () =>
      import('./pages/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tenants' },
      {
        path: 'tenants',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/tenants/tenants-page.component').then(
                (m) => m.TenantsPageComponent,
              ),
          },
          {
            path: 'platform-admins',
            loadComponent: () =>
              import(
                './pages/platform-admins/platform-admins-page.component'
              ).then((m) => m.PlatformAdminsPageComponent),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
