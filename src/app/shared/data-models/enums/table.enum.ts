export enum CellType {
  TEXT = 'text',
  LINK = 'link',
  NUMBER = 'number',
  CURRENCY = 'currency',
  DATE = 'date',
}

export interface AutomTableColumn {
  key: string; // property from data
  header: string; // table column title
  type: CellType;
  callback?: (row: any) => void; // for clickable actions
  dateFormat?: string; // for date pipe (e.g. 'dd-MMM-yyyy')
  currencyCode?: string; // e.g. 'RSD', 'USD' (defaults to RSD if not provided)
}