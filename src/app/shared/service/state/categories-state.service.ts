import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, shareReplay, tap } from 'rxjs/operators';

// Data Models
import { ArticleCategories, SubCategories } from '../../data-models/model/article-categories';

// Services
import { ArticleGroupService } from '../article-group.service';

// Utils
import { StringUtils } from '../../utils/string-utils';

@Injectable({ providedIn: 'root' })
export class CategoriesStateService {
  /** Holds the cached categories once loaded */
  private readonly categories$ = new BehaviorSubject<
    ArticleCategories[] | null
  >(null);
  private categoryCache: ArticleCategories[] = [];

  /** In-flight request shared by concurrent callers */
  private inFlight$?: Observable<ArticleCategories[]>;

  constructor(private api: ArticleGroupService) { }

  /**
   * Get categories:
   * - If cache exists -> return it immediately.
   * - If not -> trigger HTTP once, share it for concurrent callers, then cache.
   */
  getCategories$(): Observable<ArticleCategories[]> {
    const cached = this.categories$.value;
    if (cached) {
      this.categoryCache = cached;
      return of(cached);
    }

    if (!this.inFlight$) {
      this.inFlight$ = this.api.fetchCategories().pipe(
        tap((data) => {
          const collator = new Intl.Collator('sr', { sensitivity: 'base' });
          const normalise = (value?: string | null) =>
            (value ?? '')
              .normalize('NFKD')
              .replace(/\s+/g, ' ')
              .trim();

          const sorted = (data ?? []).map((category) => ({
            ...category,
            articleSubGroups: [...(category.articleSubGroups ?? [])]
              .sort((a, b) => collator.compare(normalise(a?.name), normalise(b?.name)))
          }));

          this.categoryCache = sorted;
          this.categories$.next(sorted);
        }),
        catchError((err) => throwError(() => err)), // <-- pre shareReplay
        finalize(() => (this.inFlight$ = undefined)),
        shareReplay(1)
      );
    }
    return this.inFlight$;
  }

  /** Optional: force refresh ignoring cache */
  refresh$(): Observable<ArticleCategories[]> {
    this.inFlight$ = this.api.fetchCategories().pipe(
      tap((data) => {
        this.categoryCache = data;
        this.categories$.next(data);
      }),
      catchError((err) => throwError(() => err)),
      finalize(() => (this.inFlight$ = undefined)),
      shareReplay(1)
    );
    return this.inFlight$;
  }

  /** Optional: clear cache so next getCategories$ will call API */
  invalidate(): void {
    this.categoryCache = [];                    // <-- očisti i lokalni cache
    this.categories$.next(null);
  }

  getCategoryLabelById(id: string): ArticleCategories | undefined {
    return this.categoryCache.find((c) => c.groupId === id);
  }

  getCategorySubgroupsLabelById(id: string): SubCategories | undefined {
    return this.categoryCache
      .map((c) => c.articleSubGroups)
      .flat()
      .find((s) => s.subGroupId?.toString() === id);
  }

  getCategoryBySlug(slug: string): ArticleCategories | undefined {
    return this.categoryCache.find((c) => StringUtils.slugify(c.name!) === slug);
  }

  getSubCategoryBySlug(groupId: string, subSlug: string): SubCategories | undefined {
    const group = this.categoryCache.find((c) => c.groupId === groupId);
    if (!group) return undefined;

    return group.articleSubGroups?.find(
      (s) => StringUtils.slugify(s.name!) === subSlug
    );
  }
}
