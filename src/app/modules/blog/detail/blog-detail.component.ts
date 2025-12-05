import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, Subject, catchError, forkJoin, map, of, switchMap, takeUntil, tap } from 'rxjs';
import { BlogService } from '../../../shared/service/blog.service';

// Autom imports
import { DividerComponent } from '../../../shared/components/divider/divider.component';
import { MetaPillComponent } from '../../../shared/components/meta-pill/meta-pill.component';
import { ShowcaseComponent, ShowcaseSection } from '../../../shared/components/showcase/showcase.component';

// Data models
import {
  BlogComment,
  BlogCommentRequest,
  BlogPostDetail,
  BlogPreview,
  BlogShowcaseCategoryConfig,
  BlogShowcaseManufacturerConfig,
} from '../../../shared/data-models/model';
import { Filter, Magacin, Roba } from '../../../shared/data-models/model/roba';

// Services
import { RobaService } from '../../../shared/service/roba.service';
import { SeoService } from '../../../shared/service/seo.service';
import { SnackbarService } from '../../../shared/service/utils/snackbar.service';
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';

// Utils
import { StringUtils } from '../../../shared/utils/string-utils';

type BlogPostDetailViewModel = BlogPostDetail & {
  primaryCategorySlug: string | null;
  primaryCategoryName: string;
  coverImageSrc: string | null;
};

type RelatedPreviewViewModel = BlogPreview & {
  primaryCategoryName: string;
  coverImageSrc: string | null;
};

const DEFAULT_IMAGE_CONTENT_TYPE = 'image/jpeg';
const COMMENT_SESSION_KEY_PREFIX = 'blog-commented-';
const COMMENT_HIDE_TIMEOUT = 15 * 60 * 1000; // 15 minuta

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ShowcaseComponent, DividerComponent, MetaPillComponent],
  templateUrl: './blog-detail.component.html',
  styleUrl: './blog-detail.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class BlogDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly blogService = inject(BlogService);
  private readonly seoService = inject(SeoService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly robaService = inject(RobaService);
  private readonly urlHelperService = inject(UrlHelperService);
  private readonly snackbar = inject(SnackbarService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly post = signal<BlogPostDetailViewModel | null>(null);
  readonly htmlContent = signal<SafeHtml | null>(null);
  readonly comments = signal<BlogComment[]>([]);
  readonly submittingComment = signal(false);
  readonly related = signal<RelatedPreviewViewModel[]>([]);
  readonly showcaseSections = signal<ShowcaseSection[]>([]);
  readonly showcaseLoading = signal(false);
  readonly commentLocked = signal(false);

  commentAuthor = '';
  commentEmail = '';
  commentBody = '';

  private readonly destroy$ = new Subject<void>();
  private readonly showcaseTakenIds = new Set<number>();
  private currentSlug: string | null = null;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const slug = params.get('slug');
          if (!slug) {
            this.error.set('Članak nije pronađen.');
            this.loading.set(false);
            return of(null);
          }
          this.currentSlug = slug;
          this.restoreCommentLock(slug);
          return this.fetchPost(slug);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submitComment(slug: string) {
    if (!this.commentAuthor.trim() || !this.commentBody.trim()) {
      return;
    }

    if (this.commentLocked()) {
      return;
    }

    const payload: BlogCommentRequest = {
      authorName: this.commentAuthor.trim(),
      authorEmail: this.commentEmail.trim() || undefined,
      content: this.commentBody.trim(),
    };

    this.submittingComment.set(true);

    this.blogService
      .submitComment(slug, payload)
      .pipe(
        tap((newComment) => {
          if (!newComment) {
            return;
          }
          const normalized = {
            ...newComment,
            content: this.normalizeWhitespace(newComment.content ?? ''),
            authorName: this.normalizeWhitespace(newComment.authorName ?? ''),
          };
          this.comments.set([normalized, ...this.comments()]);
          this.commentAuthor = '';
          this.commentEmail = '';
          this.commentBody = '';
          this.setCommentLock(slug);
        }),
        catchError((err) => {
          console.error('Failed to submit comment', err);
          this.snackbar.showError('Trenutno nije moguće poslati komentar.');
          return of(null);
        }),
        tap(() => this.submittingComment.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  trackCommentBy(_: number, comment: BlogComment) {
    return comment.id;
  }

  private fetchPost(slug: string) {
    this.loading.set(true);
    this.error.set(null);

    return this.blogService.getPostBySlug(slug).pipe(
      tap((detail) => {
        this.handlePost(detail);
        this.fetchComments(slug);
      }),
      catchError((err) => {
        console.error('Failed to fetch blog post', err);
        this.error.set('Članak nije pronađen ili je došlo do greške.');
        this.loading.set(false);
        return of(null);
      })
    );
  }

  private fetchComments(slug: string) {
    this.blogService
      .getComments(slug)
      .pipe(
        map((items) =>
          (items ?? []).map((comment) => ({
            ...comment,
            content: this.normalizeWhitespace(comment.content ?? ''),
            authorName: this.normalizeWhitespace(comment.authorName ?? ''),
          }))
        ),
        catchError(() => of<BlogComment[]>([])),
        tap((items) => this.comments.set(items)),
        tap(() => this.loading.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private handlePost(detail: BlogPostDetail | null) {
    if (!detail) return;

    const viewModel = this.toDetailViewModel(detail);
    this.post.set(viewModel);
    this.related.set((detail.related ?? []).map((item) => this.toPreviewViewModel(item)));
    const normalizedContent = this.normalizeHtml(detail.content ?? '');
    this.htmlContent.set(this.sanitizer.bypassSecurityTrustHtml(normalizedContent));
    this.updateSeo(detail);
    this.loadShowcase(detail);
  }

  private restoreCommentLock(slug: string) {
    if (!this.isBrowser()) {
      this.commentLocked.set(false);
      return;
    }
    const key = `${COMMENT_SESSION_KEY_PREFIX}${slug}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      this.commentLocked.set(false);
      return;
    }
    const timestamp = Number(raw);
    if (!Number.isFinite(timestamp)) {
      localStorage.removeItem(key);
      this.commentLocked.set(false);
      return;
    }

    const now = Date.now();
    if (now - timestamp > COMMENT_HIDE_TIMEOUT) {
      localStorage.removeItem(key);
      this.commentLocked.set(false);
      return;
    }

    this.commentLocked.set(true);
  }

  private setCommentLock(slug: string) {
    if (!this.isBrowser()) return;
    localStorage.setItem(`${COMMENT_SESSION_KEY_PREFIX}${slug}`, Date.now().toString());
    this.commentLocked.set(true);
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private toDetailViewModel(detail: BlogPostDetail): BlogPostDetailViewModel {
    const primaryCategory = detail.categories?.[0];
    let primaryCategorySlug: string | null = null;

    if (primaryCategory) {
      if (primaryCategory.slug) {
        primaryCategorySlug = primaryCategory.slug;
      } else if (primaryCategory.id !== undefined && primaryCategory.id !== null) {
        primaryCategorySlug = String(primaryCategory.id);
      }
    }

    return {
      ...detail,
      title: this.normalizeWhitespace(detail.title ?? ''),
      excerpt: this.normalizeWhitespace(detail.excerpt ?? ''),
      primaryCategorySlug,
      primaryCategoryName: primaryCategory?.name ?? 'Blog',
      coverImageSrc: this.buildImageSrc(
        detail.coverImageBytes,
        detail.coverImageContentType,
        detail.coverImageUrl
      ),
    };
  }

  private toPreviewViewModel(preview: BlogPreview): RelatedPreviewViewModel {
    const primaryCategory = preview.categories?.[0];
    return {
      ...preview,
      title: this.normalizeWhitespace(preview.title ?? ''),
      excerpt: this.normalizeWhitespace(preview.excerpt ?? ''),
      primaryCategoryName: primaryCategory?.name ?? 'Blog',
      coverImageSrc: this.buildImageSrc(
        preview.coverImageBytes,
        preview.coverImageContentType,
        preview.coverImageUrl
      ),
    };
  }

  private normalizeWhitespace(value: string): string {
    if (!value) {
      return '';
    }
    return value.replace(/\u00a0|&nbsp;|&#160;/gi, ' ');
  }

  private normalizeHtml(html: string): string {
    if (!html) {
      return '';
    }
    return html
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/\u00a0/g, ' ')
      .replace(/<p[^>]*>(\s|&nbsp;|&#160;|<br\s*\/?>)*<\/p>/gi, '')
      .replace(/<h[1-6][^>]*>(\s|&nbsp;|&#160;|<br\s*\/?>)*<\/h[1-6]>/gi, '')
      .trim();
  }

  private loadShowcase(detail: BlogPostDetail): void {
    const config = detail.showcase;
    this.showcaseSections.set([]);
    this.showcaseLoading.set(false);
    this.showcaseTakenIds.clear();

    if (!config) {
      return;
    }

    const requests: Array<Observable<ShowcaseSection | null>> = [];

    if (config.category?.groupId) {
      requests.push(this.fetchCategoryShowcase(config.category));
    }

    if (config.manufacturer?.manufacturerId) {
      requests.push(this.fetchManufacturerShowcase(config.manufacturer));
    }

    if (!requests.length) {
      return;
    }

    this.showcaseLoading.set(true);

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sections) => {
          this.showcaseSections.set(
            sections.filter((section): section is ShowcaseSection => !!section)
          );
          this.showcaseLoading.set(false);
        },
        error: () => {
          this.showcaseLoading.set(false);
        },
      });
  }

  private fetchCategoryShowcase(
    config: BlogShowcaseCategoryConfig
  ): Observable<ShowcaseSection | null> {
    const filter = new Filter();
    filter.naStanju = true;
    filter.grupe = [config.groupId];
    if (config.subGroupId != null && config.subGroupId !== '') {
      filter.podgrupe = [String(config.subGroupId)];
    }

    const limit = Math.max(1, config.limit ?? 5);
    return this.robaService
      .pronadjiSvuRobu(null, limit * 3, 0, '', filter)
      .pipe(
        map((magacin) => this.buildCategorySection(magacin, config, limit)),
        catchError(() => of(null))
      );
  }

  private fetchManufacturerShowcase(
    config: BlogShowcaseManufacturerConfig
  ): Observable<ShowcaseSection | null> {
    const filter = new Filter();
    filter.naStanju = true;
    filter.proizvodjaci = [config.manufacturerId];

    const limit = Math.max(1, config.limit ?? 5);
    return this.robaService
      .pronadjiSvuRobu(null, limit * 3, 0, '', filter)
      .pipe(
        map((magacin) => this.buildManufacturerSection(magacin, config, limit)),
        catchError(() => of(null))
      );
  }

  private buildCategorySection(
    magacin: Magacin | null,
    config: BlogShowcaseCategoryConfig,
    limit: number
  ): ShowcaseSection | null {
    const artikli = this.pickArticles(
      ((magacin?.robaDto?.content ?? []) as Roba[]) || [],
      limit
    );

    if (!artikli.length) {
      return null;
    }

    const groupName = config.groupName ?? config.groupId;
    const subGroupName = config.subGroupName ?? undefined;
    const title = subGroupName
      ? `Još iz kategorije: ${subGroupName}`
      : `Još iz kategorije: ${groupName}`;
    const titleUrl = this.urlHelperService.buildCategoryUrl(groupName, subGroupName ?? null);

    return {
      title,
      titleUrl,
      artikli,
    };
  }

  private buildManufacturerSection(
    magacin: Magacin | null,
    config: BlogShowcaseManufacturerConfig,
    limit: number
  ): ShowcaseSection | null {
    const artikli = this.pickArticles(
      ((magacin?.robaDto?.content ?? []) as Roba[]) || [],
      limit
    );

    if (!artikli.length) {
      return null;
    }

    const name = config.manufacturerName ?? config.manufacturerId;
    const slug = StringUtils.slugify(name);
    const titleUrl = `/webshop/manufacturers/${slug}`;

    return {
      title: `Još od proizvođača: ${name}`,
      titleUrl,
      artikli,
    };
  }

  private pickArticles(items: Roba[], limit: number): Roba[] {
    const picked: Roba[] = [];
    for (const item of items) {
      const id = Number(item.robaid);
      if (!id || this.showcaseTakenIds.has(id)) continue;
      if (!this.hasImage(item)) continue;
      this.showcaseTakenIds.add(id);
      picked.push(item);
      if (picked.length >= limit) break;
    }
    return picked;
  }

  private hasImage(roba: Roba): boolean {
    const slika = roba.slika;
    return !!slika?.slikeUrl;
  }

  private updateSeo(detail: BlogPostDetail) {
    const canonical = detail.canonicalUrl || `https://automaterijal.com/blog/${detail.slug}`;
    const metaKeywords = detail.metaKeywords
      ? detail.metaKeywords
      : detail.tags?.map((t) => t.name).join(', ');
    const imageSrc =
      this.buildImageSrc(detail.coverImageBytes, detail.coverImageContentType, detail.coverImageUrl) ??
      'https://automaterijal.com/images/logo/logo.svg';

    this.seoService.updateSeoTags({
      title: detail.metaTitle || `${detail.title} | Automaterijal blog`,
      description: detail.metaDescription || detail.excerpt,
      url: canonical,
      canonical,
      type: 'article',
      image: imageSrc,
      imageAlt: detail.title,
      keywords: metaKeywords || undefined,
    });

    const articleLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: detail.title,
      datePublished: detail.publishedAt,
      image: imageSrc ?? undefined,
      author: detail.author ? { '@type': 'Person', name: detail.author.name } : undefined,
      mainEntityOfPage: canonical,
      description: detail.metaDescription || detail.excerpt,
    };
    this.seoService.setJsonLd(articleLd, 'jsonld-blog');
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
}
