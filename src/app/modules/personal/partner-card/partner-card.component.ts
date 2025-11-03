import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { PageEvent } from '@angular/material/paginator';
import { finalize, Subject, takeUntil } from 'rxjs';

// Components
import { AutomHeaderComponent } from '../../../shared/components/autom-header/autom-header.component';
import { DividerComponent } from '../../../shared/components/divider/divider.component';
import { TypeaheadComponent, TypeaheadItem } from '../../../shared/components/typeahead/typeahead.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { TableFlatComponent } from '../../../shared/components/table-flat/table-flat.component';

// Data models
import { HeaderData } from '../../../shared/data-models/interface/header.interface';
import {
  PartnerCardGroup,
  PartnerCardItem,
  PartnerCardResponse,
  Partner
} from '../../../shared/data-models/model';

// Enums
import { HeadingLevelEnum } from '../../../shared/data-models/enums/heading.enum';
import { AutomTableColumn, CellType } from '../../../shared/data-models/enums/table.enum';

// Pipes
import { RsdCurrencyPipe } from '../../../shared/pipe/rsd-currency.pipe';

// Services
import { AccountStateService } from '../../../shared/service/state/account-state.service';
import { PartnerService } from '../../../shared/service/partner.service';
import {
  PartnerCardAdminSelectionResult,
  PartnerCardAdminService
} from './partner-card-admin.service';

interface PartnerCardGroupView {
  data: PartnerCardGroup;
  title: string;
  pageIndex: number;
  pageSize: number;
  pageSizeOptions: number[];
  dataSource: MatTableDataSource<PartnerCardItem>;
  totalItems: number;
  columns: AutomTableColumn[];
  displayedColumns: string[];
}

interface SummaryCard {
  label: string;
  value?: string;
  isCurrency: boolean;
  amount?: number;
}

export const PartnerCardHeader: HeaderData = {
  titleInfo: {
    title: 'Partner kartica'
  }
};

@Component({
  selector: 'app-partner-card',
  standalone: true,
  imports: [
    AutomHeaderComponent,
    CommonModule,
    SpinnerComponent,
    RsdCurrencyPipe,
    TableFlatComponent,
    DividerComponent,
    TypeaheadComponent
  ],
  providers: [CurrencyPipe, PartnerCardAdminService],
  templateUrl: './partner-card.component.html',
  styleUrl: './partner-card.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class PartnerCardComponent implements OnInit, OnDestroy {
  errorMessage = '';
  groups: PartnerCardGroup[] = [];
  groupViews: PartnerCardGroupView[] = [];
  headerData = PartnerCardHeader;
  headingLevelEnum = HeadingLevelEnum;
  loading = false;
  summaryCards: SummaryCard[] = [];
  isAdmin = false;

  private destroy$ = new Subject<void>();
  private readonly novcanaTip = 'novcana stavka';
  private readonly defaultPageSize = 10;
  private readonly pageSizeOptions = [5, 10, 25, 50];

  constructor(
    private accountStateService: AccountStateService,
    private partnerService: PartnerService,
    public admin: PartnerCardAdminService
  ) { }

  ngOnInit(): void {
    this.isAdmin = this.accountStateService.isAdmin();

    if (this.isAdmin) {
      this.summaryCards = [];
      return;
    }

    const account = this.accountStateService.get();
    this.setupBalanceCards(account);
    this.loadPartnerCard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByGroup = (_index: number, view: PartnerCardGroupView): string =>
    `${view.title}-${_index}`;

  trackBySummaryCard = (_index: number, card: SummaryCard): string =>
    `${card.label}-${card.isCurrency ? card.amount : card.value}`;

  // ----------------------------------------
  // Admin actions
  // ----------------------------------------
  onPartnerSearch(term: string): void {
    if (!this.isAdmin) {
      return;
    }

    this.errorMessage = '';
    this.admin.search(term);
  }

  onPartnerSelected(item: TypeaheadItem | null): void {
    if (!this.isAdmin) {
      return;
    }

    const result: PartnerCardAdminSelectionResult = this.admin.select(item);
    this.setupBalanceCards(result.partner ?? null);

    if (result.error) {
      this.groups = [];
      this.groupViews = [];
      this.errorMessage = result.error;
      return;
    }

    if (!result.partnerId) {
      this.groups = [];
      this.groupViews = [];
      this.errorMessage = '';
      return;
    }

    this.errorMessage = '';
    this.loadPartnerCard(result.partnerId);
  }

  private loadPartnerCard(partnerPpid?: number): void {
    this.loading = true;
    this.errorMessage = '';
    if (partnerPpid !== undefined) {
      this.groups = [];
      this.groupViews = [];
      this.partnerService
        .getPartnerCardAdmin(partnerPpid)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.loading = false;
          })
        )
        .subscribe({
          next: (response: PartnerCardResponse) => {
            this.handlePartnerCardResponse(response);
          },
          error: () => {
            this.handlePartnerCardError();
          }
        });
      return;
    }

    this.partnerService
      .getPartnerCard()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: PartnerCardResponse) => this.handlePartnerCardResponse(response),
        error: () => this.handlePartnerCardError()
      });
  }

  private handlePartnerCardResponse(response: PartnerCardResponse): void {
    const normalized = this.normalizeGroups(response?.groups ?? []);
    this.groups = this.splitDocumentGroups(normalized);
    this.buildGroupViews();
    this.errorMessage = '';
  }

  private handlePartnerCardError(): void {
    this.groups = [];
    this.groupViews = [];
    this.errorMessage =
      'Kartica trenutno nije dostupna. Molimo pokušajte ponovo.';
  }

  private normalizeGroups(groups: PartnerCardGroup[]): PartnerCardGroup[] {
    return groups.map((group) => {
      const items = (group.stavke ?? []).map((item) => ({
        tip: this.normalizeString(item.tip) ?? group.tip ?? '',
        nazivDok: this.normalizeString(item.nazivDok) ?? '',
        brojDokumenta: this.normalizeString(item.brojDokumenta),
        datum: this.normalizeString(item.datum),
        datumRoka: this.normalizeString(item.datumRoka),
        duguje: this.asNumber(item.duguje),
        potrazuje: this.asNumber(item.potrazuje),
        stanje: this.asNumber(item.stanje)
      }));

      const totalDuguje = this.firstValidNumber(group.totalDuguje, this.sumAmounts(items, 'duguje'));
      const totalPotrazuje = this.firstValidNumber(group.totalPotrazuje, this.sumAmounts(items, 'potrazuje'));
      const totalStanje = this.firstValidNumber(group.totalStanje, this.sumAmounts(items, 'stanje'));
      const normalizedGroupTip = this.normalizeString(group.tip) ?? this.findFirstType(items) ?? '';

      return {
        tip: normalizedGroupTip,
        displayTip: this.normalizeString(group.tip) ?? normalizedGroupTip,
        totalDuguje,
        totalPotrazuje,
        totalStanje,
        stavke: items
      };
    });
  }

  private splitDocumentGroups(groups: PartnerCardGroup[]): PartnerCardGroup[] {
    const result: PartnerCardGroup[] = [];

    groups.forEach((group) => {
      if (!this.isDocumentGroup(group.tip)) {
        result.push(group);
        return;
      }

      const items = group.stavke ?? [];
      if (!items.length) {
        result.push(group);
        return;
      }

      const itemsByDocument = new Map<string, PartnerCardItem[]>();

      items.forEach((item) => {
        const documentName = this.normalizeString(item.nazivDok) ?? 'Bez naziva';
        if (!itemsByDocument.has(documentName)) {
          itemsByDocument.set(documentName, []);
        }
        itemsByDocument.get(documentName)!.push(item);
      });

      itemsByDocument.forEach((documentItems, documentName) => {
        result.push({
          tip: group.tip,
          displayTip: documentName,
          totalDuguje: this.sumAmounts(documentItems, 'duguje'),
          totalPotrazuje: this.sumAmounts(documentItems, 'potrazuje'),
          totalStanje: this.sumAmounts(documentItems, 'stanje'),
          stavke: documentItems
        });
      });
    });

    return result;
  }

  onGroupPageChange(view: PartnerCardGroupView, event: PageEvent): void {
    view.pageIndex = event.pageIndex;
    view.pageSize = event.pageSize;
    this.updateGroupData(view);
  }

  private findFirstType(items: PartnerCardItem[]): string {
    return items.find((item) => !!item.tip)?.tip ?? '';
  }

  isNovcanaGroup(tip: string | undefined): boolean {
    return this.normalizeTipValue(tip) === this.novcanaTip;
  }

  private isDocumentGroup(tip: string | undefined): boolean {
    return this.normalizeTipValue(tip) === 'dokument';
  }

  private buildGroupViews(): void {
    this.groupViews = this.sortGroups(this.groups).map((group) => {
      const view = this.createGroupView(group);
      this.updateGroupData(view);
      return view;
    });
  }

  private createGroupView(group: PartnerCardGroup): PartnerCardGroupView {
    const isDocument = this.isDocumentGroup(group.tip);

    const columns: AutomTableColumn[] = [
      { key: 'tip', header: 'Tip', type: CellType.TEXT },
      { key: 'nazivDok', header: 'Naziv dokumenta', type: CellType.TEXT },
      { key: 'brojDokumenta', header: 'Broj dokumenta', type: CellType.TEXT },
      { key: 'datum', header: 'Datum', type: CellType.DATE, dateFormat: 'dd.MM.yyyy' },
      { key: 'datumRoka', header: 'Datum roka', type: CellType.DATE, dateFormat: 'dd.MM.yyyy' },
      { key: 'duguje', header: 'Zaduženje', type: CellType.CURRENCY },
      { key: 'potrazuje', header: 'Razduženje', type: CellType.CURRENCY }
    ];

    return {
      data: group,
      title: group.displayTip ?? group.tip ?? 'N/A',
      pageIndex: 0,
      pageSize: this.defaultPageSize,
      pageSizeOptions: this.pageSizeOptions,
      dataSource: new MatTableDataSource<PartnerCardItem>([]),
      totalItems: group.stavke?.length ?? 0,
      columns,
      displayedColumns: columns.map((col) => col.key)
    };
  }

  private updateGroupData(view: PartnerCardGroupView): void {
    const items = view.data.stavke ?? [];
    view.totalItems = items.length;
    const start = view.pageIndex * view.pageSize;
    const end = start + view.pageSize;
    view.dataSource.data = items.slice(start, end);
  }

  private sumAmounts(
    items: PartnerCardItem[],
    field: keyof Pick<PartnerCardItem, 'duguje' | 'potrazuje' | 'stanje'>
  ): number {
    return items.reduce((acc, item) => acc + (item[field] ?? 0), 0);
  }

  private sortGroups(groups: PartnerCardGroup[]): PartnerCardGroup[] {
    const priority = (tip: string | undefined) => {
      const normalized = this.normalizeTipValue(tip);
      if (normalized === 'dokument') {
        return 0;
      }
      if (!normalized) {
        return 2;
      }
      if (normalized === this.novcanaTip) {
        return 3;
      }
      return 1;
    };

    return groups
      .slice()
      .sort((a, b) => {
        const priorityDiff = priority(a.tip) - priority(b.tip);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        const labelA = a.displayTip ?? a.tip ?? '';
        const labelB = b.displayTip ?? b.tip ?? '';

        return labelA.localeCompare(labelB, undefined, {
          sensitivity: 'base'
        });
      });
  }

  private normalizeTipValue(value: string | undefined): string {
    if (!value) {
      return '';
    }

    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private setupBalanceCards(
    source?: Pick<Partner, 'naziv' | 'email' | 'stanje' | 'stanjeporoku'> | null
  ): void {
    if (!source) {
      this.summaryCards = [];
      return;
    }

    const cards: SummaryCard[] = [];

    if (source.naziv) {
      cards.push({ label: 'Partner', value: source.naziv, isCurrency: false });
    }

    if (source.email) {
      cards.push({ label: 'Email', value: source.email, isCurrency: false });
    }

    if (source.stanje !== undefined && source.stanje !== null) {
      cards.push({
        label: 'Stanje',
        isCurrency: true,
        amount: source.stanje
      });
    }

    if (source.stanjeporoku !== undefined && source.stanjeporoku !== null) {
      cards.push({
        label: 'Van valute',
        isCurrency: true,
        amount: source.stanjeporoku
      });
    }

    this.summaryCards = cards;
  }

  private asNumber(value: number | string | null | undefined): number {
    const parsed = this.toNumber(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private firstValidNumber(
    value: number | string | null | undefined,
    fallback: number
  ): number {
    const parsed = this.toNumber(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private normalizeString(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const stringValue = String(value).trim();
    return stringValue.length ? stringValue : null;
  }

  private toNumber(value: number | string | null | undefined): number {
    if (value === null || value === undefined || value === '') {
      return Number.NaN;
    }

    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : Number.NaN;
  }
}
