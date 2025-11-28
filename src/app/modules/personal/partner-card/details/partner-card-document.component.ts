import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, Subject, takeUntil } from 'rxjs';

import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { AutomIconComponent } from '../../../../shared/components/autom-icon/autom-icon.component';
import { RsdCurrencyPipe } from '../../../../shared/pipe/rsd-currency.pipe';

import { ButtonThemes, ButtonTypes, ColorEnum, IconsEnum } from '../../../../shared/data-models/enums';
import { PartnerCardDetailsItem, PartnerCardDetailsResponse } from '../../../../shared/data-models/model';
import { AccountStateService } from '../../../../shared/service/state/account-state.service';
import { PartnerService } from '../../../../shared/service/partner.service';
import { PictureService } from '../../../../shared/service/utils/picture.service';
import { DocumentRowView, DocumentTotals } from './partner-card-document.models';

const VRDOK_LABELS: Record<string, string> = {
  '4': 'Profaktura',
  '04': 'Profaktura',
  '13': 'Faktura',
  '15': 'MP račun',
  '32': 'Proračun'
};

@Component({
  selector: 'app-partner-card-document',
  standalone: true,
  imports: [
    AutomIconComponent,
    ButtonComponent,
    CommonModule,
    SpinnerComponent,
    RsdCurrencyPipe
  ],
  providers: [CurrencyPipe],
  templateUrl: './partner-card-document.component.html',
  styleUrl: './partner-card-document.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class PartnerCardDocumentComponent implements OnInit, OnDestroy {
  buttonThemes = ButtonThemes;
  buttonTypes = ButtonTypes;
  colorEnum = ColorEnum;
  iconsEnum = IconsEnum;

  vrdok = '';
  brdok = '';
  loading = false;
  error = '';
  items: DocumentRowView[] = [];
  totals: DocumentTotals = { partnerVat: 0, partnerGross: 0, fullGross: 0 };
  isAdmin = false;
  partnerPpid: number | null = null;
  documentDate: string | null = null;
  documentDueDate: string | null = null;
  documentTotal: number | null = null;

  private readonly destroy$ = new Subject<void>();
  private readonly allowedVrdokCodes = new Set(['4', '04', '13', '15', '32']);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly partnerService: PartnerService,
    private readonly accountStateService: AccountStateService,
    private readonly pictureService: PictureService
  ) { }

  ngOnInit(): void {
    this.isAdmin = this.accountStateService.isAdmin();
    this.readRoute();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByRow = (_index: number, item: DocumentRowView): string =>
    `${item.id ?? _index}-${item.title}`;

  onBack(): void {
    this.router.navigate(['/partner-card']);
  }

  onReload(): void {
    this.readRoute();
  }

  get docTypeLabel(): string | null {
    return VRDOK_LABELS[this.vrdok] ?? null;
  }

  get displayTotal(): number {
    if (Number.isFinite(this.documentTotal)) {
      return this.documentTotal as number;
    }
    return this.totals.partnerGross;
  }

  print(mode: 'partner' | 'full'): void {
    if (!this.items.length) {
      return;
    }

    const total = mode === 'partner' ? this.totals.partnerGross : this.totals.fullGross || this.totals.partnerGross;
    const rows = this.items
      .map((item, index) => {
        const unit = mode === 'partner' ? item.partnerGross : item.fullGross;
        const sum = mode === 'partner' ? item.partnerGrossTotal : item.fullGrossTotal;
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${this.escapeHtml(item.code ?? '')}</td>
            <td>${this.escapeHtml(item.title)}</td>
            <td style="text-align:right;">${item.quantity}</td>
            <td style="text-align:right;">${this.formatCurrency(unit)}</td>
            <td style="text-align:right;">${this.formatCurrency(sum)}</td>
          </tr>
        `;
      })
      .join('');

    const win = window.open('', '_blank', 'width=1024,height=768');
    if (!win) {
      return;
    }

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Dokument #${this.escapeHtml(this.brdok)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #000; }
            h1 { margin: 0 0 8px; font-size: 20px; }
            .meta { margin: 0 0 12px; font-size: 12px; color: #444; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #000; padding: 6px 8px; }
            th { background: #f2f2f2; text-align: left; }
            tfoot td { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Dokument #${this.escapeHtml(this.brdok)}</h1>
          <div class="meta">
            <div>Tip: ${this.escapeHtml(this.docTypeLabel || this.vrdok)}</div>
            ${this.documentDate ? `<div>Datum: ${this.escapeHtml(this.documentDate)}</div>` : ''}
            ${this.documentDueDate ? `<div>Valuta/Rok: ${this.escapeHtml(this.documentDueDate)}</div>` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Šifra</th>
                <th>Naziv</th>
                <th style="text-align:right;">Kol.</th>
                <th style="text-align:right;">Cena (sa PDV)</th>
                <th style="text-align:right;">Ukupno</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" style="text-align:right;">Ukupno</td>
                <td style="text-align:right;">${this.formatCurrency(total)}</td>
              </tr>
            </tfoot>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  private readRoute(): void {
    const params = this.route.snapshot.paramMap;
    const query = this.route.snapshot.queryParamMap;

    const rawVrdok = params.get('vrdok');
    const rawBrdok = params.get('brdok');
    const normalizedVrdok = this.normalizeVrdok(rawVrdok);
    const normalizedBrdok = this.normalizeString(rawBrdok);

    const ppidParam = query.get('ppid');
    const parsedPpid = ppidParam ? Number(ppidParam) : Number.NaN;
    this.partnerPpid = Number.isFinite(parsedPpid) ? parsedPpid : null;
    this.documentDate = query.get('datum');
    this.documentDueDate = query.get('datumRoka');
    const rawTotal = this.toNumber(query.get('total'));
    this.documentTotal = Number.isFinite(rawTotal) ? rawTotal : null;

    if (!normalizedVrdok || !normalizedBrdok) {
      this.error = 'Nedostaje vrdok ili broj dokumenta.';
      return;
    }

    this.vrdok = normalizedVrdok;
    this.brdok = normalizedBrdok;
    this.error = '';
    this.fetchDetails();
  }

  private fetchDetails(): void {
    const partnerPpid = this.isAdmin ? this.partnerPpid ?? undefined : undefined;

    this.loading = true;
    this.error = '';
    this.items = [];
    this.totals = { partnerVat: 0, partnerGross: 0, fullGross: 0 };

    this.partnerService
      .getPartnerCardDetails(this.vrdok, this.brdok, partnerPpid)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: PartnerCardDetailsResponse) => {
          const rows = this.normalizeDetailItems(response?.stavke ?? []);
          this.items = rows;
          this.totals = this.calculateTotals(rows);

          if (!rows.length) {
            this.error = response?.errorMessage || 'Nema stavki za prikaz.';
          }
        },
        error: () => {
          this.error = 'Detalji dokumenta trenutno nisu dostupni.';
        }
      });
  }

  private normalizeDetailItems(items: PartnerCardDetailsItem[]): DocumentRowView[] {
    return (items ?? []).map((item, index) => {
      const quantity = this.pickNumber([item.kolicina], 1);
      const vatRate = this.toOptionalNumber(item.porez);
      const vatFactor = vatRate && vatRate > 0 ? 1 + vatRate / 100 : null;

      const grossPartnerUnit = this.pickNumber(
        [item.cenaPartnera, item.prodajnaCenaSaPdv, item.prodajnaCena],
        this.pickNumber([item.punaCena], 0)
      );

      let netPartnerUnit: number;
      let netPartnerTotal: number;
      let vatPartnerUnit: number;
      let vatPartnerTotal: number;
      const grossPartnerTotalBase = this.round2(
        this.pickNumber([item.cenaPartneraUkupno], grossPartnerUnit * quantity)
      );
      let grossPartnerTotal = grossPartnerTotalBase;

      if (vatFactor) {
        netPartnerUnit = this.round2(grossPartnerUnit / vatFactor);
        netPartnerTotal = this.round2(grossPartnerTotal / vatFactor);
        vatPartnerUnit = this.round2(grossPartnerUnit - netPartnerUnit);
        vatPartnerTotal = this.round2(grossPartnerTotal - netPartnerTotal);
      } else {
        netPartnerUnit = this.round2(grossPartnerUnit);
        netPartnerTotal = this.round2(netPartnerUnit * quantity);
        vatPartnerUnit = 0;
        vatPartnerTotal = 0;
      }
      grossPartnerTotal = this.round2(netPartnerTotal + vatPartnerTotal);

      const rabat = this.toOptionalNumber(item.rabat);
      const costPrice = this.toOptionalNumber(item.nabavnaCena);
      const fullGrossUnit = this.pickNumber(
        [item.punaCena, item.prodajnaCenaSaPdv, item.prodajnaCena],
        grossPartnerUnit
      );
      const fullGrossTotal = this.round2(this.pickNumber([item.punaCenaUkupno], fullGrossUnit * quantity));
      return {
        id: item.id ?? item.stavkaId ?? item.robaId ?? index,
        title: item.naziv ?? item.robaNaziv ?? 'Artikal',
        code: item.katbr ?? item.katbrPro ?? null,
        barkod: item.barkod ?? null,
        quantity,
        rabat: rabat ?? undefined,
        rabatLabel: rabat !== null && Math.abs(rabat) > 0.01 ? `${rabat.toFixed(1)}%` : null,
        partnerNet: netPartnerUnit,
        partnerVat: vatPartnerUnit,
        partnerGross: grossPartnerUnit,
        partnerNetTotal: netPartnerTotal,
        partnerVatTotal: vatPartnerTotal,
        partnerGrossTotal: grossPartnerTotal,
        fullGross: fullGrossUnit,
        fullGrossTotal,
        image: this.pictureService.buildImageSrc(
          {
            slikeUrl: item.slika?.slikeUrl ?? null,
            isUrl: item.slika?.url ?? undefined,
            robaSlika: item.slika?.robaSlika ?? undefined
          } as any
        ),
        costPrice: costPrice ?? undefined
      };
    });
  }

  private calculateTotals(items: DocumentRowView[]): DocumentTotals {
    const acc = items.reduce(
      (sum, item) => {
        sum.partnerVat += this.round2(item.partnerVatTotal ?? 0);
        sum.partnerGross += this.round2(item.partnerGrossTotal ?? 0);
        sum.fullGross += this.round2(item.fullGrossTotal ?? 0);
        return sum;
      },
      { partnerVat: 0, partnerGross: 0, fullGross: 0 } as DocumentTotals
    );
    return {
      partnerVat: this.round2(acc.partnerVat),
      partnerGross: this.round2(acc.partnerGross),
      fullGross: this.round2(acc.fullGross)
    };
  }

  private normalizeVrdok(value: string | null): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (this.allowedVrdokCodes.has(trimmed)) {
      return trimmed;
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      const candidate = Math.abs(numeric).toString().padStart(2, '0');
      if (this.allowedVrdokCodes.has(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private normalizeString(value: string | null): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed || null;
  }

  private pickNumber(values: Array<number | string | null | undefined>, fallback = 0): number {
    for (const value of values) {
      const parsed = this.toNumber(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return fallback;
  }

  private toOptionalNumber(value: number | string | null | undefined): number | null {
    const parsed = this.toNumber(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private resolveVatLabel(
    withVat?: number | string | null,
    priceWithVat?: number | string | null,
    priceWithoutVat?: number | string | null
  ): string {
    const hasWithVat = Number.isFinite(this.toNumber(withVat)) || Number.isFinite(this.toNumber(priceWithVat));
    const hasWithoutVat = Number.isFinite(this.toNumber(priceWithoutVat));

    if (hasWithVat && !hasWithoutVat) {
      return 'sa PDV';
    }
    if (hasWithoutVat && !hasWithVat) {
      return 'bez PDV';
    }
    return 'sa PDV'; // default assumption
  }

  private toNumber(value: number | string | null | undefined): number {
    if (value === null || value === undefined || value === '') {
      return Number.NaN;
    }
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : Number.NaN;
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private escapeHtml(value: string | null): string {
    if (!value) {
      return '';
    }
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
