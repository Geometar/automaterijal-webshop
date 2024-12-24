import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// Components imports
import { WebshopEmptyComponent } from './webshop-empty/webshop-empty.component';
import { WebshopNavComponent } from './webshop-nav/webshop-nav.component';

// Data models
import { Filter, RobaPage } from '../../shared/data-models/model/roba';

// Services
import { RobaService } from '../../shared/service/roba.service';

@Component({
  selector: 'app-webshop',
  standalone: true,
  imports: [
    CommonModule,
    WebshopEmptyComponent,
    WebshopNavComponent
  ],
  templateUrl: './webshop.component.html',
  styleUrl: './webshop.component.scss',
})
export class WebshopComponent implements OnDestroy {
  private destroy$ = new Subject<void>();


  // Paging and Sorting elements
  rowsPerPage = 10;
  pageIndex = 0;
  sort = null;
  filter: Filter = new Filter();

  constructor(private robaService: RobaService) { }

  /** Angular lifecycle hooks start */

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
        next: (robaPaged: RobaPage) => {
          console.log(robaPaged);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        }
      });
  }

  /** Event end */
}
