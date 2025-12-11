import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, EMPTY, finalize, map, of, Subject, switchMap, takeUntil, tap } from 'rxjs';

import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';
import { AutomIconComponent } from '../../../../shared/components/autom-icon/autom-icon.component';
import { RsdCurrencyPipe } from '../../../../shared/pipe/rsd-currency.pipe';

import { ButtonThemes, ButtonTypes, ColorEnum, IconsEnum } from '../../../../shared/data-models/enums';
import { PartnerCardDetailsItem, PartnerCardDetailsResponse, PartnerCardGroup } from '../../../../shared/data-models/model';
import { AccountStateService } from '../../../../shared/service/state/account-state.service';
import { PartnerService } from '../../../../shared/service/partner.service';
import { PictureService } from '../../../../shared/service/utils/picture.service';
import { PartnerCardCacheService } from '../../../../shared/service/state/partner-card-cache.service';
import { DocumentRowView, DocumentTotals } from './partner-card-document.models';
import { StringUtils } from '../../../../shared/utils/string-utils';

const VRDOK_LABELS: Record<string, string> = {
  '4': 'Profaktura',
  '04': 'Profaktura',
  '13': 'Faktura',
  '15': 'MP račun',
  '32': 'Proračun'
};

interface DocumentMeta {
  documentDate: string | null;
  documentDueDate: string | null;
  documentTotal: number | null;
}

interface DocumentAccessResult {
  allowed: boolean;
  meta: DocumentMeta | null;
}

@Component({
  selector: 'app-partner-card-document',
  standalone: true,
  imports: [
    AutomIconComponent,
    ButtonComponent,
    CommonModule,
    RouterModule,
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
  printNote = '';
  customerNameForPrint = '';
  partnerNameFromQuery: string | null = null;
  isAdmin = false;
  partnerPpid: number | null = null;
  documentDate: string | null = null;
  documentDueDate: string | null = null;
  documentTotal: number | null = null;
  zoomedImageUrl: string | null = null;
  private printWindow: Window | null = null;

  private readonly destroy$ = new Subject<void>();
  private readonly allowedVrdokCodes = new Set(['4', '04', '13', '15', '32']);
  private readonly hideDueDateVrdok = new Set(['4', '04', '15', '32']);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly partnerService: PartnerService,
    private readonly accountStateService: AccountStateService,
    private readonly pictureService: PictureService,
    private readonly partnerCardCache: PartnerCardCacheService
  ) { }

  ngOnInit(): void {
    this.isAdmin = this.accountStateService.isAdmin();
    if (!this.isAdmin) {
      const accountName = this.accountStateService.get()?.naziv?.trim();
      if (accountName) {
        this.customerNameForPrint = accountName;
      }
    }
    this.readRoute();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.closePrintWindow();
  }

  trackByRow = (_index: number, item: DocumentRowView): string =>
    `${item.id ?? _index}-${item.title}`;

  onBack(): void {
    const queryParams = this.isAdmin && this.partnerPpid
      ? { ppid: this.partnerPpid }
      : undefined;
    this.router.navigate(['/partner-card'], { queryParams });
  }

  onReload(): void {
    this.readRoute();
  }

  get docTypeLabel(): string | null {
    return VRDOK_LABELS[this.vrdok] ?? null;
  }

  get displayPartnerName(): string | null {
    if (this.partnerNameFromQuery) {
      return this.partnerNameFromQuery;
    }
    const accountName = this.accountStateService.get()?.naziv?.trim();
    if (!this.isAdmin && accountName) {
      return accountName;
    }
    if (this.partnerPpid !== null) {
      return `Partner #${this.partnerPpid}`;
    }
    return null;
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

    this.closePrintWindow();
    this.recalculateTotals();
    const total = mode === 'partner' ? this.totals.partnerGross : this.totals.fullGross || this.totals.partnerGross;
    const priceLabel = 'Cena (sa PDV)';
    const totalLabel = 'Ukupno';
    const buyerLabel = this.escapeHtml(this.customerNameForPrint?.trim() || 'Kupac');
    const docLabel = this.escapeHtml(this.docTypeLabel || this.vrdok);
    const noteBlock = this.printNote.trim()
      ? `<div class="note"><div class="note__label">Napomena</div><div class="note__text">${this.escapeHtml(this.printNote).replace(/\n/g, '<br>')}</div></div>`
      : '';
    const contactBlock = `<div class="brand__contact">
            <div>015/319-000</div>
            <div>Kralja Milutina 159, 15000 Šabac</div>
            <div>office@automaterijal.com</div>
         </div>`;
    const issuerBlock = `<div><strong>Dokument izdaje:</strong> ${buyerLabel}</div>
         <div><strong>Robu izdao:</strong> Automaterijal</div>`;

    const rows = this.items
      .map((item, index) => {
        const unit = mode === 'partner' ? item.partnerGross : item.fullGross;
        const sum = mode === 'partner' ? item.partnerGrossTotal : item.fullGrossTotal;
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${this.escapeHtml(item.code ?? '')}</td>
            <td>${this.escapeHtml(item.title)}</td>
            <td>${this.escapeHtml(item.manufacturer ?? '')}</td>
            <td class="num">${item.quantity}</td>
            <td class="num">${this.formatCurrency(unit)}</td>
            <td class="num">${this.formatCurrency(sum)}</td>
          </tr>
        `;
      })
      .join('');

    const win = window.open('', '_blank', 'width=1024,height=768');
    if (!win) {
      return;
    }
    this.printWindow = win;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Dokument #${this.escapeHtml(this.brdok)}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 18px; color: #000; background: #fff; }
            .print-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 10px; border-bottom: 1px solid #000; }
            .brand__name { font-size: 18px; font-weight: 800; letter-spacing: 0.02em; }
            .brand__contact { margin-top: 4px; font-size: 12px; color: #000; line-height: 1.4; }
            .doc-meta { text-align: right; }
            .doc-meta__title { font-size: 18px; font-weight: 800; margin: 0 0 4px; }
            .doc-meta__row { display: flex; justify-content: flex-end; gap: 6px; flex-wrap: wrap; margin-bottom: 4px; }
            .doc-meta__dates { display: flex; justify-content: flex-end; gap: 12px; flex-wrap: wrap; font-size: 12px; color: #000; }
            .pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border-radius: 10px; background: #f5f5f5; color: #000; font-size: 12px; font-weight: 700; border: 1px solid #000; }
            .issuer-block { margin: 12px 0 8px; padding: 10px 12px; border: 1px dashed #000; background: #fff; border-radius: 8px; display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
            .note { margin: 10px 0 12px; padding: 10px 12px; background: #f5f5f5; border: 1px solid #000; border-radius: 8px; }
            .note__label { text-transform: uppercase; font-size: 11px; font-weight: 800; color: #000; letter-spacing: 0.04em; }
            .note__text { margin-top: 4px; color: #000; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; background: #fff; }
            th, td { border: 1px solid #000; padding: 6px 8px; }
            th { background: #f5f5f5; text-align: left; font-weight: 800; color: #000; }
            .num { text-align: right; font-variant-numeric: tabular-nums; }
            .total { margin-top: 6px; display: flex; justify-content: flex-end; gap: 10px; align-items: center; font-weight: 800; font-size: 14px; }
            .footer { margin-top: 12px; padding-top: 10px; border-top: 1px solid #000; display: flex; justify-content: space-between; color: #000; font-size: 12px; }
          </style>
        </head>
        <body>
          <header class="print-header">
            <div class="brand">
              <div class="brand__name">Automaterijal</div>
              ${contactBlock}
            </div>
            <div class="doc-meta">
              <div class="doc-meta__title">Dokument #${this.escapeHtml(this.brdok)}</div>
              <div class="doc-meta__row">
                <span class="pill">${docLabel}</span>
              </div>
              <div class="doc-meta__dates">
                ${this.documentDate ? `<span>Datum: ${this.escapeHtml(this.documentDate)}</span>` : ''}
                ${this.documentDueDate ? `<span>Valuta/Rok: ${this.escapeHtml(this.documentDueDate)}</span>` : ''}
              </div>
            </div>
          </header>

          <section class="issuer-block">
            ${issuerBlock}
          </section>

          ${noteBlock}

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Šifra</th>
                <th>Naziv</th>
                <th>Proizvođač</th>
                <th class="num">Kol.</th>
                <th class="num">${priceLabel}</th>
                <th class="num">Ukupno</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="total">
            <span>${totalLabel}</span>
            <span class="num">${this.formatCurrency(total)}</span>
          </div>

          <footer class="footer">
            <span>Automaterijal</span>
            <span>#${this.escapeHtml(this.brdok)}</span>
          </footer>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      try {
        win.focus();
        win.print();
        win.close();
      } catch {
        // ignore
      } finally {
        this.printWindow = null;
      }
    }, 50);
  }

  private closePrintWindow(): void {
    try {
      if (this.printWindow && !this.printWindow.closed) {
        this.printWindow.close();
      }
    } catch {
      // ignore
    } finally {
      this.printWindow = null;
    }
  }

  private readRoute(): void {
    const params = this.route.snapshot.paramMap;
    const rawVrdok = params.get('vrdok');
    const rawBrdok = params.get('brdok');
    const normalizedVrdok = this.normalizeVrdok(rawVrdok);
    const normalizedBrdok = this.normalizeString(rawBrdok);

    const query = this.route.snapshot.queryParamMap;
    const ppidParam = query.get('ppid');
    const partnerNameParam = query.get('pn');
    const parsedPpid = ppidParam ? Number(ppidParam) : Number.NaN;
    this.partnerPpid = Number.isFinite(parsedPpid) ? parsedPpid : null;
    this.partnerNameFromQuery = partnerNameParam?.trim() || null;
    this.documentDate = null;
    this.documentDueDate = null;
    this.documentTotal = null;
    this.ensureCustomerName();

    if (!normalizedVrdok || !normalizedBrdok) {
      this.error = 'Nedostaje vrdok ili broj dokumenta.';
      return;
    }

    this.vrdok = normalizedVrdok;
    this.brdok = normalizedBrdok;
    this.error = '';
    this.fetchDetails();
  }

  private ensureCustomerName(): void {
    if (this.customerNameForPrint && this.customerNameForPrint.trim()) {
      return;
    }

    if (this.partnerNameFromQuery) {
      this.customerNameForPrint = this.partnerNameFromQuery;
      return;
    }

    if (!this.isAdmin) {
      const accountName = this.accountStateService.get()?.naziv?.trim();
      if (accountName) {
        this.customerNameForPrint = accountName;
        return;
      }
    }

    if (this.partnerPpid) {
      this.customerNameForPrint = `Partner #${this.partnerPpid}`;
      return;
    }

    this.customerNameForPrint = 'Kupac';
  }

  private fetchDetails(): void {
    const partnerPpid = this.isAdmin ? this.partnerPpid ?? undefined : undefined;
    const cachedMeta = this.isAdmin ? this.tryGetDocumentMetaFromCache(partnerPpid ?? null) : null;

    this.loading = true;
    this.error = '';
    this.items = [];
    this.totals = { partnerVat: 0, partnerGross: 0, fullGross: 0 };

    const access$ = this.isAdmin ? of({ allowed: true, meta: cachedMeta }) : this.enforceDocumentAccess();

    access$
      .pipe(
        takeUntil(this.destroy$),
        switchMap((result) => {
          if (!result.allowed) {
            this.error = 'Dokument nije dostupan za ovog partnera.';
            return EMPTY;
          }
          this.applyDocumentMeta(result.meta);
          return this.partnerService.getPartnerCardDetails(this.vrdok, this.brdok, partnerPpid);
        }),
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

  onImageZoom(url: string | null | undefined): void {
    if (!url) {
      return;
    }
    this.zoomedImageUrl = url;
  }

  onNoteChange(value: string): void {
    this.printNote = value ?? '';
  }

  onFullPriceChange(item: DocumentRowView, value: string | number): void {
    if (!item) {
      return;
    }
    const parsed = this.toNumber(value);
    const baseUnit = Number.isFinite(item.fullGrossOriginal ?? Number.NaN)
      ? item.fullGrossOriginal
      : item.fullGross;
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 1;
    const unit = Number.isFinite(parsed) ? Math.max(0, this.round2(parsed)) : baseUnit;

    item.fullGross = unit;
    item.fullGrossTotal = this.round2(unit * quantity);
    item.fullPriceEdited = Number.isFinite(parsed) && Math.abs(unit - baseUnit) > 0.01;
    this.recalculateTotals();
  }

  resetFullPrice(item: DocumentRowView): void {
    if (!item) {
      return;
    }
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 1;
    const baseUnit = Number.isFinite(item.fullGrossOriginal ?? Number.NaN)
      ? item.fullGrossOriginal
      : item.fullGross;
    const baseTotal = Number.isFinite(item.fullGrossTotalOriginal ?? Number.NaN)
      ? item.fullGrossTotalOriginal
      : baseUnit * quantity;

    item.fullGross = baseUnit;
    item.fullGrossTotal = this.round2(baseTotal);
    item.fullPriceEdited = false;
    this.recalculateTotals();
  }

  private normalizeDetailItems(items: PartnerCardDetailsItem[]): DocumentRowView[] {
    return (items ?? []).map((item, index) => {
      const quantity = this.pickNumber([item.kolicina], 1);
      const manufacturer = this.normalizeString(item.proizvodjacNaziv);
      const groupLabel = this.normalizeString(item.grupaNaziv) ?? this.normalizeString(item.grupa);
      const subgroupLabel = this.normalizeString(item.podgrupaNaziv) ?? this.normalizeString(item.podgrupa);
      const title = item.naziv ?? item.robaNaziv ?? 'Artikal';
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
        title,
        code: item.katbr ?? item.katbrPro ?? null,
        barkod: item.barkod ?? null,
        manufacturer,
        groupLabel,
        subgroupLabel,
        routeParam: this.buildRouteParam(item, manufacturer, title),
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
        fullGrossOriginal: fullGrossUnit,
        fullGrossTotalOriginal: fullGrossTotal,
        fullPriceEdited: false,
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

  private recalculateTotals(): void {
    this.totals = this.calculateTotals(this.items);
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

  private normalizeVrdok(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
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

  private normalizeString(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed || null;
  }

  private buildRouteParam(
    item: PartnerCardDetailsItem,
    manufacturer: string | null,
    title: string
  ): string | null {
    const productId = this.toNumber(item.robaId ?? item.id);
    if (!Number.isFinite(productId)) {
      return null;
    }

    const code = this.normalizeString(item.katbr ?? item.katbrPro);
    const slug = StringUtils.productSlug(manufacturer ?? undefined, title, code ?? undefined);
    const idPart = Math.abs(productId);
    return slug ? `${idPart}-${slug}` : `${idPart}`;
  }

  private applyDocumentMeta(meta: DocumentMeta | null): void {
    if (!meta) {
      this.documentDate = null;
      this.documentDueDate = null;
      this.documentTotal = null;
      return;
    }

    this.documentDate = meta.documentDate ?? null;
    this.documentDueDate = this.shouldHideDueDate(this.vrdok) ? null : meta.documentDueDate ?? null;
    this.documentTotal = Number.isFinite(meta.documentTotal ?? Number.NaN) ? meta.documentTotal : null;
  }

  private tryGetDocumentMetaFromCache(partnerPpid: number | null): DocumentMeta | null {
    const key = this.buildCacheKey(partnerPpid);
    const cached = this.partnerCardCache.get(key);
    if (!cached) {
      return null;
    }
    const result = this.resolveAccessFromGroups(cached.groups);
    return result.meta;
  }

  private enforceDocumentAccess() {
    const cached = this.partnerCardCache.get('self');
    if (cached) {
      return of(this.resolveAccessFromGroups(cached.groups));
    }

    return this.partnerService.getPartnerCard().pipe(
      tap((response) => this.partnerCardCache.set('self', response)),
      map((response) => this.resolveAccessFromGroups(response?.groups)),
      catchError(() => of({ allowed: false, meta: null }))
    );
  }

  private resolveAccessFromGroups(groups: PartnerCardGroup[] | null | undefined): DocumentAccessResult {
    const broj = this.brdok;
    const vrdok = this.vrdok;
    if (!broj || !vrdok) {
      return { allowed: false, meta: null };
    }

    for (const group of groups ?? []) {
      for (const item of group?.stavke ?? []) {
        const brojDokumenta = this.normalizeString(
          (item as any)?.brojDokumenta ?? (item as any)?.brdok ?? item.brojDokumenta
        );
        const itemVrdok = this.normalizeVrdok((item as any)?.vrdok ?? (item as any)?.vrDok ?? item.vrdok);
        if (brojDokumenta === broj && itemVrdok === vrdok) {
          return { allowed: true, meta: this.extractDocumentMeta(item) };
        }
      }
    }

    return { allowed: false, meta: null };
  }

  private extractDocumentMeta(item: any): DocumentMeta {
    const documentDate = this.normalizeString(item?.datum);
    const documentDueDate = this.shouldHideDueDate(this.vrdok)
      ? null
      : this.normalizeString(item?.datumRoka);
    const totalRaw = this.toNumber(item?.duguje);
    const documentTotal = Number.isFinite(totalRaw) ? totalRaw : null;

    return { documentDate, documentDueDate, documentTotal };
  }

  private shouldHideDueDate(vrdok: string | number | null | undefined): boolean {
    const normalized = this.normalizeVrdok(vrdok);
    if (!normalized) {
      return false;
    }
    return this.hideDueDateVrdok.has(normalized);
  }

  private buildCacheKey(partnerPpid: number | null): string {
    if (this.isAdmin) {
      return partnerPpid !== null && partnerPpid !== undefined ? `admin-${partnerPpid}` : 'admin-none';
    }
    return 'self';
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
