export class SalesReport {
  firmaDto!: Company;
  komentarDto!: Comment;
}

export class Company {
  adresa!: string;
  id!: number;
  ime!: string;
  izmena!: boolean;
  konkurent!: string;
  kontakt!: string;
  mesto!: string;
  osnovniAsortiman!: string;
  sektor!: string;
}

export class Comment {
  datumKreiranja!: Date;
  firma!: number;
  id!: number;
  komentar!: string;
  komercijalista!: string;
  podsetnik!: Date;
  ppid!: number;
}

export class SalesReportCreate {
  adresa?: string;
  datumKreiranja?: number;
  firmaId?: number;
  ime?: string;
  komentar?: string;
  konkurent?: string;
  kontakt?: string;
  mesto?: string;
  osnovniAsortiman?: string;
  podsetnik?: number;
  sektor?: string;
}