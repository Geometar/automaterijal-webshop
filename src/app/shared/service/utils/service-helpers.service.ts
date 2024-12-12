import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ServiceHelpersService {
  /**
   * Safely encodes params as url string
   *
   * @param map the fields to be assembled in the url
   */
  public formatQueryParameters(map: any): string {
    let parameterString = '';

    Object.keys(map).forEach((el: any) => {
      const value = map[el];

      // filters as an array needs to be delimitted by pipe
      if (Array.isArray(value)) {
        value.forEach((item: string | number, index: number) => {
          if (typeof item !== 'number') {
            const updated = item.replaceAll(',', '|');
            value[index] = updated;
          }
        });
      }

      if ((value !== null && value !== '') || (Array.isArray(value) && value.length)) {
        if (parameterString) {
          parameterString += '&';
        }

        parameterString += el + '=' + encodeURI(value);
      }
    });

    if (parameterString) {
      parameterString = '?' + parameterString;
    }

    return parameterString;
  }

  public parseBoolean(stringValue: string): boolean {
    return JSON.parse(stringValue);
  }

  public parseBooleans(stringValues: Array<string>): Array<boolean> {
    const booleanValues: Array<boolean> = [];
    stringValues.forEach((value: string) => {
      booleanValues.push(JSON.parse(value));
    });
    return booleanValues;
  }
}
