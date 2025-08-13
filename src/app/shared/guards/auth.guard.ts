import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Services
import { AccountStateService } from '../service/state/account-state.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AccountStateService);
  const router = inject(Router);

  if (authService.isUserLoggedIn()) {
    return true;
  } else {
    return router.createUrlTree(['/login']); // ili gde god da šalješ neregistrovane
  }
};