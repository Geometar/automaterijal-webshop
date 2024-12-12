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
}

export class Credentials {
  username?: string;
  password?: string;

}
export interface JwtToken {
  token: string;
}