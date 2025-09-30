export type BlogStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface BlogPreview {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl?: string | null;
  coverImageBytes?: string | null;
  coverImageContentType?: string | null;
  publishedAt: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  metaKeywords?: string | null;
  categories?: BlogCategory[];
  tags?: BlogTag[];
  readingTimeMinutes?: number;
  status?: BlogStatus;
}

export interface BlogCategory {
  id: number | string;
  name: string;
  slug: string;
  description?: string | null;
  postCount?: number;
  count?: number;
}

export interface BlogCategoryPayload {
  name: string;
  slug: string;
  description?: string | null;
}

export interface BlogTag {
  id: number | string;
  name: string;
  slug: string;
  description?: string | null;
  postCount?: number;
  count?: number;
}

export interface BlogTagPayload {
  name: string;
  slug: string;
}

export interface BlogListQuery {
  page?: number;
  size?: number;
  category?: string;
  tag?: string;
  search?: string;
  status?: BlogStatus | 'ALL';
  sort?: string;
}

export interface BlogListResponse {
  items: BlogPreview[];
  meta: {
    totalElements: number;
    totalPages: number;
    page: number;
    size: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface BlogPostDetail extends BlogPreview {
  content: string;
  commentCount?: number;
  author?: BlogAuthor;
  related?: BlogPreview[];
  showcase?: BlogShowcaseConfig | null;
}

export interface BlogAuthor {
  name: string;
  avatar?: string;
  bio?: string;
}

export interface BlogComment {
  id: string | number;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface BlogCommentRequest {
  authorName: string;
  authorEmail?: string;
  content: string;
}

export interface BlogPostRequest {
  title: string;
  slug?: string;
  excerpt?: string;
  coverImageUrl?: string | null;
  coverImageBytes?: string | null;
  coverImageContentType?: string | null;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  metaKeywords?: string;
  categories?: string[];
  tags?: string[];
  status?: BlogStatus;
  publishedAt?: string;
  showcase?: BlogShowcaseConfig | null;
}

export interface BlogShowcaseConfig {
  category?: BlogShowcaseCategoryConfig | null;
  manufacturer?: BlogShowcaseManufacturerConfig | null;
}

export interface BlogShowcaseCategoryConfig {
  groupId: string;
  groupName?: string;
  subGroupId?: string | number;
  subGroupName?: string;
  limit?: number;
}

export interface BlogShowcaseManufacturerConfig {
  manufacturerId: string;
  manufacturerName?: string;
  limit?: number;
}
