import { CurrencyPipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'rsdCurrency',
  standalone: true
})
export class RsdCurrencyPipe implements PipeTransform {

  constructor(private currencyPipe: CurrencyPipe) { }

  transform(value: number, currencyCode: string = 'RSD', display: string = 'symbol', digits: string = '1.2-2'): string {
    // Use Angular's CurrencyPipe and append ' RSD'
    const formattedCurrency = this.currencyPipe.transform(value, currencyCode, display, digits);

    // Replace 'RSD' from the result and append it manually
    return `${formattedCurrency?.replace('RSD', '').trim()} RSD`;
  }
}
