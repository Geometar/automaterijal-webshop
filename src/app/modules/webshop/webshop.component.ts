import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize, Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

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
    WebshopRobaComponent
  ],
  templateUrl: './webshop.component.html',
  styleUrl: './webshop.component.scss',
})
export class WebshopComponent implements OnDestroy, OnInit {
  private destroy$ = new Subject<void>();

  // Enums
  state = WebShopState;
  currentState = WebShopState.SHOW_ARTICLES;

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


  constructor(private robaService: RobaService, private pictureService: PictureService) { }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    this.getRoba();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  /** Angular lifecycle hooks end */

  /** Event start */

  getRoba(): void {
    this.loading = true;
    this.robaService.pronadjiSvuRobu(
      this.sort, this.rowsPerPage, this.pageIndex, this.searchTerm, this.filter
    ).pipe(takeUntil(this.destroy$), finalize(() => this.loading = false))
      .subscribe({
        next: (response: Magacin) => {
          this.pictureService.convertByteToImage(response.robaDto!.content);
          this.magacinData = response;
          this.currentState = this.state.SHOW_ARTICLES;
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        }
      });
  }

  /** Event end */

  // Setters start
  setRobaSearchTerm(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.getRoba()
  }
  setRobaPageData(tableEvent: TablePage): void {
    this.pageIndex = tableEvent.pageIndex;
    this.rowsPerPage = tableEvent.pageSize;
    this.getRoba()
  }

  // Setters end
}
