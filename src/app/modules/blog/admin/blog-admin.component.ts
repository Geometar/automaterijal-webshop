import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, catchError, of, takeUntil, tap } from 'rxjs';
import { QuillModule, type QuillModules } from 'ngx-quill';

import { BlogService } from '../../../shared/service/blog.service';

// Autom imports
import { AutomLabelComponent } from '../../../shared/components/autom-label/autom-label.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { SelectComponent } from '../../../shared/components/select/select.component';
import { SelectModel } from '../../../shared/data-models/interface/selected-item.interface';
import { TextAreaComponent } from '../../../shared/components/text-area/text-area.component';

// Data models
import {
  BlogCategory,
  BlogListQuery,
  BlogListResponse,
  BlogPostDetail,
  BlogPostRequest,
  BlogPreview,
  BlogShowcaseCategoryConfig,
  BlogShowcaseConfig,
  BlogShowcaseManufacturerConfig,
  BlogStatus,
  BlogTag,
  BlogCategoryPayload,
  BlogTagPayload,
} from '../../../shared/data-models/model';

// Enums
import {
  ButtonThemes,
  ButtonTypes,
  InputTypeEnum,
  SizeEnum,
} from '../../../shared/data-models/enums';
import { Manufacture } from '../../../shared/data-models/model';
import { ArticleCategories, SubCategories } from '../../../shared/data-models/model/article-categories';

// Services
import { CategoriesStateService } from '../../../shared/service/state/categories-state.service';
import { ManufactureService } from '../../../shared/service/manufacture.service';
import { SnackbarService } from '../../../shared/service/utils/snackbar.service';

// Utils
import { StringUtils } from '../../../shared/utils/string-utils';

const DEFAULT_IMAGE_CONTENT_TYPE = 'image/jpeg';
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

type BlogFormTextControl =
  | 'title'
  | 'slug'
  | 'excerpt'
  | 'coverImageUrl'
  | 'metaTitle'
  | 'metaDescription'
  | 'canonicalUrl'
  | 'metaKeywords'
  | 'publishedAt';

@Component({
  selector: 'app-blog-admin',
  standalone: true,
  imports: [
    AutomLabelComponent,
    ButtonComponent,
    CommonModule,
    FormsModule,
    InputFieldsComponent,
    QuillModule,
    ReactiveFormsModule,
    RouterModule,
    SelectComponent,
    TextAreaComponent,
  ],
  templateUrl: './blog-admin.component.html',
  styleUrl: './blog-admin.component.scss',
})
export class BlogAdminComponent implements OnInit, OnDestroy {
  private readonly blogService = inject(BlogService);
  private readonly fb = inject(FormBuilder);
  private readonly categoriesState = inject(CategoriesStateService);
  private readonly manufactureService = inject(ManufactureService);
  private readonly snackbar = inject(SnackbarService);

  readonly statuses: Array<BlogStatus | 'ALL'> = ['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'];
  readonly postStatuses: BlogStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
  private readonly statusBadgeMap: Record<BlogStatus, { label: string; class: string }> = {
    DRAFT: { label: 'Draft', class: 'status-pill--draft' },
    PUBLISHED: { label: 'Objavljeno', class: 'status-pill--published' },
    ARCHIVED: { label: 'Arhivirano', class: 'status-pill--archived' },
  };
  private readonly statusFilterLabelMap: Record<BlogStatus | 'ALL', string> = {
    ALL: 'Sve objave',
    DRAFT: this.statusBadgeMap.DRAFT.label,
    PUBLISHED: this.statusBadgeMap.PUBLISHED.label,
    ARCHIVED: this.statusBadgeMap.ARCHIVED.label,
  };
  readonly loadingList = signal(false);
  readonly loadingForm = signal(false);
  readonly error = signal<string | null>(null);
  readonly posts = signal<BlogPreview[]>([]);
  readonly categories = signal<BlogCategory[]>([]);
  readonly tags = signal<BlogTag[]>([]);
  readonly statusFilter = signal<BlogStatus | 'ALL'>('ALL');
  readonly statusSelections: SelectModel[] = this.postStatuses.map((status) => ({
    key: status,
    value: this.statusLabel(status),
  }));

  readonly selectedStatus = signal<SelectModel | null>(this.statusSelections[0] ?? null);

  readonly categoryForm = this.fb.group({
    id: this.fb.control<number | string | null>(null),
    name: this.fb.control<string>('', {
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    slug: this.fb.control<string>('', {
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    description: this.fb.control<string>('', {
      validators: [Validators.maxLength(200)],
    }),
  });

  readonly tagForm = this.fb.group({
    id: this.fb.control<number | string | null>(null),
    name: this.fb.control<string>('', {
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    slug: this.fb.control<string>('', {
      validators: [Validators.required, Validators.maxLength(80)],
    }),
  });

  readonly categorySaving = signal(false);
  readonly tagSaving = signal(false);
  readonly categoryError = signal<string | null>(null);
  readonly tagError = signal<string | null>(null);
  readonly categorySuccess = signal<string | null>(null);
  readonly tagSuccess = signal<string | null>(null);

  readonly inputTypeEnum = InputTypeEnum;
  readonly sizeEnum = SizeEnum;
  readonly buttonThemes = ButtonThemes;
  readonly buttonTypes = ButtonTypes;

  readonly editorModules: QuillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ header: 1 }, { header: 2 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ script: 'sub' }, { script: 'super' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ align: [] }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      [{ color: [] }, { background: [] }],
      ['clean'],
    ],
  };

  readonly selectedCategoryIds = signal<Set<string>>(new Set());
  readonly selectedTagIds = signal<Set<string>>(new Set());
  readonly coverImagePreview = signal<string | null>(null);
  readonly coverImageName = signal<string | null>(null);
  readonly coverImageError = signal<string | null>(null);
  readonly coverImageRemoved = signal(false);
  readonly articleCategories = signal<ArticleCategories[]>([]);
  readonly manufacturers = signal<Manufacture[]>([]);
  readonly showcaseCategoryEnabled = signal(false);
  readonly showcaseManufacturerEnabled = signal(false);
  readonly selectedCategoryGroupId = signal<string | null>(null);
  readonly selectedCategoryGroupName = signal<string | null>(null);
  readonly selectedCategorySubGroupId = signal<string | null>(null);
  readonly selectedCategorySubGroupName = signal<string | null>(null);
  readonly categoryLimit = signal(5);
  readonly selectedManufacturerId = signal<string | null>(null);
  readonly selectedManufacturerName = signal<string | null>(null);
  readonly manufacturerLimit = signal(5);
  readonly hadShowcaseInitially = signal(false);

  readonly availableSubCategories = computed<SubCategories[]>(() => {
    const groupId = this.selectedCategoryGroupId();
    if (!groupId) return [];
    return (
      this.articleCategories().find((category) => category.groupId === groupId)?.articleSubGroups ?? []
    );
  });

  readonly isEditing = computed(() => this.editingPostId !== null);

  editingPostId: number | null = null;
  private categorySlugManual = false;
  private tagSlugManual = false;

  readonly form = this.fb.group({
    title: ['', Validators.required],
    slug: [''],
    excerpt: [''],
    coverImageUrl: [''],
    coverImageBytes: [''],
    coverImageContentType: [''],
    content: ['', Validators.required],
    metaTitle: [''],
    metaDescription: [''],
    canonicalUrl: [''],
    metaKeywords: [''],
    status: ['DRAFT' as BlogStatus],
    publishedAt: [''],
  });

  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadTaxonomies();
    this.loadPosts();
    this.syncStatusSelection(this.form.controls.status.value as BlogStatus | null | undefined);

    this.form.controls.status.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => this.syncStatusSelection(value as BlogStatus | null | undefined));

    this.form.controls.coverImageUrl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (this.form.controls.coverImageBytes.value) {
          return;
        }
        const sanitized = value?.trim() || '';
        if (sanitized) {
          this.coverImagePreview.set(sanitized);
          this.coverImageName.set(this.extractFileName(sanitized));
        } else {
          this.clearCoverImageState();
        }
      });

    this.categoriesState
      .getCategories$()
      .pipe(
        tap((items) => {
          this.articleCategories.set(items ?? []);
          this.syncShowcaseCategoryNames();
        }),
        catchError(() => of([])),
        takeUntil(this.destroy$)
      )
      .subscribe();

    this.manufactureService
      .getAll()
      .pipe(
        catchError(() => of<Manufacture[]>([])),
        tap((items) => {
          this.manufacturers.set(items ?? []);
          this.syncShowcaseManufacturerName();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPosts(): void {
    this.loadingList.set(true);
    this.error.set(null);

    const statusFilter = this.statusFilter();
    const requestStatus = statusFilter === 'ALL' ? undefined : statusFilter;

    const query: BlogListQuery & { status?: BlogStatus | 'ALL'; sort?: string } = {
      sort: 'publishedAt,desc',
      size: 50,
      page: 0,
    };

    if (requestStatus) {
      query.status = requestStatus;
    }

    this.blogService
      .getPosts(query)
      .pipe(
        tap((response) => this.posts.set(this.normalizeListItems(response.items ?? []))),
        catchError((err) => {
          console.error('Failed to load posts', err);
          this.error.set('Nije moguće učitati listu postova.');
          return of(responseWithEmptyItems());
        }),
        tap(() => {
          this.loadingList.set(false);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  loadTaxonomies(): void {
    this.blogService
      .getAdminCategories()
      .pipe(
        tap((items) => this.applyCategories(items)),
        catchError((err) => {
          console.warn('getAdminCategories failed, falling back to public endpoint', err);
          return this.blogService
            .getCategories()
            .pipe(tap((items) => this.applyCategories(items)), catchError(() => of([])));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();

    this.blogService
      .getAdminTags()
      .pipe(
        tap((items) => this.applyTags(items)),
        catchError((err) => {
          console.warn('getAdminTags failed, falling back to public endpoint', err);
          return this.blogService
            .getTags()
            .pipe(tap((items) => this.applyTags(items)), catchError(() => of([])));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  changeStatusFilter(status: BlogStatus | 'ALL'): void {
    this.statusFilter.set(status);
    this.loadPosts();
  }

  editPost(post: BlogPreview): void {
    this.editingPostId = post.id;
    this.loadingForm.set(true);
    this.blogService
      .getPostBySlug(post.slug)
      .pipe(
        tap((detail) => {
          this.populateForm(detail);
          this.loadingForm.set(false);
        }),
        catchError((err) => {
          console.error('Failed to load post detail', err);
          this.loadingForm.set(false);
          this.snackbar.showError('Nije moguće učitati detalje posta.');
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  resetForm(): void {
    this.editingPostId = null;
    this.form.reset({ status: 'DRAFT' });
    this.selectedCategoryIds.set(new Set());
    this.selectedTagIds.set(new Set());
    this.syncStatusSelection('DRAFT');
    this.form.controls.coverImageBytes.setValue('');
    this.form.controls.coverImageContentType.setValue('');
    this.form.controls.coverImageUrl.setValue('');
    this.clearCoverImageState();
    this.coverImageRemoved.set(false);
    this.hadShowcaseInitially.set(false);
    this.toggleShowcaseCategory(false);
    this.toggleShowcaseManufacturer(false);
  }

  toggleCategory(category: BlogCategory): void {
    const set = new Set(this.selectedCategoryIds());
    const key = this.categoryIdentifier(category);
    if (set.has(key)) {
      set.delete(key);
    } else {
      set.add(key);
    }
    this.selectedCategoryIds.set(set);
  }

  toggleTag(tag: BlogTag): void {
    const set = new Set(this.selectedTagIds());
    const key = this.tagIdentifier(tag);
    if (set.has(key)) {
      set.delete(key);
    } else {
      set.add(key);
    }
    this.selectedTagIds.set(set);
  }

  onCategoryNameInput(value: string): void {
    this.categoryError.set(null);
    this.categorySuccess.set(null);
    if (!this.categorySlugManual) {
      const slug = this.slugify(value ?? '');
      this.categoryForm.controls.slug.setValue(slug, { emitEvent: false });
    }
  }

  onCategorySlugInput(value: string): void {
    this.categoryError.set(null);
    this.categorySuccess.set(null);
    this.categorySlugManual = !!value?.trim();
  }

  generateCategorySlug(): void {
    const name = this.categoryForm.controls.name.value ?? '';
    const slug = this.slugify(name);
    this.categoryForm.controls.slug.setValue(slug, { emitEvent: false });
    this.categorySlugManual = false;
  }

  submitCategory(): void {
    if (this.categorySaving()) {
      return;
    }

    this.categoryError.set(null);
    const name = (this.categoryForm.controls.name.value ?? '').trim();
    const slugInput = (this.categoryForm.controls.slug.value ?? '').trim();
    const description = (this.categoryForm.controls.description.value ?? '').trim();
    const id = this.categoryForm.controls.id.value;

    if (!name) {
      this.categoryForm.controls.name.markAsTouched();
      this.categoryError.set('Naziv kategorije je obavezan.');
      return;
    }

    const slug = this.slugify(slugInput || name);
    if (!slug) {
      this.categoryForm.controls.slug.markAsTouched();
      this.categoryError.set('Slug ne može biti prazan.');
      return;
    }

    this.categoryForm.controls.slug.setValue(slug, { emitEvent: false });

    const payload: BlogCategoryPayload = {
      name,
      slug,
      description: description || undefined,
    };

    this.categorySaving.set(true);
    const request$ = id
      ? this.blogService.updateCategory(id, payload)
      : this.blogService.createCategory(payload);

    request$
      .pipe(
        tap((category) => {
          if (!category) return;
          this.upsertCategory(category);
          this.categorySaving.set(false);
          this.categorySuccess.set(id ? 'Kategorija je ažurirana.' : 'Kategorija je kreirana.');
          this.resetCategoryForm(false);
          this.refreshSelectedCategories();
        }),
        catchError((err) => {
          this.categorySaving.set(false);
          this.categoryError.set(this.resolveCategoryError(err));
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  editCategory(category: BlogCategory): void {
    this.categoryForm.patchValue({
      id: category.id ?? null,
      name: category.name ?? '',
      slug: category.slug ?? '',
      description: category.description ?? '',
    });
    this.categoryError.set(null);
    this.categorySuccess.set(null);
    const expectedSlug = this.slugify(category.name ?? '');
    this.categorySlugManual = !!category.slug && category.slug !== expectedSlug;
  }

  resetCategoryForm(clearFeedback: boolean = true): void {
    this.categoryForm.reset({ id: null, name: '', slug: '', description: '' });
    this.categorySlugManual = false;
    if (clearFeedback) {
      this.categoryError.set(null);
      this.categorySuccess.set(null);
    }
  }

  deleteCategory(category: BlogCategory): void {
    if (!category.id) {
      return;
    }
    if (!confirm(`Obrisati kategoriju "${category.name}"?`)) {
      return;
    }

    this.categorySaving.set(true);
    this.blogService
      .deleteCategory(category.id)
      .pipe(
        tap(() => {
          this.categorySaving.set(false);
          this.removeCategoryFromLists(category);
          this.categorySuccess.set('Kategorija je obrisana.');
          if (this.categoryForm.controls.id.value === category.id) {
            this.resetCategoryForm(false);
          }
        }),
        catchError((err) => {
          this.categorySaving.set(false);
          this.categoryError.set(this.resolveCategoryError(err));
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  onTagNameInput(value: string): void {
    this.tagError.set(null);
    this.tagSuccess.set(null);
    if (!this.tagSlugManual) {
      const slug = this.slugify(value ?? '');
      this.tagForm.controls.slug.setValue(slug, { emitEvent: false });
    }
  }

  onTagSlugInput(value: string): void {
    this.tagError.set(null);
    this.tagSuccess.set(null);
    this.tagSlugManual = !!value?.trim();
  }

  generateTagSlug(): void {
    const name = this.tagForm.controls.name.value ?? '';
    const slug = this.slugify(name);
    this.tagForm.controls.slug.setValue(slug, { emitEvent: false });
    this.tagSlugManual = false;
  }

  submitTag(): void {
    if (this.tagSaving()) {
      return;
    }

    this.tagError.set(null);
    const name = (this.tagForm.controls.name.value ?? '').trim();
    const slugInput = (this.tagForm.controls.slug.value ?? '').trim();
    const id = this.tagForm.controls.id.value;

    if (!name) {
      this.tagForm.controls.name.markAsTouched();
      this.tagError.set('Naziv taga je obavezan.');
      return;
    }

    const slug = this.slugify(slugInput || name);
    if (!slug) {
      this.tagForm.controls.slug.markAsTouched();
      this.tagError.set('Slug ne može biti prazan.');
      return;
    }

    this.tagForm.controls.slug.setValue(slug, { emitEvent: false });

    const payload: BlogTagPayload = {
      name,
      slug,
    };

    this.tagSaving.set(true);
    const request$ = id
      ? this.blogService.updateTag(id, payload)
      : this.blogService.createTag(payload);

    request$
      .pipe(
        tap((tag) => {
          if (!tag) return;
          this.upsertTag(tag);
          this.tagSaving.set(false);
          this.tagSuccess.set(id ? 'Tag je ažuriran.' : 'Tag je kreiran.');
          this.resetTagForm(false);
          this.refreshSelectedTags();
        }),
        catchError((err) => {
          this.tagSaving.set(false);
          this.tagError.set(this.resolveTagError(err));
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  editTag(tag: BlogTag): void {
    this.tagForm.patchValue({
      id: tag.id ?? null,
      name: tag.name ?? '',
      slug: tag.slug ?? '',
    });
    this.tagError.set(null);
    this.tagSuccess.set(null);
    const expectedSlug = this.slugify(tag.name ?? '');
    this.tagSlugManual = !!tag.slug && tag.slug !== expectedSlug;
  }

  resetTagForm(clearFeedback: boolean = true): void {
    this.tagForm.reset({ id: null, name: '', slug: '' });
    this.tagSlugManual = false;
    if (clearFeedback) {
      this.tagError.set(null);
      this.tagSuccess.set(null);
    }
  }

  deleteTag(tag: BlogTag): void {
    if (!tag.id) {
      return;
    }
    if (!confirm(`Obrisati tag "${tag.name}"?`)) {
      return;
    }

    this.tagSaving.set(true);
    this.blogService
      .deleteTag(tag.id)
      .pipe(
        tap(() => {
          this.tagSaving.set(false);
          this.removeTagFromLists(tag);
          this.tagSuccess.set('Tag je obrisan.');
          if (this.tagForm.controls.id.value === tag.id) {
            this.resetTagForm(false);
          }
        }),
        catchError((err) => {
          this.tagSaving.set(false);
          this.tagError.set(this.resolveTagError(err));
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  isCategorySelected(category: BlogCategory): boolean {
    return this.selectedCategoryIds().has(this.categoryIdentifier(category));
  }

  isTagSelected(tag: BlogTag): boolean {
    return this.selectedTagIds().has(this.tagIdentifier(tag));
  }

  saveDraft(): void {
    this.saveWithStatus('DRAFT');
  }

  publish(): void {
    this.saveWithStatus('PUBLISHED');
  }

  archive(post: BlogPreview): void {
    if (!confirm('Arhivirati članak?')) return;
    this.editingPostId = post.id;
    this.saveWithStatus('ARCHIVED');
  }

  delete(post: BlogPreview): void {
    if (!confirm('Trajno obrisati članak?')) return;
    this.blogService
      .deletePost(post.id)
      .pipe(
        tap(() => {
          this.loadPosts();
          if (this.editingPostId === post.id) {
            this.resetForm();
          }
        }),
        catchError((err) => {
          console.error('Delete failed', err);
          this.snackbar.showError('Nije moguće obrisati članak.');
          return of(void 0);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  onStatusSelected(option: SelectModel | undefined) {
    if (!option?.key) {
      return;
    }
    this.form.controls.status.setValue(option.key as BlogStatus);
  }

  statusBadgeLabel(status: BlogStatus | string | undefined | null): string {
    if (!status) {
      return 'Bez statusa';
    }
    const normalized = status.toString().trim().toUpperCase();
    return this.statusBadgeMap[normalized as BlogStatus]?.label ?? normalized;
  }

  statusBadgeClass(status: BlogStatus | string | undefined | null): string {
    if (!status) {
      return 'status-pill--unknown';
    }
    const normalized = status.toString().trim().toUpperCase();
    return this.statusBadgeMap[normalized as BlogStatus]?.class ?? 'status-pill--unknown';
  }

  statusFilterLabel(status: BlogStatus | 'ALL'): string {
    return this.statusFilterLabelMap[status] ?? status;
  }

  setFieldValue(control: BlogFormTextControl, value: string | Date | null | undefined) {
    const normalizedValue = value instanceof Date ? value : value ?? '';
    this.form.controls[control].setValue(normalizedValue as any);

    if (control === 'coverImageUrl' && !this.form.controls.coverImageBytes.value) {
      this.coverImageError.set(null);
      const sanitized = typeof value === 'string' ? value.trim() : '';
      if (sanitized) {
        this.coverImageRemoved.set(false);
        this.coverImagePreview.set(sanitized);
        this.coverImageName.set(this.extractFileName(sanitized));
      } else {
        this.clearCoverImageState();
      }
    }
  }

  saveCurrentStatus(): void {
    const status = this.form.controls.status.value as BlogStatus | null | undefined;
    this.saveWithStatus((status ?? 'DRAFT') as BlogStatus);
  }

  private saveWithStatus(status: BlogStatus): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackbar.showError('Popunite obavezna polja.');
      return;
    }

    const payload = this.buildPayload(status);
    if (!payload) return;

    this.loadingForm.set(true);
    const request$ = this.editingPostId
      ? this.blogService.updatePost(this.editingPostId, payload)
      : this.blogService.createPost(payload);

    request$
      .pipe(
        tap((detail) => {
          if (!detail) return;
          this.populateForm(detail);
          this.editingPostId = detail.id;
          this.loadPosts();
          this.loadingForm.set(false);
        }),
        catchError((err) => {
          console.error('Save failed', err);
          this.snackbar.showError('Čuvanje nije uspelo. Proverite podatke.');
          this.loadingForm.set(false);
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  private buildPayload(status: BlogStatus): BlogPostRequest | null {
    const raw = this.form.getRawValue();
    const resolvedStatus = status;
    const categorySlugs = this.normalizeSlugArray(this.selectedCategoryIds());
    const tagSlugs = this.normalizeSlugArray(this.selectedTagIds());

    const coverImageUrl = raw.coverImageUrl?.trim() || undefined;
    const coverImageBytes = raw.coverImageBytes ? raw.coverImageBytes : undefined;
    const coverImageContentType = raw.coverImageContentType?.trim() || undefined;

    const publishedAt = this.normalizePublishedAt(raw.publishedAt);

    const payload: BlogPostRequest = {
      title: raw.title?.trim() ?? '',
      slug: raw.slug?.trim() || undefined,
      excerpt: raw.excerpt?.trim() || undefined,
      content: raw.content ?? '',
      metaTitle: raw.metaTitle?.trim() || undefined,
      metaDescription: raw.metaDescription?.trim() || undefined,
      canonicalUrl: raw.canonicalUrl?.trim() || undefined,
      metaKeywords: raw.metaKeywords?.trim() || undefined,
      categories: categorySlugs.length ? categorySlugs : undefined,
      tags: tagSlugs.length ? tagSlugs : undefined,
      status: resolvedStatus,
      publishedAt,
    };

    if (this.coverImageRemoved()) {
      payload.coverImageUrl = null;
      payload.coverImageBytes = null;
      payload.coverImageContentType = null;
    } else {
      payload.coverImageUrl = coverImageUrl;
      if (coverImageBytes) {
        payload.coverImageBytes = coverImageBytes;
        payload.coverImageContentType = coverImageContentType || DEFAULT_IMAGE_CONTENT_TYPE;
      } else if (coverImageContentType) {
        payload.coverImageContentType = coverImageContentType;
      }
    }

    if (resolvedStatus === 'PUBLISHED' && !payload.publishedAt) {
      payload.publishedAt = new Date().toISOString();
    }

    const categoryConfig = this.showcaseCategoryEnabled() && this.selectedCategoryGroupId()
      ? {
        groupId: this.selectedCategoryGroupId()!,
        groupName:
          this.selectedCategoryGroupName() ||
          this.articleCategories().find((c) => c.groupId === this.selectedCategoryGroupId())?.name ||
          undefined,
        subGroupId: this.normalizeSubGroupId(this.selectedCategorySubGroupId()),
        subGroupName:
          this.selectedCategorySubGroupName() ||
          this.availableSubCategories().find(
            (s) => String(s.subGroupId) === this.selectedCategorySubGroupId()
          )?.name ||
          undefined,
        limit: this.normalizeLimit(this.categoryLimit()),
      } satisfies BlogShowcaseCategoryConfig
      : null;

    const manufacturerConfig = this.showcaseManufacturerEnabled() && this.selectedManufacturerId()
      ? {
        manufacturerId: this.selectedManufacturerId()!,
        manufacturerName:
          this.selectedManufacturerName() ||
          this.manufacturers().find((m) => String(m.proid) === this.selectedManufacturerId())?.naziv ||
          undefined,
        limit: this.normalizeLimit(this.manufacturerLimit()),
      } satisfies BlogShowcaseManufacturerConfig
      : null;

    if (categoryConfig || manufacturerConfig) {
      const showcasePayload: BlogShowcaseConfig = {};

      if (categoryConfig) {
        showcasePayload.category = categoryConfig;
      }

      if (manufacturerConfig) {
        showcasePayload.manufacturer = manufacturerConfig;
      }

      payload.showcase = showcasePayload;
    } else if (this.hadShowcaseInitially()) {
      payload.showcase = null;
    }

    return payload;
  }

  private normalizeSubGroupId(value: string | null): string | number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }

  private normalizeLimit(value: number | null | undefined): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }

    return Math.floor(parsed);
  }

  private normalizePublishedAt(raw: unknown): string | undefined {
    if (!raw) {
      return undefined;
    }

    if (raw instanceof Date) {
      if (isNaN(raw.getTime())) {
        return undefined;
      }
      return raw.toISOString();
    }

    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      return trimmed || undefined;
    }

    return undefined;
  }

  private populateForm(detail: BlogPostDetail): void {
    this.form.patchValue({
      title: detail.title ?? '',
      slug: detail.slug ?? '',
      excerpt: detail.excerpt ?? '',
      coverImageUrl: detail.coverImageUrl ?? '',
      content: detail.content ?? '',
      metaTitle: detail.metaTitle ?? '',
      metaDescription: detail.metaDescription ?? '',
      canonicalUrl: detail.canonicalUrl ?? '',
      metaKeywords: detail.metaKeywords ?? '',
      status: detail.status ?? 'DRAFT',
      publishedAt: detail.publishedAt ?? '',
    });

    this.syncStatusSelection((detail.status ?? 'DRAFT') as BlogStatus);

    const categoryKeys = new Set(
      (detail.categories ?? []).map((category) => this.categoryIdentifier(category))
    );
    const tagKeys = new Set((detail.tags ?? []).map((tag) => this.tagIdentifier(tag)));

    this.selectedCategoryIds.set(categoryKeys);
    this.selectedTagIds.set(tagKeys);
    this.applyCoverImageFromDetail(detail);
    this.applyShowcaseConfig(detail.showcase ?? null);
  }

  private categoryIdentifier(category: BlogCategory): string {
    return category.slug ?? String(category.id ?? '');
  }

  private tagIdentifier(tag: BlogTag): string {
    return tag.slug ?? String(tag.id ?? '');
  }

  private normalizeSlugArray(values: Set<string>): string[] {
    return Array.from(values)
      .map((value) => value?.trim())
      .filter((val): val is string => !!val);
  }

  private applyCategories(items: BlogCategory[] | null | undefined): void {
    const sorted = this.sortByName(items ?? []);
    this.categories.set(sorted);
    this.refreshSelectedCategories();
  }

  private applyTags(items: BlogTag[] | null | undefined): void {
    const sorted = this.sortByName(items ?? []);
    this.tags.set(sorted);
    this.refreshSelectedTags();
  }

  private refreshSelectedCategories(): void {
    const existing = new Set(this.categories().map((category) => this.categoryIdentifier(category)));
    const next = new Set(Array.from(this.selectedCategoryIds()).filter((id) => existing.has(id)));
    if (next.size !== this.selectedCategoryIds().size) {
      this.selectedCategoryIds.set(next);
    }
  }

  private refreshSelectedTags(): void {
    const existing = new Set(this.tags().map((tag) => this.tagIdentifier(tag)));
    const next = new Set(Array.from(this.selectedTagIds()).filter((id) => existing.has(id)));
    if (next.size !== this.selectedTagIds().size) {
      this.selectedTagIds.set(next);
    }
  }

  private sortByName<T extends { name?: string | null }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
      const aName = (a.name ?? '').toLowerCase();
      const bName = (b.name ?? '').toLowerCase();
      return aName.localeCompare(bName);
    });
  }

  private upsertCategory(category: BlogCategory): void {
    const next = [...this.categories().filter((item) => item.id !== category.id), category];
    this.applyCategories(next);
  }

  private removeCategoryFromLists(category: BlogCategory): void {
    const next = this.categories().filter((item) => item.id !== category.id);
    this.applyCategories(next);
  }

  private upsertTag(tag: BlogTag): void {
    const next = [...this.tags().filter((item) => item.id !== tag.id), tag];
    this.applyTags(next);
  }

  private removeTagFromLists(tag: BlogTag): void {
    const next = this.tags().filter((item) => item.id !== tag.id);
    this.applyTags(next);
  }

  private slugify(value: string): string {
    return StringUtils.slugify(value ?? '');
  }

  private resolveCategoryError(err: unknown): string {
    const status = (err as { status?: number })?.status;
    if (status === 409) {
      return 'Slug za kategoriju je već zauzet.';
    }
    if (status === 400) {
      return 'Proverite naziv i slug kategorije (dozvoljeni znakovi i dužina).';
    }
    return 'Došlo je do greške prilikom čuvanja kategorije. Pokušajte ponovo.';
  }

  private resolveTagError(err: unknown): string {
    const status = (err as { status?: number })?.status;
    if (status === 409) {
      return 'Slug za tag je već zauzet.';
    }
    if (status === 400) {
      return 'Proverite naziv i slug taga (dozvoljeni znakovi i dužina).';
    }
    return 'Došlo je do greške prilikom čuvanja taga. Pokušajte ponovo.';
  }

  private statusLabel(status: BlogStatus): string {
    return this.statusBadgeMap[status]?.label ?? status;
  }

  private normalizeListItems(items: BlogPreview[]): BlogPreview[] {
    return (items ?? []).map((item) => ({
      ...item,
      status: this.normalizeStatusValue(item.status),
    }));
  }

  private normalizeStatusValue(status: BlogStatus | string | null | undefined): BlogStatus | undefined {
    if (!status) {
      return undefined;
    }
    const normalized = status.toString().trim().toUpperCase();
    if (normalized === 'PUBLISHED' || normalized === 'ARCHIVED' || normalized === 'DRAFT') {
      return normalized as BlogStatus;
    }
    return undefined;
  }

  private syncStatusSelection(value: BlogStatus | null | undefined) {
    if (!value) {
      this.selectedStatus.set(this.statusSelections[0] ?? null);
      return;
    }
    const match = this.statusSelections.find((option) => option.key === value);
    this.selectedStatus.set(match ?? this.statusSelections[0] ?? null);
  }

  onCoverImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    const file = input.files[0];
    this.coverImageError.set(null);

    if (!file.type.startsWith('image/')) {
      this.coverImageError.set('Podržane su samo slikovne datoteke.');
      input.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      this.coverImageError.set('Slika je prevelika. Maksimalna veličina je 5MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';

      this.form.controls.coverImageBytes.setValue(base64);
      this.form.controls.coverImageContentType.setValue(file.type || DEFAULT_IMAGE_CONTENT_TYPE);
      this.form.controls.coverImageUrl.setValue('');

      this.coverImagePreview.set(dataUrl);
      this.coverImageName.set(file.name);
      this.coverImageRemoved.set(false);
    };
    reader.onerror = () => {
      this.coverImageError.set('Čitanje slike nije uspelo. Pokušajte ponovo.');
    };

    reader.readAsDataURL(file);
    input.value = '';
  }

  removeCoverImage(): void {
    this.form.controls.coverImageBytes.setValue('');
    this.form.controls.coverImageContentType.setValue('');
    this.form.controls.coverImageUrl.setValue('');
    this.coverImageRemoved.set(true);
    this.clearCoverImageState();
  }

  private applyCoverImageFromDetail(detail: BlogPostDetail): void {
    this.coverImageError.set(null);
    this.coverImageRemoved.set(false);
    const bytes = detail.coverImageBytes ?? '';
    const type = detail.coverImageContentType || DEFAULT_IMAGE_CONTENT_TYPE;
    const url = detail.coverImageUrl ?? '';

    if (bytes) {
      this.coverImagePreview.set(this.buildDataUrl(bytes, type));
      this.coverImageName.set('Otpremljena slika');
    } else if (url) {
      this.coverImagePreview.set(url);
      this.coverImageName.set(this.extractFileName(url));
    } else {
      this.clearCoverImageState();
    }
  }

  private clearCoverImageState(): void {
    this.coverImagePreview.set(null);
    this.coverImageName.set(null);
    this.coverImageError.set(null);
  }

  private buildDataUrl(bytes: string, contentType: string): string {
    return `data:${contentType || DEFAULT_IMAGE_CONTENT_TYPE};base64,${bytes}`;
  }

  private extractFileName(path: string | null | undefined): string | null {
    if (!path) return null;
    try {
      const decoded = decodeURIComponent(path);
      const parts = decoded.split(/[\\/]/);
      return parts.pop() || decoded;
    } catch {
      return path;
    }
  }

  private syncShowcaseCategoryNames(): void {
    const groupId = this.selectedCategoryGroupId();
    if (groupId) {
      const category = this.articleCategories().find((c) => c.groupId === groupId);
      if (category) {
        this.selectedCategoryGroupName.set(category.name ?? null);
        const subId = this.selectedCategorySubGroupId();
        if (subId) {
          const sub = category.articleSubGroups?.find(
            (s) => String(s.subGroupId) === subId
          );
          this.selectedCategorySubGroupName.set(sub?.name ?? null);
        }
      }
    }
  }

  private syncShowcaseManufacturerName(): void {
    const manufacturerId = this.selectedManufacturerId();
    if (!manufacturerId) return;
    const manufacturer = this.manufacturers().find(
      (m) => String(m.proid ?? m.naziv) === manufacturerId || String(m.proid) === manufacturerId
    );
    if (manufacturer) {
      this.selectedManufacturerName.set(manufacturer.naziv ?? manufacturerId);
      this.selectedManufacturerId.set(String(manufacturer.proid ?? manufacturerId));
    }
  }

  toggleShowcaseCategory(enabled: boolean): void {
    this.showcaseCategoryEnabled.set(enabled);
    if (!enabled) {
      this.selectedCategoryGroupId.set(null);
      this.selectedCategoryGroupName.set(null);
      this.selectedCategorySubGroupId.set(null);
      this.selectedCategorySubGroupName.set(null);
      this.categoryLimit.set(5);
    }
  }

  onShowcaseCategoryToggle(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.toggleShowcaseCategory(target?.checked ?? false);
  }

  onSelectCategoryGroup(groupId: string): void {
    if (!groupId) {
      this.selectedCategoryGroupId.set(null);
      this.selectedCategoryGroupName.set(null);
      this.selectedCategorySubGroupId.set(null);
      this.selectedCategorySubGroupName.set(null);
      return;
    }
    const category = this.articleCategories().find((c) => c.groupId === groupId) || null;
    this.selectedCategoryGroupId.set(category?.groupId ?? null);
    this.selectedCategoryGroupName.set(category?.name ?? null);
    this.selectedCategorySubGroupId.set(null);
    this.selectedCategorySubGroupName.set(null);
  }

  onSelectCategorySubGroup(subGroupId: string): void {
    const sub = this.availableSubCategories().find(
      (s) => String(s.subGroupId) === subGroupId
    );
    this.selectedCategorySubGroupId.set(sub?.subGroupId != null ? String(sub.subGroupId) : null);
    this.selectedCategorySubGroupName.set(sub?.name ?? null);
  }

  onCategoryLimitChange(value: string | number): void {
    const parsed = Number(value);
    const sanitized = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 5;
    this.categoryLimit.set(sanitized);
  }

  toggleShowcaseManufacturer(enabled: boolean): void {
    this.showcaseManufacturerEnabled.set(enabled);
    if (!enabled) {
      this.selectedManufacturerId.set(null);
      this.selectedManufacturerName.set(null);
      this.manufacturerLimit.set(5);
    }
  }

  onShowcaseManufacturerToggle(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.toggleShowcaseManufacturer(target?.checked ?? false);
  }

  onSelectManufacturer(manufacturerId: string): void {
    if (!manufacturerId) {
      this.selectedManufacturerId.set(null);
      this.selectedManufacturerName.set(null);
      return;
    }
    const manuf = this.manufacturers().find(
      (m) => String(m.proid ?? m.naziv) === manufacturerId || String(m.proid) === manufacturerId
    );
    if (manuf) {
      this.selectedManufacturerId.set(String(manuf.proid ?? manufacturerId));
      this.selectedManufacturerName.set(manuf.naziv ?? manufacturerId);
    } else {
      this.selectedManufacturerId.set(manufacturerId);
      this.selectedManufacturerName.set(manufacturerId);
    }
  }

  onManufacturerLimitChange(value: string | number): void {
    const parsed = Number(value);
    const sanitized = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 5;
    this.manufacturerLimit.set(sanitized);
  }

  private applyShowcaseConfig(config: BlogShowcaseConfig | null | undefined): void {
    this.hadShowcaseInitially.set(!!config);

    if (config?.category && config.category.groupId) {
      this.showcaseCategoryEnabled.set(true);
      this.selectedCategoryGroupId.set(config.category.groupId);
      this.selectedCategoryGroupName.set(config.category.groupName ?? null);
      if (config.category.subGroupId != null) {
        this.selectedCategorySubGroupId.set(String(config.category.subGroupId));
        this.selectedCategorySubGroupName.set(config.category.subGroupName ?? null);
      } else {
        this.selectedCategorySubGroupId.set(null);
        this.selectedCategorySubGroupName.set(null);
      }
      this.categoryLimit.set(config.category.limit ?? 5);
    } else {
      this.showcaseCategoryEnabled.set(false);
      this.selectedCategoryGroupId.set(null);
      this.selectedCategoryGroupName.set(null);
      this.selectedCategorySubGroupId.set(null);
      this.selectedCategorySubGroupName.set(null);
      this.categoryLimit.set(5);
    }

    if (config?.manufacturer && config.manufacturer.manufacturerId) {
      this.showcaseManufacturerEnabled.set(true);
      this.selectedManufacturerId.set(config.manufacturer.manufacturerId);
      this.selectedManufacturerName.set(config.manufacturer.manufacturerName ?? null);
      this.manufacturerLimit.set(config.manufacturer.limit ?? 5);
    } else {
      this.showcaseManufacturerEnabled.set(false);
      this.selectedManufacturerId.set(null);
      this.selectedManufacturerName.set(null);
      this.manufacturerLimit.set(5);
    }
  }
}

function responseWithEmptyItems(): BlogListResponse {
  return {
    items: [],
    meta: {
      totalElements: 0,
      totalPages: 0,
      page: 0,
      size: 0,
      hasNext: false,
      hasPrevious: false,
    },
  };
}
