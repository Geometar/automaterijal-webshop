import { Injectable } from '@angular/core';
import { AuthServerProvider } from '../auth/service/auth-jwt.service';
import { catchError, mergeMap, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';

// Data models
import { Account, Credentials } from '../data-models/model';

// Services
import { AccountService } from '../auth/service/account.service';
import { CartStateService } from './state/cart-state.service';
import { AccountStateService } from './state/account-state.service';

@Injectable({
  providedIn: 'root',
})
export class LoginService {

  constructor(
    private accountService: AccountService,
    private accountStateService: AccountStateService,
    private authServerProvider: AuthServerProvider,
    private cartStateService: CartStateService,
    private router: Router
  ) { }

  getToken(): string {
    return this.authServerProvider.getToken();
  }

  login(credential: Credentials): Observable<Account | null> {
    return this.authServerProvider.login(credential).pipe(
      mergeMap(() => this.accountService.identity()),
      catchError((err: Error) => throwError(err))
    );
  }

  logout(): void {
    sessionStorage.clear();
    this.accountService.authenticate(null);
    this.cartStateService.resetCart();
    this.accountStateService.remove();
    this.router.navigate(['/']);
    this.authServerProvider.logout().subscribe({
      next: () => { },
      complete: () => {

      },
    });
  }
}
