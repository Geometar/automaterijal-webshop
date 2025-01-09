import { Injectable } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class UrlHelperService {

  constructor(private activatedRoute: ActivatedRoute, private router: Router) { }

  /**
   * Adds or updates query parameters in the current URL
   * @param params Object containing query parameters to add or update
   */
  addOrUpdateQueryParams(params: { [key: string]: any }): void {
    const queryParams: { [key: string]: string | string[] } = {};

    Object.keys(params).forEach((key) => {
      const value = params[key];
      if (Array.isArray(value)) {
        queryParams[key] = value.join(','); // Directly assign arrays to let Angular handle them as `key=value1&key=value2`
      } else if (value !== null && value !== undefined) {
        queryParams[key] = String(value); // Convert non-array values to strings
      }
    });

    this.router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge', // Merge with existing query parameters
    });
  }

  /**
   * Reads query parameters from the current route
   * @returns An object containing all query parameters
   */
  readQueryParams(): Params {
    return this.activatedRoute.snapshot.queryParams;
  }

  /**
   * Reads query parameters from a given URL
   * @param url The URL to extract query parameters from
   * @returns An object containing query parameters
   */
  parseQueryParamsFromUrl(url: string): { [key: string]: string } {
    const params: { [key: string]: string } = {};
    const queryString = new URL(url, window.location.origin).search;
    new URLSearchParams(queryString).forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  /**
 * Clears all query parameters in the current URL
 */
  clearQueryParams(): void {
    this.router.navigate([], {
      queryParams: {}, // Pass an empty object to clear all query parameters
      queryParamsHandling: '', // This ensures existing parameters are not merged
    });
  }
}
