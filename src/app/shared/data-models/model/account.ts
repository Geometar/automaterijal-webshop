export class Account {
  adresa?: string;
  email?: string;
  loginCount?: any;
  naziv?: string;
  noviPassword?: string;
  ppid?: number;
  privilegije?: number;
  stanje?: number;
  stanjeporoku?: number;
  stariPassword?: string;
  webKorisnik?: string;
  webStatus?: number;

  get isAdmin(): boolean {
    return this.privilegije === 2047;
  }

  get isSubAdmin(): boolean {
    return this.privilegije === 2043;
  }

  get isRegularUser(): boolean {
    return !this.isAdmin && !this.isSubAdmin;
  }
}

export class Credentials {
  username?: string;
  password?: string;

}
export interface JwtToken {
  token: string;
}

export class PasswordChange {
  ponovljenjaSifra?: string;
  ppid?: number;
  sifra?: string;
  staraSifra?: string;
}