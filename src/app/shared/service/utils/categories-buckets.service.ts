import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { combineLatest, map, Observable } from 'rxjs';
import { ArticleCategories, Bucket, BucketGroup, CategoriesConfig, SubCategories } from '../../data-models/model/article-categories';
import { CategoriesStateService } from '../state/categories-state.service';


@Injectable({ providedIn: 'root' })
export class CategoriesBucketsService {
  constructor(
    private http: HttpClient,
    private state: CategoriesStateService
  ) { }

  /**
   * Loads categories and config in parallel and returns buckets.
   */
  getBuckets$(): Observable<Bucket[]> {
    return combineLatest([
      this.state.getCategories$(), // fetch categories from backend
      this.http.get<CategoriesConfig>('config/categories-config.json') // load JSON config
    ]).pipe(
      map(([groups, cfg]) => this.bucketize(groups, cfg))
    );
  }

  /**
   * Groups ArticleCategories into buckets defined in config.
   */
  private bucketize(groups: ArticleCategories[], cfg: CategoriesConfig): Bucket[] {
    // Build a lookup map of all groups by groupId
    const all: Record<string, BucketGroup> = {};
    for (const g of groups) {
      if (g.groupId) {
        all[g.groupId] = {
          code: g.groupId,
          name: g.name ?? g.groupId,
          subgroups: (g.articleSubGroups || []).map((s: SubCategories) => {
            return {
              id: s.subGroupId ?? 0,
              name: s.name ?? ''
            };
          })
        };
      }
    }

    const picked = new Set<string>();

    // Initialize buckets from config
    const buckets: Bucket[] = cfg.parents
      .filter((p) => p.show !== false)
      .map((p) => {
        return {
          key: p.key,
          label: p.label,
          order: p.order,
          icon: p.icon,
          groups: []
        };
      });

    // Helper to add a group to a bucket with overrides applied
    const add = (bucket: Bucket, code: string): void => {
      const g = all[code];
      if (!g) {
        return;
      }

      const ov = cfg.overrides?.[code];
      bucket.groups.push({
        ...g,
        name: ov?.label ?? g.name,
        slug: ov?.slug,
        icon: ov?.icon
      });
      picked.add(code);
    };

    // 1) Add groups that are explicitly listed in "include"
    for (const bucket of buckets) {
      const pcfg = cfg.parents.find((p) => p.key === bucket.key);
      if (pcfg && pcfg.include !== '*') {
        for (const code of pcfg.include) {
          if (all[code]) {
            add(bucket, code);
          }
        }
      }
    }

    // 2) Handle buckets with "include": "*"
    for (const bucket of buckets) {
      const pcfg = cfg.parents.find((p) => p.key === bucket.key);
      if (pcfg && pcfg.include === '*') {
        const ex = new Set(pcfg.exclude ?? []);
        for (const code of Object.keys(all)) {
          if (!picked.has(code) && !ex.has(code)) {
            add(bucket, code);
          }
        }
      }
    }

    // 3) Fallback for any leftover groups
    const leftover = Object.keys(all).filter((c) => !picked.has(c));
    if (leftover.length > 0) {
      const fbKey = cfg.defaults?.fallbackParent ?? 'AUTODELOVI';
      const fb = buckets.find((b) => b.key === fbKey);
      if (fb) {
        for (const code of leftover) {
          add(fb, code);
        }
      }
    }

    // Sort groups alphabetically within each bucket
    for (const b of buckets) {
      b.groups.sort((a, z) => a.name.localeCompare(z.name, 'sr'));
    }

    // Sort buckets by "order" from config
    return buckets.sort((a, z) => a.order - z.order);
  }
}