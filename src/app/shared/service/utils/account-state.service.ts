import { Injectable } from '@angular/core';
import { SessionStorageService } from 'ngx-webstorage';
import { Account } from '../../data-models/model';

@Injectable({
  providedIn: 'root'
})
export class AccountStateService {
  private storageKey = 'account';

  constructor(private sessionStorage: SessionStorageService) {
  }

  add(account: Account): void {
    this.sessionStorage.store(this.storageKey, account);
  }

  get(): Account {
    return this.sessionStorage.retrieve(this.storageKey);
  }

  remove(): void {
    this.sessionStorage.clear(this.storageKey);
  }

  isUserLoggedIn(): boolean {
    return !!this.get()?.ppid;
  }
}
