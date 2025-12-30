import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AccountStateService } from '../service/state/account-state.service';

export const adminGuard: CanActivateFn = () => {
  const accountState = inject(AccountStateService);
  const router = inject(Router);

  if (accountState.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

