import { Injectable } from '@angular/core';
import { ActivatedRoute, NavigationExtras, Params, Router } from '@angular/router';

// Utils
import { StringUtils } from '../../utils/string-utils';

@Injectable({
  providedIn: 'root'
})
export class UrlHelperService {

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) { }

  /**
   * Adds or updates query parameters in the current URL.
   * Passing null/undefined/'' will remove the parameter.
   */
  addOrUpdateQueryParams(params: { [key: string]: any }): void {
    const merged = { ...this.activatedRoute.snapshot.queryParams };

    Object.keys(params).forEach(key => {
      const v = params[key];
      if (v === null || v === undefined || v === '') {
        delete merged[key];
      } else if (Array.isArray(v)) {
        merged[key] = v.join(','); // join array to CSV
      } else {
        merged[key] = String(v);
      }
    });

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: merged,
      queryParamsHandling: ''
    });
  }

  /**
   * Clears all existing query parameters and sets new ones.
   * Passing null/undefined/'' will skip that param.
   */
  setQueryParams(params: { [key: string]: any }): void {
    const next: { [key: string]: string } = {};

    Object.keys(params).forEach(key => {
      const v = params[key];
      if (v !== null && v !== undefined && v !== '') {
        next[key] = Array.isArray(v) ? v.join(',') : String(v);
      }
    });

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: next,
      queryParamsHandling: ''
    });
  }

  /** Removes a single query parameter (case-insensitive). */
  removeQueryParam(paramName: string): void {
    this.removeQueryParams([paramName]);
  }

  /** Removes multiple query parameters (case-insensitive). */
  removeQueryParams(paramNames: string[], opts: { replaceUrl?: boolean } = {}): void {
    const current = this.activatedRoute.snapshot.queryParams ?? {};
    const targets = paramNames.map(p => p.toLowerCase());

    // Nađi stvarne ključeve (case-insensitive)
    const toNullify: Record<string, null> = {};
    Object.keys(current).forEach((k) => {
      if (targets.includes(k.toLowerCase())) {
        toNullify[k] = null; // <-- ovako Angular zna da obriše param
      }
    });

    // Ako nema šta da se briše, nema navigacije
    if (Object.keys(toNullify).length === 0) return;

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      // NULIRAMO ono što brišemo i MERGUJEMO sa postojećim -> rezultat = postojeći - ovi ključevi
      queryParams: toNullify,
      queryParamsHandling: 'merge',
      replaceUrl: opts.replaceUrl ?? true,  // ne puni history; po želji stavi false
    });
  }

  /** Keeps only the specified query parameters and removes all others. */
  retainOnlyQueryParams(paramNames: string[]): void {
    const current = this.activatedRoute.snapshot.queryParams;
    const retained: { [key: string]: string } = {};

    paramNames.forEach(k => {
      const v = current[k];
      if (v !== undefined) {
        retained[k] = v;
      }
    });

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: retained,
      queryParamsHandling: ''
    });
  }

  /** Reads query parameters from the current route snapshot. */
  readQueryParams(): Params {
    return this.activatedRoute.snapshot.queryParams;
  }

  /** Parses query parameters from a given URL string. */
  parseQueryParamsFromUrl(url: string): { [key: string]: string } {
    const params: { [key: string]: string } = {};
    const queryString = new URL(url, window.location.origin).search;
    new URLSearchParams(queryString).forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  /** Clears all query parameters from the current URL. */
  clearQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {},
      queryParamsHandling: ''
    });
  }

  /** Checks if a query parameter exists and is non-empty. */
  hasQueryParam(paramName: string): boolean {
    const v = this.activatedRoute.snapshot.queryParams[paramName];
    if (v === null || v === undefined) return false;
    return String(v).trim() !== '';
  }

  /** QoL helper: set category selection (group + optional subgroup). */
  setCategorySelection(groupName?: string, subGroupName?: string | null): void {
    const parts = ['/webshop'];

    if (groupName) {
      parts.push('category', StringUtils.slugify(groupName));
      if (subGroupName) {
        parts.push(StringUtils.slugify(subGroupName));
      }
    }

    this.navigateTo(parts);
  }

  /** Navigate to absolute path (utility method) */
  navigateTo(path: string | any[], extras: NavigationExtras = {}): void {
    if (typeof path === 'string') {
      this.router.navigate([path], extras);
    } else {
      this.router.navigate(path, extras);
    }
  }

  /** Returns the current path (without query params or fragment). */
  getCurrentPath(): string {
    const urlTree = this.router.parseUrl(this.router.url);
    return '/' + urlTree.root.children['primary']?.segments.map(it => it.path).join('/') || '';
  }

  /** Clears webshop filters and navigates correctly */
  clearWebshopFilters(): void {
    const currentPath = this.getCurrentPath();

    if (currentPath.includes('/webshop/manufactures')) {
      this.navigateTo(['/webshop']);
    } else if (currentPath.includes('/webshop/category')) {
      this.navigateTo(['/webshop']);
    } else {
      this.clearQueryParams();
    }
  }
}