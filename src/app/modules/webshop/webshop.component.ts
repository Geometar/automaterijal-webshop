import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// Components imports
import { WebshopEmptyComponent } from './webshop-empty/webshop-empty.component';
import { WebshopNavComponent } from './webshop-nav/webshop-nav.component';
import { WebshopRobaComponent } from './webshop-roba/webshop-roba.component';

// Data models
import { Filter, Magacin } from '../../shared/data-models/model/roba';

// Services
import { PictureService } from '../../shared/service/utils/picture.service';
import { RobaService } from '../../shared/service/roba.service';

export enum WebShopState {
  SHOW_ARTICLES,
  SHOW_EMPTY_CONTAINER,
}

@Component({
  selector: 'app-webshop',
  standalone: true,
  imports: [
    CommonModule,
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
  rowsPerPage = 10;
  pageIndex = 0;
  sort = null;
  filter: Filter = new Filter();

  // Data
  magacinData: Magacin | null = null;


  constructor(private robaService: RobaService, private pictureService: PictureService) { }

  /** Angular lifecycle hooks start */

  // TODO: Remove after setting the table
  ngOnInit(): void {
    this.getRoba('123');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  /** Angular lifecycle hooks end */

  /** Event start */

  getRoba(searchTerm: string): void {
    this.robaService.pronadjiSvuRobu(
      this.sort, this.rowsPerPage, this.pageIndex, searchTerm, this.filter
    ).pipe(takeUntil(this.destroy$))
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
}
