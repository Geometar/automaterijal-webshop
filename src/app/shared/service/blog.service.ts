import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  BlogCategory,
  BlogComment,
  BlogCommentRequest,
  BlogListQuery,
  BlogListResponse,
  BlogPostDetail,
  BlogPostRequest,
  BlogStatus,
  BlogTag,
  BlogCategoryPayload,
  BlogTagPayload,
} from '../data-models/model/blog';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

@Injectable({ providedIn: 'root' })
export class BlogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1`;

  getPosts(query: BlogListQuery & { status?: BlogStatus | 'ALL'; sort?: string }): Observable<BlogListResponse> {
    let params = new HttpParams();
    if (query.page !== undefined) params = params.set('page', query.page);
    if (query.size !== undefined) params = params.set('size', query.size);
    if (query.category) params = params.set('category', query.category);
    if (query.tag) params = params.set('tag', query.tag);
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status.toLowerCase());
    if (query.sort) params = params.set('sort', query.sort);

    return this.http.get<BlogListResponse>(`${this.baseUrl}/posts`, { params }).pipe(
      map((response) => ({
        ...response,
        items: response.items ?? [],
      }))
    );
  }

  getAdminPosts(query: BlogListQuery & { status?: BlogStatus | 'ALL'; sort?: string }) {
    let params = new HttpParams();
    if (query.page !== undefined) params = params.set('page', query.page);
    if (query.size !== undefined) params = params.set('size', query.size);
    if (query.category) params = params.set('category', query.category);
    if (query.tag) params = params.set('tag', query.tag);
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status.toLowerCase());
    if (query.sort) params = params.set('sort', query.sort);

    return this.http.get<BlogListResponse>(`${this.baseUrl}/admin/blog/posts`, { params }).pipe(
      map((response) => ({
        ...response,
        items: response.items ?? [],
      }))
    );
  }

  getPostBySlug(slug: string) {
    return this.http.get<BlogPostDetail>(`${this.baseUrl}/posts/${slug}`);
  }

  getPostById(id: number | string) {
    return this.http.get<BlogPostDetail>(`${this.baseUrl}/posts/${id}`);
  }

  createPost(payload: BlogPostRequest) {
    return this.http.post<BlogPostDetail>(`${this.baseUrl}/posts`, payload);
  }

  updatePost(idOrSlug: number | string, payload: BlogPostRequest) {
    return this.http.put<BlogPostDetail>(`${this.baseUrl}/posts/${idOrSlug}`, payload);
  }

  deletePost(idOrSlug: number | string) {
    return this.http.delete<void>(`${this.baseUrl}/posts/${idOrSlug}`);
  }

  getCategories() {
    return this.http.get<BlogCategory[]>(`${this.baseUrl}/categories`);
  }

  getTags() {
    return this.http.get<BlogTag[]>(`${this.baseUrl}/tags`);
  }

  getAdminCategories() {
    return this.http.get<BlogCategory[]>(`${this.baseUrl}/admin/blog/categories`);
  }

  createCategory(payload: BlogCategoryPayload) {
    return this.http.post<BlogCategory>(`${this.baseUrl}/admin/blog/categories`, payload);
  }

  updateCategory(id: number | string, payload: BlogCategoryPayload) {
    return this.http.put<BlogCategory>(`${this.baseUrl}/admin/blog/categories/${id}`, payload);
  }

  deleteCategory(id: number | string) {
    return this.http.delete<void>(`${this.baseUrl}/admin/blog/categories/${id}`);
  }

  getAdminTags() {
    return this.http.get<BlogTag[]>(`${this.baseUrl}/admin/blog/tags`);
  }

  createTag(payload: BlogTagPayload) {
    return this.http.post<BlogTag>(`${this.baseUrl}/admin/blog/tags`, payload);
  }

  updateTag(id: number | string, payload: BlogTagPayload) {
    return this.http.put<BlogTag>(`${this.baseUrl}/admin/blog/tags/${id}`, payload);
  }

  deleteTag(id: number | string) {
    return this.http.delete<void>(`${this.baseUrl}/admin/blog/tags/${id}`);
  }

  getComments(slug: string) {
    return this.http.get<BlogComment[]>(`${this.baseUrl}/posts/${slug}/comments`);
  }

  submitComment(slug: string, payload: BlogCommentRequest) {
    return this.http.post<BlogComment>(`${this.baseUrl}/posts/${slug}/comments`, payload);
  }
}
