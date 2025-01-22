import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, Subject, takeUntil } from 'rxjs';

// Data Models
import { Roba } from '../../../shared/data-models/model/roba';

// Services
import { RobaService } from '../../../shared/service/roba.service';

@Component({
  selector: 'app-webshop-details',
  standalone: true,
  imports: [],
  templateUrl: './webshop-details.component.html',
  styleUrl: './webshop-details.component.scss',
})
export class WebshopDetailsComponent implements OnInit, OnDestroy {
  id: number | null = null;
  data: Roba = new Roba();

  // Misc
  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private robaService: RobaService
  ) { }

  /** Start of: Angular lifecycle hooks */

  ngOnInit(): void {
    this.id = +this.route.snapshot.paramMap.get('id')!;
    if (this.id) {
      this.fetchData(this.id);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** End of: Angular lifecycle hooks */

  // Start of: Events 

  fetchData(id: number): void {
    this.loading = true;
    this.robaService
      .fetchDetails(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (response) => {
          this.data = response;
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
          console.log('Error: ', error);
        },
      });
  }

  // End of: Events 
}
