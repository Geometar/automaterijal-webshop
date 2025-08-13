import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, of, shareReplay, Subject, tap } from 'rxjs';
import { Account } from '../../data-models/model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environment/environment';

// Services
import { AccountStateService } from '../../service/state/account-state.service';
import { ServiceHelpersService } from '../../service/utils/service-helpers.service';

const PARTNER_URL = environment.apiUrl + '/api/partner';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  authenticationState = new BehaviorSubject<Account | null>(null);
  private accountCache$?: Observable<Account> | null;
  private userIdentity: Account | null = null;

  constructor(
    private accountStateService: AccountStateService,
    private http: HttpClient,
    private utils: ServiceHelpersService,
  ) { }

  authenticate(identity: Account | null): void {
    this.accountCache$ = identity ? of(identity) : null;
    this.authenticationState.next(identity);
    this.userIdentity = identity;
  }

  identity(): Observable<Account | null> {
    if (!this.accountCache$ && !this.userIdentity) {
      this.accountCache$ = this.getAccount().pipe(
        tap((account: Account) => {
          this.userIdentity = account;
          this.accountStateService.add(account);
          this.authenticate(account);
        }),
        shareReplay()
      );
    }
    return this.accountCache$!.pipe(catchError(() => of(null)));
  }

  // IMPORTANT: We shouldn't call this method directly!
  private getAccount(): Observable<Account> {
    const parameterObject = {} as any;
    parameterObject['prviRequest'] = true;
    const parametersString = this.utils.formatQueryParameters(parameterObject);

    return this.http.get<Account>(`${PARTNER_URL}/read${parametersString}`);
  }
}
