import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, shareReplay, tap } from 'rxjs/operators';

// Data Models
import { ArticleCategories } from '../../data-models/model/article-categories';

//Services
import { ArticleGroupService } from '../article-group.service';

@Injectable({ providedIn: 'root' })
export class CategoriesStateService {
  /** Holds the cached categories once loaded */
  private readonly categories$ = new BehaviorSubject<ArticleCategories[] | null>(null);

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
      return of(cached);
    }

    if (!this.inFlight$) {
      this.inFlight$ = this.api.fetchCategories().pipe(
        tap(data => this.categories$.next(data)),     // cache on success
        finalize(() => (this.inFlight$ = undefined)), // clear in-flight flag
        shareReplay(1),                                // share among subscribers
        catchError(err => {                            // do not poison cache on error
          // optional: you could push null or keep old cache
          throw err;
        })
      );
    }

    return this.inFlight$;
  }

  /** Optional: force refresh ignoring cache */
  refresh$(): Observable<ArticleCategories[]> {
    this.inFlight$ = this.api.fetchCategories().pipe(
      tap(data => this.categories$.next(data)),
      finalize(() => (this.inFlight$ = undefined)),
      shareReplay(1)
    );
    return this.inFlight$;
  }

  /** Optional: clear cache so next getCategories$ will call API */
  invalidate(): void {
    this.categories$.next(null);
  }
}