export class Slika {
  /** URL sadržaj slike, može biti relativan ili apsolutan */
  slikeUrl?: string;
  /** Da li je `slikeUrl` već pun URL (backend polje `isUrl`) */
  isUrl?: boolean;
  /** Naziv fajla koji backend vraća za internu obradu */
  robaSlika?: string;
}
