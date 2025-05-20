import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { Account } from '../../data-models/model';

@Injectable({
  providedIn: 'root'
})
export class AccountStateService {
  private storageKey = 'account';

  constructor(private localStorageService: LocalStorageService) {
  }

  add(account: Account): void {
    this.localStorageService.store(this.storageKey, account);
  }

  get(): Account {
    return this.localStorageService.retrieve(this.storageKey);
  }

  remove(): void {
    this.localStorageService.clear(this.storageKey);
  }

  isUserLoggedIn(): boolean {
    return !!this.get()?.ppid;
  }

  isEmployee(): boolean {
    const account = this.get();
    const hasPpid = !!account?.ppid;
    const hasPrivileges = (account?.privilegije ?? 0) >= 2043;
    return hasPpid && hasPrivileges;
  }
}
