import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { finalize } from 'rxjs';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';
import { IconsEnum } from '../../../shared/data-models/enums';
import {
  FebiPriceAdminService,
  PriceReloadResponse,
  PriceFileInfoResponse,
} from '../../../shared/service/febi-price-admin.service';
import {
  HogwartsAdminService,
  HogwartsOverviewResponse,
  HogwartsStatusSnapshot,
  HogwartsStuckOrder,
  HogwartsProviderSnapshot,
} from '../../../shared/service/hogwarts-admin.service';
import { SnackbarService } from '../../../shared/service/utils/snackbar.service';
import { HOGWARTS_ARTICLES, HOGWARTS_STORIES } from './hogwarts.lore';

type StatusSeverity = 'critical' | 'warning';
type ProviderSeverity = 'stable' | 'warning';

interface StatusCardConfig {
  status: number;
  key: string;
  title: string;
  description: string;
  severity: StatusSeverity;
  icon: IconsEnum;
  badge: string;
  windowMinutes: number;
}

interface StatusCardView extends StatusCardConfig {
  count: number;
  oldestMinutes: number | null;
  p95Minutes: number | null;
  updatedLastWindow: number | null;
  trend: string;
}

interface StuckOrderView {
  id: string;
  status: string;
  ageMinutes: number | null;
  updatedAt: string;
  customer: string;
  total: string;
}

interface ProviderView {
  name: string;
  status: string;
  severity: ProviderSeverity;
  lastOrder: string;
  ordersLast10d: number;
  backorderCount: number;
  messageCount: number;
  alertLabel: string;
  alertIcon: IconsEnum;
}

@Component({
  selector: 'app-hogwarts',
  standalone: true,
  imports: [CommonModule, AutomIconComponent, MatSnackBarModule],
  templateUrl: './hogwarts.component.html',
  styleUrl: './hogwarts.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class HogwartsComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  icons = IconsEnum;
  readonly today = new Date();
  private readonly triviaIntervalMs = 30 * 60 * 1000;
  private triviaTimerId: ReturnType<typeof setInterval> | null = null;
  private triviaTimeoutId: ReturnType<typeof setTimeout> | null = null;
  overviewLoading = false;
  overviewError = '';
  private readonly statusCardConfig: StatusCardConfig[] = [
    {
      status: 2,
      key: 'NOT_TAKEN_FOR_PROCESSING',
      title: 'ERP pickup',
      description: 'ERP job did not pull orders into processing.',
      severity: 'critical',
      icon: IconsEnum.ALERT_TRIANGLE,
      badge: 'CRITICAL',
      windowMinutes: 30,
    },
    {
      status: 3,
      key: 'PROCESSING_IN_PROGRESS',
      title: 'Processing in progress',
      description: 'Orders are stuck in processing for too long.',
      severity: 'warning',
      icon: IconsEnum.ACTIVITY,
      badge: 'WARNING',
      windowMinutes: 60,
    },
  ];
  private readonly statusKeyByValue = new Map<number, string>(
    this.statusCardConfig.map((card) => [card.status, card.key])
  );
  statusCards: StatusCardView[] = this.statusCardConfig.map((card) =>
    this.buildStatusCardView(card)
  );
  stuckOrders: StuckOrderView[] = [];
  providers: ProviderView[] = [];
  readonly housePoints = [
    {
      name: 'Gryffindor',
      mascot: 'Lion',
      points: 312,
      progress: 78,
      accent: '#a43b30',
    },
    {
      name: 'Slytherin',
      mascot: 'Snake',
      points: 286,
      progress: 71,
      accent: '#1f6b4a',
    },
    {
      name: 'Ravenclaw',
      mascot: 'Eagle',
      points: 274,
      progress: 68,
      accent: '#2a5a88',
    },
    {
      name: 'Hufflepuff',
      mascot: 'Badger',
      points: 241,
      progress: 60,
      accent: '#c79a2e',
    },
  ];
  readonly trivia = HOGWARTS_STORIES;
  readonly loreArticles = HOGWARTS_ARTICLES;
  triviaIndex = 0;
  lessonIndex = 0;
  uploadFile: File | null = null;
  loading = false;
  statusMessage = '';
  statusType: 'success' | 'error' | '' = '';
  lastCount: number | null = null;
  lastPath: string | null = null;
  lastModified: number | null = null;
  lastSizeBytes: number | null = null;

  constructor(
    private febiPriceAdminService: FebiPriceAdminService,
    private hogwartsAdminService: HogwartsAdminService,
    private snackbarService: SnackbarService
  ) { }

  ngOnInit(): void {
    this.loadMeta();
    this.loadOverview();
    this.setInitialTriviaIndex();
    this.setInitialLessonIndex();
    this.startTriviaRotation();
  }

  ngOnDestroy(): void {
    if (this.triviaTimerId) {
      clearInterval(this.triviaTimerId);
    }
    if (this.triviaTimeoutId) {
      clearTimeout(this.triviaTimeoutId);
    }
  }

  get activeTrivia() {
    return this.trivia[this.triviaIndex] ?? this.trivia[0];
  }

  get activeLesson() {
    return this.loreArticles[this.lessonIndex] ?? this.loreArticles[0];
  }

  nextTrivia(): void {
    this.rotateTrivia();
  }

  nextLesson(): void {
    this.rotateLesson();
  }

  private setInitialTriviaIndex(): void {
    if (!this.trivia.length) {
      this.triviaIndex = 0;
      return;
    }
    const slot = Math.floor(Date.now() / this.triviaIntervalMs);
    this.triviaIndex = slot % this.trivia.length;
  }

  private setInitialLessonIndex(): void {
    if (!this.loreArticles.length) {
      this.lessonIndex = 0;
      return;
    }
    const slot = Math.floor(Date.now() / this.triviaIntervalMs);
    this.lessonIndex = (slot + 5) % this.loreArticles.length;
  }

  private startTriviaRotation(): void {
    const now = Date.now();
    const msUntilNext = this.triviaIntervalMs - (now % this.triviaIntervalMs);
    this.triviaTimeoutId = setTimeout(() => {
      this.rotateTrivia();
      this.rotateLesson();
      this.triviaTimerId = setInterval(() => {
        this.rotateTrivia();
        this.rotateLesson();
      }, this.triviaIntervalMs);
    }, msUntilNext);
  }

  private rotateTrivia(): void {
    if (!this.trivia.length) {
      return;
    }
    this.triviaIndex = (this.triviaIndex + 1) % this.trivia.length;
  }

  private rotateLesson(): void {
    if (!this.loreArticles.length) {
      return;
    }
    this.lessonIndex = (this.lessonIndex + 1) % this.loreArticles.length;
  }

  private loadOverview(): void {
    this.overviewLoading = true;
    this.overviewError = '';
    this.hogwartsAdminService
      .fetchOverview()
      .pipe(finalize(() => (this.overviewLoading = false)))
      .subscribe({
        next: (overview) => this.applyOverview(overview),
        error: () => {
          this.overviewError = 'Hogwarts metrics are currently unavailable.';
          this.statusCards = this.statusCardConfig.map((card) =>
            this.buildStatusCardView(card)
          );
          this.stuckOrders = [];
          this.providers = [];
        },
      });
  }

  private applyOverview(overview: HogwartsOverviewResponse): void {
    const statusMap = new Map<number, HogwartsStatusSnapshot>();
    for (const status of overview?.statuses ?? []) {
      if (status?.status !== undefined && status?.status !== null) {
        statusMap.set(status.status, status);
      }
    }

    this.statusCards = this.statusCardConfig.map((card) =>
      this.buildStatusCardView(card, statusMap.get(card.status))
    );
    this.stuckOrders = this.mapStuckOrders(overview?.stuckOrders ?? []);
    this.providers = this.mapProviders(overview?.providers ?? []);
  }

  private buildStatusCardView(
    config: StatusCardConfig,
    snapshot?: HogwartsStatusSnapshot
  ): StatusCardView {
    const windowMinutes = snapshot?.windowMinutes ?? config.windowMinutes;
    const updatedLastWindow = snapshot?.updatedLastWindow ?? null;
    const trend =
      updatedLastWindow !== null
        ? `+${updatedLastWindow} in last ${windowMinutes}m`
        : 'No recent updates';

    return {
      ...config,
      count: snapshot?.count ?? 0,
      oldestMinutes: snapshot?.oldestMinutes ?? null,
      p95Minutes: snapshot?.p95Minutes ?? null,
      updatedLastWindow,
      windowMinutes,
      trend,
    };
  }

  private mapStuckOrders(rows: HogwartsStuckOrder[]): StuckOrderView[] {
    return rows.map((row) => {
      const statusKey =
        row.status !== null && row.status !== undefined
          ? this.statusKeyByValue.get(row.status) ?? `STATUS_${row.status}`
          : 'UNKNOWN';
      const ageMinutes = row.ageMinutes ?? null;
      const updatedAt = this.formatAge(ageMinutes);
      const customer =
        row.partnerName?.trim() ||
        (row.ppid !== null && row.ppid !== undefined
          ? `Partner #${row.ppid}`
          : 'Nepoznat partner');

      return {
        id: this.formatOrderId(row),
        status: statusKey,
        ageMinutes,
        updatedAt,
        customer,
        total: this.formatTotal(row.total),
      };
    });
  }

  private mapProviders(rows: HogwartsProviderSnapshot[]): ProviderView[] {
    return rows.map((row) => {
      const ordersLast10d = row.ordersLast10d ?? 0;
      const backorderCount = row.backorderCountLast10d ?? 0;
      const messageCount = row.messageCountLast10d ?? 0;
      const hasAlert = messageCount > 0 || backorderCount > 0;
      const severity: ProviderSeverity = hasAlert ? 'warning' : 'stable';
      const status = messageCount > 0 ? 'Degraded' : backorderCount > 0 ? 'Watch' : 'Healthy';
      const alertLabel = hasAlert
        ? `${messageCount} messages, ${backorderCount} backorders in 10d`
        : 'No alerts in 10d';
      const alertIcon = hasAlert ? IconsEnum.ALERT_CIRCLE : IconsEnum.CHECK;

      return {
        name: this.formatProviderName(row.providerKey),
        status,
        severity,
        lastOrder: this.formatAgeFromTimestamp(row.lastOrderAt),
        ordersLast10d,
        backorderCount,
        messageCount,
        alertLabel,
        alertIcon,
      };
    });
  }

  private formatAge(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined) {
      return '--';
    }
    return `${minutes}m ago`;
  }

  private formatAgeFromTimestamp(timestamp: number | null | undefined): string {
    if (!timestamp) {
      return '--';
    }
    const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    return `${diffMinutes}m ago`;
  }

  private formatOrderId(order: HogwartsStuckOrder): string {
    if (order.orderId !== null && order.orderId !== undefined) {
      return `ORD-${order.orderId}`;
    }
    if (order.id !== null && order.id !== undefined) {
      return `#${order.id}`;
    }
    return '--';
  }

  private formatTotal(total: number | null | undefined): string {
    if (total === null || total === undefined) {
      return '--';
    }
    const formatted = new Intl.NumberFormat('sr-RS', {
      maximumFractionDigits: 0,
    }).format(total);
    return `${formatted} RSD`;
  }

  private formatProviderName(providerKey: string | null | undefined): string {
    if (!providerKey) {
      return 'Unknown';
    }
    const cleaned = providerKey.replace(/[-_]+/g, ' ').trim();
    return cleaned
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFile = input?.files?.[0] ?? null;
  }

  castUpload(): void {
    if (this.loading) {
      return;
    }
    if (!this.uploadFile) {
      this.setStatus('Choose a .xlsx file before casting the spell.', 'error');
      return;
    }

    this.loading = true;
    this.febiPriceAdminService
      .uploadPriceList(this.uploadFile)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) =>
          this.handleSuccess(response, 'Spell succeeded: upload & reload'),
        error: (err) => this.handleError(err),
      });
  }

  recastFromDisk(): void {
    if (this.loading) {
      return;
    }
    this.loading = true;
    this.febiPriceAdminService
      .reloadFromDisk()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) =>
          this.handleSuccess(response, 'Recast from disk succeeded'),
        error: (err) => this.handleError(err),
      });
  }

  private handleSuccess(response: PriceReloadResponse, message: string): void {
    this.lastCount = response?.count ?? null;
    this.lastPath = response?.path ?? null;
    this.lastModified = response?.lastModified ?? null;
    this.lastSizeBytes = response?.sizeBytes ?? null;
    this.setStatus(
      `${message}. Tomes indexed: ${this.lastCount ?? 0}${this.lastPath ? ` | Path: ${this.lastPath}` : ''}`,
      'success');
    this.snackbarService.showSuccess(message);
    this.uploadFile = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private handleError(error: any): void {
    const message =
      error?.error?.message ||
      error?.message ||
      'Mishap! The spell seems to have gone wrong.';
    this.setStatus(message, 'error');
    this.snackbarService.showError(message);
  }

  private setStatus(message: string, type: 'success' | 'error'): void {
    this.statusMessage = message;
    this.statusType = type;
  }

  private loadMeta(): void {
    this.febiPriceAdminService.fetchMeta().subscribe({
      next: (info: PriceFileInfoResponse) => {
        this.lastPath = info?.path ?? this.lastPath;
        this.lastModified = info?.lastModified ?? this.lastModified;
        this.lastSizeBytes = info?.sizeBytes ?? this.lastSizeBytes;
      },
      error: () => {
        // ignore; meta is optional
      },
    });
  }
}
