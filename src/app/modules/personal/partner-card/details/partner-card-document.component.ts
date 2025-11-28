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

interface DocumentRowView {
  id?: number | null;
  title: string;
  code?: string | null;
  barkod?: string | null;
  quantity: number;
  rabat?: number | null;
  rabatLabel?: string | null;
  partnerNet: number;
  partnerVat: number;
  partnerGross: number;
  partnerNetTotal: number;
  partnerVatTotal: number;
  partnerGrossTotal: number;
  image: string;
  costPrice?: number;
}

interface DocumentTotals {
  partnerGross: number;
}

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
  totals: DocumentTotals = { partnerGross: 0 };
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
    this.totals = { partnerGross: 0 };

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
        this.pickNumber([item.prodajnaCenaBezPdv], 0)
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
        const dtoNet = this.pickNumber([item.prodajnaCenaBezPdv], grossPartnerUnit);
        netPartnerUnit = this.round2(Math.min(dtoNet, grossPartnerUnit));
        netPartnerTotal = this.round2(netPartnerUnit * quantity);
        vatPartnerUnit = this.round2(Math.max(grossPartnerUnit - netPartnerUnit, 0));
        vatPartnerTotal = this.round2(Math.max(grossPartnerTotal - netPartnerTotal, 0));
      }
      grossPartnerTotal = this.round2(netPartnerTotal + vatPartnerTotal);

      const rabat = this.toOptionalNumber(item.rabat);
      const costPrice = this.toOptionalNumber(item.nabavnaCena);
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
        sum.partnerGross += this.round2(item.partnerGrossTotal ?? 0);
        return sum;
      },
      { partnerGross: 0 } as DocumentTotals
    );
    return {
      partnerGross: this.round2(acc.partnerGross)
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
}
