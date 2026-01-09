import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LocalStorageService } from 'ngx-webstorage';

// Data models
import { Account } from '../../data-models/model';

@Injectable({
  providedIn: 'root'
})
export class AccountStateService {
  private storageKey = 'account';

  constructor(
    private localStorageService: LocalStorageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  add(account: Account): void {
    if (!this.isBrowser) {
      return;
    }
    this.localStorageService.store(this.storageKey, account);
  }

  get(): Account {
    if (!this.isBrowser) {
      return new Account();
    }

    const raw = this.localStorageService.retrieve(this.storageKey);
    return raw ? Object.assign(new Account(), raw) : new Account();
  }

  remove(): void {
    if (!this.isBrowser) {
      return;
    }
    this.localStorageService.clear(this.storageKey);
  }

  isUserLoggedIn(): boolean {
    return !!this.get()?.ppid;
  }

  isEmployee(): boolean {
    const account = this.get();
    return !!account?.ppid && (account.privilegije ?? 0) >= 2043;
  }

  isAdmin(): boolean {
    return this.get()?.isAdmin;
  }

  isSuperAdmin(): boolean {
    const account = this.get();
    return !!account?.isSuperAdmin;
  }
}
