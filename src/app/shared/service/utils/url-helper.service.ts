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
 * Clears all existing query parameters and sets new ones
 * @param params Object containing new query parameters
 */
  setQueryParams(params: { [key: string]: any }): void {
    const queryParams: { [key: string]: string | string[] } = {};

    Object.keys(params).forEach((key) => {
      const value = params[key];
      if (Array.isArray(value)) {
        queryParams[key] = value.join(','); // Handle arrays as comma-separated values
      } else if (value !== null && value !== undefined) {
        queryParams[key] = String(value); // Convert non-array values to strings
      }
    });

    this.router.navigate([], {
      queryParams,
      queryParamsHandling: '', // Clear existing parameters and replace with new ones
    });
  }


  /**
   * Removes a query parameter from the current URL
   * @param paramName The name of the query parameter to remove
   */
  removeQueryParam(paramName: string): void {
    const queryParams = { ...this.activatedRoute.snapshot.queryParams }; // Get the current query parameters
    const targetParam = paramName.toLowerCase(); // Convert the parameter name to lowercase

    // Find the key in queryParams matching targetParam in a case-insensitive way
    const matchedKey = Object.keys(queryParams).find(
      key => key.toLowerCase() === targetParam
    );

    if (matchedKey) {
      delete queryParams[matchedKey]; // Remove the matched parameter
      this.router.navigate([], {
        queryParams,
        queryParamsHandling: '', // Do not merge with existing query parameters
      });
    }
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

  /**
   * Checks if a specific query parameter exists and has data
   * @param paramName The name of the query parameter to check
   * @returns True if the query parameter exists and has data, otherwise false
   */
  hasQueryParam(paramName: string): boolean {
    const queryParams = this.activatedRoute.snapshot.queryParams;
    const value = queryParams[paramName];
    return value !== undefined && value !== null && value.trim() !== '';
  }
}
