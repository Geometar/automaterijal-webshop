export class LogsLogin {
  naziv!: string;
  poslednjeLogovanje!: string;
  ppid!: number;
}

export class LogWeb {
  filter!: string;
  id!: number;
  ppid!: number;
  pretraga!: string;
  proizvodjac!: string;
  vremePretrage!: Date;
}