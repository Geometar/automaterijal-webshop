import { Injectable, NgZone } from '@angular/core';
import { AuthServerProvider } from '../auth/service/auth-jwt.service';
import { Account, Credentials } from '../data-models/model';
import { catchError, mergeMap, Observable, throwError } from 'rxjs';
import { AccountService } from '../auth/service/account.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class LoginService {

  constructor(
    private accountService: AccountService,
    private authServerProvider: AuthServerProvider,
    private ngZone: NgZone,
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
    this.authServerProvider.logout().subscribe({
      next: () => { },
      complete: () => {
        this.accountService.authenticate(null);
        this.ngZone.run(() => this.router.navigate(['/home']));
      },
    });
  }
}
