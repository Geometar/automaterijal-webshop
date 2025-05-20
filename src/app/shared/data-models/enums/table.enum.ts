export enum CellType {
  CURRENCY = 'currency',
  DATE = 'date',
  IMG = 'image',
  LINK = 'link',
  NUMBER = 'number',
  PERCENTAGE = 'percentage',
  TEXT = 'text',
}

export interface AutomTableColumn {
  key: string; // property from data
  header: string; // table column title
  type: CellType;
  callback?: (row: any) => void; // for clickable actions
  dateFormat?: string; // for date pipe (e.g. 'dd-MMM-yyyy')
  currencyCode?: string; // e.g. 'RSD', 'USD' (defaults to RSD if not provided)
  disableLink?: (row: any) => boolean; // for disabling link action
}