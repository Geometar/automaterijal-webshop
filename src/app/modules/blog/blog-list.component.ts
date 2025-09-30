import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterModule } from '@angular/router';
import { Subject, catchError, combineLatest, map, of, switchMap, takeUntil, tap } from 'rxjs';
import { BlogService } from '../../shared/service/blog.service';
import { AccountService } from '../../shared/auth/service/account.service';
import { AccountStateService } from '../../shared/service/state/account-state.service';
import {
  BlogCategory,
  BlogListQuery,
  BlogListResponse,
  BlogPreview,
  BlogStatus,
  BlogTag,
} from '../../shared/data-models/model';
import { SeoService } from '../../shared/service/seo.service';

type BlogCategoryViewModel = BlogCategory & {
  countDisplay?: number | string;
};

type BlogPreviewViewModel = BlogPreview & {
  primaryCategoryName: string;
  coverImageSrc: string | null;
};

const DEFAULT_IMAGE_CONTENT_TYPE = 'image/jpeg';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './blog-list.component.html',
  styleUrl: './blog-list.component.scss',
})
export class BlogListComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly blogService = inject(BlogService);
  private readonly seoService = inject(SeoService);
  private readonly accountService = inject(AccountService);
  private readonly accountStateService = inject(AccountStateService);

  readonly pageSizeOptions = [6, 10, 12];

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly posts = signal<BlogPreviewViewModel[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(this.pageSizeOptions[0]);
  readonly categories = signal<BlogCategoryViewModel[]>([]);
  readonly tags = signal<BlogTag[]>([]);
  readonly totalPagesMeta = signal(1);

  readonly activeCategory = signal<string | null>(null);
  readonly activeTag = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<BlogStatus | 'ALL'>('PUBLISHED');
  readonly canViewInternalStatuses = signal(false);

  readonly totalPages = computed(() => {
    return this.totalPagesMeta() || Math.max(1, Math.ceil((this.total() || 1) / (this.size() || 1)));
  });

  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.canViewInternalStatuses.set(this.accountStateService.isUserLoggedIn());

    this.accountService.authenticationState
      .pipe(takeUntil(this.destroy$))
      .subscribe((account) => {
        const canView = !!account;
        const hadAccess = this.canViewInternalStatuses();
        this.canViewInternalStatuses.set(canView);

        if (!canView && hadAccess && this.statusFilter() !== 'PUBLISHED') {
          this.statusFilter.set('PUBLISHED');
          this.updateQuery({ status: undefined });
        }
      });

    this.blogService
      .getCategories()
      .pipe(
        map((items) => items.map((category) => this.toCategoryViewModel(category))),
        catchError(() => of([] as BlogCategoryViewModel[])),
        tap((items) => this.categories.set(items)),
        takeUntil(this.destroy$)
      )
      .subscribe();

    this.blogService
      .getTags()
      .pipe(
        tap((items) => this.tags.set(items)),
        catchError(() => of([])),
        takeUntil(this.destroy$)
      )
      .subscribe();

    combineLatest([this.route.queryParamMap])
      .pipe(
        map(([params]) => this.normalizeQueryParams(params)),
        tap((query) => {
          this.page.set(query.page ?? 0);
          this.size.set(query.size ?? this.pageSizeOptions[0]);
          this.activeCategory.set(query.category ?? null);
          this.activeTag.set(query.tag ?? null);
          this.searchTerm.set(query.search ?? '');
          const effectiveStatus = this.effectiveStatus(query.status);
          this.statusFilter.set(effectiveStatus);

          const rawStatusParam = this.route.snapshot.queryParamMap.get('status');
          const normalizedRawStatus = rawStatusParam?.toUpperCase() ?? undefined;

          if (!this.canViewInternalStatuses() && normalizedRawStatus && normalizedRawStatus !== 'PUBLISHED') {
            this.updateQuery({ status: undefined });
          } else if (this.canViewInternalStatuses()) {
            if (
              (effectiveStatus === 'PUBLISHED' && normalizedRawStatus && normalizedRawStatus !== 'PUBLISHED') ||
              (effectiveStatus !== 'PUBLISHED' && normalizedRawStatus !== effectiveStatus)
            ) {
              const param = effectiveStatus === 'PUBLISHED' ? undefined : effectiveStatus;
              this.updateQuery({ status: param });
            }
          }
        }),
        switchMap((query) => this.fetchPosts(query)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch(term: string) {
    const value = term.trim();
    this.updateQuery({ search: value || undefined, page: 0 });
  }

  onSelectCategory(category: string | null) {
    this.updateQuery({
      category: category ?? undefined,
      page: 0,
    });
  }

  onSelectTag(tag: string | null) {
    this.updateQuery({
      tag: tag ?? undefined,
      page: 0,
    });
  }

  onChangeStatus(status: BlogStatus | 'ALL') {
    if (!this.canViewInternalStatuses() && status !== 'PUBLISHED') {
      this.statusFilter.set('PUBLISHED');
      this.updateQuery({ status: undefined, page: 0 });
      return;
    }

    const effectiveStatus = this.effectiveStatus(status);
    this.statusFilter.set(effectiveStatus);
    const param = effectiveStatus === 'PUBLISHED' || effectiveStatus === 'ALL' ? undefined : effectiveStatus;
    this.updateQuery({ status: param, page: 0 });
  }

  onChangePage(nextPage: number) {
    if (nextPage < 0 || nextPage >= this.totalPages()) {
      return;
    }
    this.updateQuery({ page: nextPage });
  }

  onChangeSize(nextSize: number) {
    const parsed = Number(nextSize);
    const sanitized = Number.isFinite(parsed) ? parsed : this.pageSizeOptions[0];
    const sizeParam = sanitized === this.pageSizeOptions[0] ? undefined : sanitized;
    this.updateQuery({ size: sizeParam, page: 0 });
  }

  trackBySlug(_: number, item: BlogPreviewViewModel) {
    return item.slug;
  }

  categoryIdentifier(category: BlogCategoryViewModel): string {
    return category.slug ?? String(category.id ?? '');
  }

  tagIdentifier(tag: BlogTag): string {
    return tag.slug ?? String(tag.id ?? '');
  }

  private toCategoryViewModel(category: BlogCategory): BlogCategoryViewModel {
    const fallback = (category as { postCount?: number | string | null }).postCount;
    const count = category.count ?? fallback;

    return {
      ...category,
      countDisplay: count ?? undefined,
    };
  }

  private toPreviewViewModel(item: BlogPreview): BlogPreviewViewModel {
    const primaryCategory = item.categories?.[0];
    return {
      ...item,
      primaryCategoryName: primaryCategory?.name ?? 'Blog',
      coverImageSrc: this.buildImageSrc(
        item.coverImageBytes,
        item.coverImageContentType,
        item.coverImageUrl
      ),
    };
  }

  private buildImageSrc(
    bytes?: string | null,
    contentType?: string | null,
    url?: string | null
  ): string | null {
    if (bytes) {
      return `data:${contentType || DEFAULT_IMAGE_CONTENT_TYPE};base64,${bytes}`;
    }
    if (url) {
      return url;
    }
    return null;
  }

  private fetchPosts(query: BlogListQuery & { status?: BlogStatus | 'ALL' }) {
    this.loading.set(true);
    this.error.set(null);

    const currentStatus = this.statusFilter();
    const requestStatus = currentStatus === 'PUBLISHED' ? undefined : currentStatus;
    const normalizedQuery: BlogListQuery & { status?: BlogStatus | 'ALL' } = { ...query };
    if (requestStatus) {
      normalizedQuery.status = requestStatus;
    } else {
      delete (normalizedQuery as Partial<typeof normalizedQuery>).status;
    }

    return this.blogService
      .getPosts({ ...query, status: requestStatus ?? undefined })
      .pipe(
        tap((response) => this.handleResponse(response, normalizedQuery)),
        catchError((err) => {
          console.error('Failed to fetch blog posts', err);
          this.error.set('Trenutno nije moguće učitati članke. Pokušajte ponovo kasnije.');
          this.posts.set([]);
          this.total.set(0);
          this.updateSeo(normalizedQuery, 0, []);
          this.loading.set(false);
          return of(null);
        })
      );
  }

  private handleResponse(response: BlogListResponse | null, query: BlogListQuery & { status?: BlogStatus | 'ALL' }) {
    if (!response) return;
    const items = response.items ?? [];
    const enrichedItems = items.map((item) => this.toPreviewViewModel(item));

    this.posts.set(enrichedItems);
    const meta = response.meta;
    this.total.set(meta?.totalElements ?? items.length ?? 0);
    this.page.set(meta?.page ?? 0);
    this.size.set(meta?.size ?? this.pageSizeOptions[0]);
    this.totalPagesMeta.set(meta?.totalPages ?? 1);
    this.updateSeo(query, meta?.totalElements ?? items.length ?? 0, enrichedItems);
    this.loading.set(false);
  }

  private updateSeo(query: BlogListQuery & { status?: BlogStatus | 'ALL' }, total: number, posts: BlogPreviewViewModel[]) {
    const baseTitle = 'Blog | Automaterijal';
    const parts: string[] = [];

    if (query.search) parts.push(`Pretraga: "${query.search}"`);
    if (query.category) {
      const cat = this.categories().find((c) => c.slug === query.category || String(c.id) === query.category);
      if (cat) parts.push(cat.name);
    }
    if (query.tag) {
      const tag = this.tags().find((t) => t.slug === query.tag || String(t.id) === query.tag);
      if (tag) parts.push(`#${tag.name}`);
    }
    if (query.status && query.status !== 'PUBLISHED') {
      if (query.status === 'DRAFT') parts.push('Draft');
      else if (query.status === 'ARCHIVED') parts.push('Arhivirano');
      else if (query.status === 'ALL') parts.push('Sve objave');
      else parts.push(query.status);
    }

    const title = parts.length ? `${parts.join(' · ')} | ${baseTitle}` : baseTitle;
    const description = posts.length
      ? `Pogledajte najnovije članke${query.category ? ' u kategoriji ' + parts[0] : ''}. Trenutno ${total} objava.`
      : 'Trenutno nema objava koje odgovaraju kriterijumima pretrage.';

    const url = this.buildCanonicalUrl(query);

    this.seoService.updateSeoTags({
      title,
      description,
      url,
      type: 'website',
      image: posts[0]?.coverImageSrc ?? 'https://automaterijal.com/images/logo/logo.svg',
      imageAlt: posts[0]?.title ?? 'Automaterijal blog',
      canonical: url,
    });

    this.setPaginationLinks(url, query, total);
  }

  private normalizeQueryParams(paramMap: import('@angular/router').ParamMap): BlogListQuery & { status?: BlogStatus | 'ALL' } {
    const page = Number(paramMap.get('page') ?? '0');
    const size = Number(paramMap.get('size') ?? this.pageSizeOptions[0]);
    const category = paramMap.get('category') ?? undefined;
    const tag = paramMap.get('tag') ?? undefined;
    const search = paramMap.get('search') ?? undefined;
    const statusParam = paramMap.get('status');
    let status: BlogStatus | 'ALL' | undefined;

    if (statusParam) {
      const normalized = statusParam.toUpperCase();
      if (this.isValidStatusValue(normalized)) {
        status = normalized as BlogStatus | 'ALL';
      }
    }

    const sanitizedStatus = this.filterStatusByPermission(status);

    return {
      page: Number.isFinite(page) && page >= 0 ? page : 0,
      size: Number.isFinite(size) && size > 0 ? size : this.pageSizeOptions[0],
      category,
      tag,
      search,
      status: sanitizedStatus,
    };
  }

  private updateQuery(update: Partial<BlogListQuery & { status?: BlogStatus | 'ALL' }>) {
    const params: Params = { ...this.route.snapshot.queryParams };

    Object.entries(update).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        delete params[key];
      } else {
        params[key] = value;
      }
    });

    const statusValue = params['status'];
    if (typeof statusValue === 'string') {
      const normalized = statusValue.toUpperCase();
      if (normalized === 'ALL' || normalized === 'PUBLISHED') {
        delete params['status'];
      } else {
        params['status'] = normalized;
      }
    }

    if (typeof params['category'] === 'string' && !params['category'].trim()) {
      delete params['category'];
    }

    if (typeof params['tag'] === 'string' && !params['tag'].trim()) {
      delete params['tag'];
    }

    if ('page' in params) {
      const pageValue = Number(params['page']);
      if (!Number.isFinite(pageValue) || pageValue <= 0) {
        delete params['page'];
      } else {
        params['page'] = pageValue;
      }
    }

    if ('size' in params) {
      const sizeValue = Number(params['size']);
      if (!Number.isFinite(sizeValue) || sizeValue === this.pageSizeOptions[0]) {
        delete params['size'];
      } else {
        params['size'] = sizeValue;
      }
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
    });
  }

  private effectiveStatus(status?: BlogStatus | 'ALL'): BlogStatus | 'ALL' {
    const normalized = status ? this.normalizeStatusValue(status) : 'PUBLISHED';
    if (normalized === 'PUBLISHED') {
      return 'PUBLISHED';
    }
    return this.canViewInternalStatuses() ? normalized : 'PUBLISHED';
  }

  private filterStatusByPermission(status?: BlogStatus | 'ALL'): BlogStatus | 'ALL' | undefined {
    if (!status) {
      return undefined;
    }
    const normalized = this.normalizeStatusValue(status);
    if (normalized === 'PUBLISHED') {
      return 'PUBLISHED';
    }
    return this.canViewInternalStatuses() ? normalized : undefined;
  }

  private normalizeStatusValue(status: BlogStatus | 'ALL'): BlogStatus | 'ALL' {
    return typeof status === 'string'
      ? (status.toUpperCase() as BlogStatus | 'ALL')
      : status;
  }

  private isValidStatusValue(value: string): value is 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'ALL' {
    return ['PUBLISHED', 'DRAFT', 'ARCHIVED', 'ALL'].includes(value);
  }

  private buildCanonicalUrl(query: BlogListQuery & { status?: BlogStatus | 'ALL' }): string {
    const searchParams = new URLSearchParams();
    if (query.search) searchParams.set('search', query.search);
    if (query.category) searchParams.set('category', query.category);
    if (query.tag) searchParams.set('tag', query.tag);
    if (query.page && query.page > 0) searchParams.set('page', String(query.page));
    if (query.size && query.size !== this.pageSizeOptions[0]) {
      searchParams.set('size', String(query.size));
    }
    if (query.status && query.status !== 'PUBLISHED') {
      searchParams.set('status', query.status.toLowerCase());
    }

    const qp = searchParams.toString();
    return qp ? `https://automaterijal.com/blog?${qp}` : 'https://automaterijal.com/blog';
  }

  private setPaginationLinks(url: string, query: BlogListQuery & { status?: BlogStatus | 'ALL' }, total: number) {
    const size = query.size ?? this.pageSizeOptions[0];
    const page = query.page ?? 0;
    const totalPages = Math.max(1, Math.ceil((total || 0) / (size || 1)));

    const basePrev = new URL(url);
    const baseNext = new URL(url);

    if (page > 0) {
      basePrev.searchParams.set('page', String(page - 1));
      this.seoService.setLinkRel('prev', basePrev.toString());
    } else {
      this.seoService.setLinkRel('prev', null);
    }

    if (page + 1 < totalPages) {
      baseNext.searchParams.set('page', String(page + 1));
      this.seoService.setLinkRel('next', baseNext.toString());
    } else {
      this.seoService.setLinkRel('next', null);
    }
  }
}
