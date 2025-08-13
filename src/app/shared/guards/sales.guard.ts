import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Services
import { AccountStateService } from '../service/state/account-state.service';

export const salesGuard: CanActivateFn = (route, state) => {
  const authService = inject(AccountStateService);
  const router = inject(Router);

  if (authService.isEmployee()) {
    return true;
  } else {
    return router.createUrlTree(['/login']); // ili gde god da šalješ neregistrovane
  }
};