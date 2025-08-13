import { Injectable } from '@angular/core';
import { environment } from '../../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

// Services
import { ArticleCategories } from '../data-models/model/article-categories';

const DOMAIN_URL = environment.apiUrl + '/api';
const CATEGORIES_URL = '/groups';

@Injectable({
  providedIn: 'root'
})
export class ArticleGroupService {

  constructor(private http: HttpClient) { }

  public fetchCategories(): Observable<ArticleCategories[]> {
    const fullUrl = DOMAIN_URL + CATEGORIES_URL;

    return this.http
      .get<ArticleCategories[]>(fullUrl)
      .pipe(
        catchError((error: any) => throwError(error))
      );
  }
}
