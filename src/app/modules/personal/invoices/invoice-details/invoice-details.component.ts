import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { finalize, Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// Component imports
import { AutomIconComponent } from '../../../../shared/components/autom-icon/autom-icon.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';

// Data models
import { Invoice, InvoiceItem } from '../../../../shared/data-models/model';

// Enums
import { ColorEnum, IconsEnum } from '../../../../shared/data-models/enums';

// Service
import { AccountStateService } from '../../../../shared/service/utils/account-state.service';
import { InvoiceService } from '../../../../shared/service/invoice.service';
import { PictureService } from '../../../../shared/service/utils/picture.service';

@Component({
  selector: 'app-invoice-details',
  standalone: true,
  imports: [CommonModule, SpinnerComponent, AutomIconComponent],
  templateUrl: './invoice-details.component.html',
  styleUrl: './invoice-details.component.scss',
})
export class InvoiceDetailsComponent implements OnInit {
  id: number | null = null;

  // Data
  data: Invoice | null = null;

  // Enums
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;

  // Misc loading
  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private accountStateService: AccountStateService,
    private invoiceService: InvoiceService,
    private pictureService: PictureService,
    private route: ActivatedRoute,
  ) { }

  /** Start of: Angular lifecycle hooks */
  ngOnInit(): void {
    this.id = +this.route.snapshot.paramMap.get('id')!;
    this.fetchData(this.id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** End of: Angular lifecycle hooks */

  // Start of: Events

  fetchData(id: number): void {
    this.loading = true;
    this.invoiceService
      .fetchDetails(this.accountStateService.get().ppid!, id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (response: Invoice) => {
          response.detalji?.forEach((invoiceArticle: InvoiceItem) =>
            this.pictureService.convertByteToImageInvoice(invoiceArticle)
          );
          this.data = response;
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        },
      });
  }

  // End of: Events
}
