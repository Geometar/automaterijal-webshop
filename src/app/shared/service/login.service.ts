import { Injectable } from '@angular/core';
import { AuthServerProvider } from '../auth/service/auth-jwt.service';
import { Account, Credentials } from '../data-models/model';
import { catchError, mergeMap, Observable, throwError } from 'rxjs';
import { AccountService } from '../auth/service/account.service';
import { Router } from '@angular/router';
import { CartStateService } from './utils/cart-state.service';
import { AccountStateService } from './utils/account-state.service';

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
