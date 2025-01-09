import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize, Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

// Components imports
import { WebshopEmptyComponent } from './webshop-empty/webshop-empty.component';
import { WebshopNavComponent } from './webshop-nav/webshop-nav.component';
import { WebshopRobaComponent } from './webshop-roba/webshop-roba.component';

// Data models
import { Filter, Magacin } from '../../shared/data-models/model/roba';
import { TablePage } from '../../shared/data-models/model/page';

// Services
import { PictureService } from '../../shared/service/utils/picture.service';
import { RobaService } from '../../shared/service/roba.service';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';

export enum WebShopState {
  SHOW_ARTICLES,
  SHOW_EMPTY_CONTAINER,
}

@Component({
  selector: 'app-webshop',
  standalone: true,
  imports: [
    CommonModule,
    SpinnerComponent,
    WebshopEmptyComponent,
    WebshopNavComponent,
    WebshopRobaComponent,
  ],
  templateUrl: './webshop.component.html',
  styleUrl: './webshop.component.scss',
})
export class WebshopComponent implements OnDestroy, OnInit {
  private destroy$ = new Subject<void>();

  // Enums
  state = WebShopState;
  currentState = WebShopState.SHOW_EMPTY_CONTAINER;

  // Paging and Sorting elements
  pageIndex = 0;
  rowsPerPage = 10;
  searchTerm = '';
  sort = null;
  filter: Filter = new Filter();

  // Data
  magacinData: Magacin | null = null;

  // Misc
  loading = false;
  internalLoading = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private pictureService: PictureService,
    private robaService: RobaService
  ) { }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    this.filter = new Filter();
    // Subscribe to queryParams observable
    this.activatedRoute.queryParams
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe((params) => {
        let internalLoading = false;
        if (params == null || !params['searchTerm']) {
          this.currentState = WebShopState.SHOW_EMPTY_CONTAINER;
          return;
        }

        this.currentState = WebShopState.SHOW_ARTICLES;
        if (this.searchTerm === '' || params['searchTerm'] === this.searchTerm) {
          this.filter.grupe = params['grupe'];
          this.searchTerm = params['searchTerm'];
          internalLoading = true;
        } else {
          this.searchTerm = params['searchTerm'];
          this.filter = new Filter();
        }

        this.getRoba(internalLoading);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  /** Angular lifecycle hooks end */

  /** Event start */

  getRoba(internalLoading = false): void {
    this.loading = !internalLoading;
    this.internalLoading = internalLoading;
    this.robaService
      .pronadjiSvuRobu(
        this.sort,
        this.rowsPerPage,
        this.pageIndex,
        this.searchTerm,
        this.filter
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.internalLoading = false;
        })
      )
      .subscribe({
        next: (response: Magacin) => {
          this.pictureService.convertByteToImage(response.robaDto!.content);
          this.magacinData = response;
          this.currentState = this.state.SHOW_ARTICLES;
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        },
      });
  }

  /** Event end */

  // Setters start
  setRobaSearchTerm(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.getRoba();
  }
  setRobaPageData(tableEvent: TablePage): void {
    this.pageIndex = tableEvent.pageIndex;
    this.rowsPerPage = tableEvent.pageSize;
    this.getRoba();
  }

  // Setters end
}
