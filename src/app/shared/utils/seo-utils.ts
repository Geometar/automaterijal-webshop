import { Params } from '@angular/router';

export const SITE_ORIGIN = 'https://automaterijal.com';

const RAW_PARAM_NAMES = [
  'page',
  'pageSize',
  'pageIndex',
  'rowsPerPage',
  'naStanju',
  'sortBy',
  'sortDirection',
  'searchTerm',
  'proizvodjaci',
  'mandatoryProid',
  'mandatoryproid',
  'podgrupe',
  'grupe',
  'pretrazitiGrupe',
  'paged',
  'showcase',
  'assembleGroupId',
  'assemblyGroupId',
  'tecdocTargetId',
  'tecdocTargetType',
  'tecdocId',
  'tecdocType',
];

/** Normalized set (lower-case) of query parameter names triggering noindex behaviour. */
export const FILTER_QUERY_PARAM_NAMES = new Set(
  RAW_PARAM_NAMES.map((name) => name.toLowerCase())
);

/** Builds an absolute canonical URL for a given path. */
export function buildCanonicalFromPath(
  path: string,
  origin: string = SITE_ORIGIN
): string {
  const normalizedPath = path?.trim() || '/';
  if (normalizedPath === '/' || normalizedPath === '') {
    return `${origin}/`;
  }
  return `${origin}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`;
}

/**
 * Returns true when the supplied query parameter collection contains
 * one of the filter/pagination parameters with a non-empty value.
 */
export function hasActiveFilterQuery(
  params?: Params | Readonly<Record<string, unknown>> | null
): boolean {
  if (!params) {
    return false;
  }

  return Object.keys(params).some((key) => {
    const normalizedKey = key.toLowerCase();
    if (!FILTER_QUERY_PARAM_NAMES.has(normalizedKey)) {
      return false;
    }
    const value = (params as Record<string, unknown>)[key];
    return hasMeaningfulValue(value);
  });
}

/** Normalizes various "index/noindex" permutations to a consistent format. */
export function normalizeRobotsTag(value?: string | null): string {
  if (!value) {
    return 'index, follow';
  }

  const normalized = value.replace(/\s+/g, '').toLowerCase();
  if (normalized === 'noindexfollow' || normalized === 'noindex,follow') {
    return 'noindex, follow';
  }
  if (normalized === 'indexfollow' || normalized === 'index,follow') {
    return 'index, follow';
  }
  return value;
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasMeaningfulValue(item));
  }
  const str = String(value).trim();
  return str !== '';
}
