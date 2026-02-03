import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { finalize, Observable } from 'rxjs';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';
import { PopupComponent } from '../../../shared/components/popup/popup.component';
import { IconsEnum, PositionEnum, SizeEnum } from '../../../shared/data-models/enums';
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
  HogwartsRevenueOverviewResponse,
  HogwartsRevenueMetrics,
  HogwartsRevenuePeriodRow,
  SzakalFilesSummary,
  SzakalImportResult,
  SzakalImportSummary,
  SzakalStatusSummary,
  TecDocBrandMapping,
} from '../../../shared/service/hogwarts-admin.service';
import { ManufactureService } from '../../../shared/service/manufacture.service';
import { Manufacture } from '../../../shared/data-models/model/proizvodjac';
import { SnackbarService } from '../../../shared/service/utils/snackbar.service';
import {
  HOGWARTS_ARTICLES,
  HOGWARTS_LETTERS,
  HOGWARTS_STORIES,
  HogwartsLetter,
} from './hogwarts.lore';
import { HOGWARTS_COMMERCE_LESSONS } from './hogwarts.commerce';

type StatusSeverity = 'critical' | 'warning';
type ProviderSeverity = 'stable' | 'warning';
type SortDirection = 'asc' | 'desc';
type LedgerSortColumn =
  | 'year'
  | 'orders'
  | 'revenue'
  | 'aov'
  | 'activePartners'
  | 'ordersPerPartner';
type HouseKey = 'gryffindor' | 'slytherin' | 'ravenclaw' | 'hufflepuff';

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
  oldestLabel: string;
  p95Label: string;
  updatedLastWindow: number | null;
  trend: string;
}

interface StuckOrderView {
  id: string;
  status: string;
  ageMinutes: number | null;
  ageLabel: string;
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

interface RevenueSummaryView {
  orders: number;
  revenue: string;
  aov: string;
  activePartners: number;
  ordersPerPartner: string;
}

interface RevenueHistoryRowView {
  year: number;
  orders: number;
  revenueValue: number;
  revenue: string;
  aovValue: number | null;
  aov: string;
  activePartners: number;
  ordersPerPartnerValue: number | null;
  ordersPerPartner: string;
}

interface ReadingNookContent {
  title: string;
  subtitle?: string;
  body: string[];
  tag?: string;
  source?: string;
}

interface HouseInfo {
  key: HouseKey;
  name: string;
  mascot: string;
  accent: string;
}

interface HousePointsView extends HouseInfo {
  points: number;
  progress: number;
}

interface QuidditchLineup {
  seeker: string;
  keeper: string;
  beaters: string[];
  chasers: string[];
}

interface QuidditchTeamScore {
  house: HouseInfo;
  score: number;
  goals: number;
  snitch: boolean;
  seeker: string;
  lineup: QuidditchLineup;
  substitutes: string[];
}

interface QuidditchMatch {
  dayKey: string;
  home: QuidditchTeamScore;
  away: QuidditchTeamScore;
  winner: HouseInfo;
  summary: string;
}

interface PointAward {
  by: string;
  house: string;
  accent: string;
  points: number;
  detail: string;
}

interface BludgerHit {
  by: string;
  house: string;
  accent: string;
  detail: string;
}

@Component({
  selector: 'app-hogwarts',
  standalone: true,
  imports: [CommonModule, AutomIconComponent, PopupComponent, MatSnackBarModule],
  templateUrl: './hogwarts.component.html',
  styleUrl: './hogwarts.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class HogwartsComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  icons = IconsEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;
  today = new Date();
  private destroyed = false;
  activeTab: 'common' | 'watchtower' = 'common';
  glowLevel: 'low' | 'medium' | 'high' = 'medium';
  rainEnabled = false;
  readingNook: ReadingNookContent | null = null;
  private readonly lessonIntervalMs = 30 * 60 * 1000;
  private readonly letterIntervalMs = 60 * 60 * 1000;
  private readonly commerceIntervalMs = 24 * 60 * 60 * 1000;
  private lessonTimerId: ReturnType<typeof setInterval> | null = null;
  private lessonTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private letterTimerId: ReturnType<typeof setInterval> | null = null;
  private letterTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private commerceTimerId: ReturnType<typeof setInterval> | null = null;
  private commerceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  overviewLoading = false;
  overviewError = '';
  revenueLoading = false;
  revenueError = '';
  revenueSummary: RevenueSummaryView | null = null;
  revenueHistory: RevenueHistoryRowView[] = [];
  revenueCurrentYear: number | null = null;
  ledgerSort = { column: 'revenue' as LedgerSortColumn, direction: 'desc' as SortDirection };
  readonly revenueDays = 30;
  readonly revenueYears = 10;
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
  private readonly houseRoster: HouseInfo[] = [
    {
      key: 'gryffindor',
      name: 'Gryffindor',
      mascot: 'Lion',
      accent: '#a43b30',
    },
    {
      key: 'slytherin',
      name: 'Slytherin',
      mascot: 'Snake',
      accent: '#1f6b4a',
    },
    {
      key: 'ravenclaw',
      name: 'Ravenclaw',
      mascot: 'Eagle',
      accent: '#2a5a88',
    },
    {
      key: 'hufflepuff',
      name: 'Hufflepuff',
      mascot: 'Badger',
      accent: '#c79a2e',
    },
  ];
  private readonly professorPool = [
    'Professor McGonagall',
    'Professor Snape',
    'Professor Flitwick',
    'Professor Sprout',
    'Professor Hooch',
    'Professor Lupin',
    'Professor Moody',
    'Professor Slughorn',
  ];
  private readonly pointReasons = [
    'quick thinking in Charms class',
    'steady work in Potions',
    'helping a first-year with a levitation charm',
    'calm leadership during a corridor mix-up',
    'recovering a lost owl in the Owlery',
    'clean spellwork during Defense practice',
    'protecting the library from a spill',
    'bravery during a staircase shift',
    'perfect Herbology notes shared with the class',
    'repairing a broken wand case',
    'organizing the common room study rota',
    'spotting a cursed quill before it caused harm',
    'finding a missing textbook in the stacks',
    'leading a peer tutoring circle',
    'staying late to help clean the Great Hall',
    'warning the prefects about a loose staircase',
    'inventing a clever potion substitute',
    'quietly resolving a dormitory dispute',
    'rescuing a student from a Vanishing Step',
    'tracking a stray Kneazle back to its owner',
    'perfect attendance for the week',
    'transfiguration practice that saved a lesson',
    'patience with a struggling classmate',
    'brave answer in Defense Against the Dark Arts',
    'excellent care of a Mandrake seedling',
    'returning a lost wand to the owner',
    'calming a panicked first-year before class',
    'volunteering to carry supplies in a storm',
    'wizard chess strategy that saved the house match',
    'writing a helpful summary for the notice board',
    'finding a safe route during a stair shuffle',
    'assisting Hagrid with a creature check',
    'conjuring a warming charm for the infirmary',
    'fixing a broken quill for a classmate',
    'guiding visitors through the castle calmly',
    'organizing the Quidditch practice roster',
    'standing up for a student being teased',
    'preparing a study guide for OWLs',
    'spotting an error in a spellbook index',
    'showing honesty during a tricky experiment',
  ];
  private readonly bludgerMoments = [
    'deflected a Bludger away from the seeker at {minute} min',
    'forced a turnover against {target} chasers at {minute} min',
    'shattered {target} formation with a heavy hit at {minute} min',
    'sent a warning shot that rattled the {target} keeper at {minute} min',
    'cleared the lane with a Bludger drive at {target} at {minute} min',
  ];
  private readonly housePlayers: Record<HouseKey, string[]> = {
    gryffindor: [
      'Harry Potter',
      'Ron Weasley',
      'Hermione Granger',
      'Ginny Weasley',
      'Neville Longbottom',
      'Fred Weasley',
      'George Weasley',
      'Angelina Johnson',
      'Alicia Spinnet',
      'Katie Bell',
      'Oliver Wood',
      'Dean Thomas',
      'Seamus Finnigan',
      'Parvati Patil',
      'Cormac McLaggen',
    ],
    slytherin: [
      'Draco Malfoy',
      'Pansy Parkinson',
      'Blaise Zabini',
      'Theodore Nott',
      'Daphne Greengrass',
      'Millicent Bulstrode',
      'Gregory Goyle',
      'Vincent Crabbe',
      'Marcus Flint',
      'Terence Higgs',
      'Adrian Pucey',
      'Miles Bletchley',
      'Graham Montague',
      'Cassius Warrington',
      'Urquhart',
    ],
    ravenclaw: [
      'Luna Lovegood',
      'Cho Chang',
      'Padma Patil',
      'Michael Corner',
      'Terry Boot',
      'Anthony Goldstein',
      'Penelope Clearwater',
      'Roger Davies',
      'Marietta Edgecombe',
      'Su Li',
      'Stewart Ackerley',
      'Grant Page',
      'Randolph Burrows',
      'Jason Samuels',
      'Duncan Inglebee',
    ],
    hufflepuff: [
      'Cedric Diggory',
      'Hannah Abbott',
      'Susan Bones',
      'Ernie Macmillan',
      'Justin Finch-Fletchley',
      'Zacharias Smith',
      'Nymphadora Tonks',
      'Megan Jones',
      'Eleanor Branstone',
      'Owen Cauldwell',
      'Laura Madley',
      'Kevin Whitby',
      "Maxine O'Flaherty",
      'Herbert Fleet',
      'Ritchie Coote',
    ],
  };
  private readonly houseSeekers: Record<HouseKey, string[]> = {
    gryffindor: ['Harry Potter', 'Ginny Weasley'],
    slytherin: ['Draco Malfoy', 'Terence Higgs'],
    ravenclaw: ['Cho Chang', 'Roger Davies'],
    hufflepuff: ['Cedric Diggory', 'Ritchie Coote'],
  };
  private readonly houseKeepers: Record<HouseKey, string[]> = {
    gryffindor: ['Oliver Wood', 'Ron Weasley', 'Cormac McLaggen'],
    slytherin: ['Miles Bletchley', 'Urquhart'],
    ravenclaw: ['Grant Page', 'Jason Samuels'],
    hufflepuff: ['Herbert Fleet', 'Owen Cauldwell'],
  };
  private readonly houseBeaters: Record<HouseKey, string[]> = {
    gryffindor: ['Fred Weasley', 'George Weasley'],
    slytherin: ['Vincent Crabbe', 'Gregory Goyle'],
    ravenclaw: ['Randolph Burrows', 'Duncan Inglebee'],
    hufflepuff: ["Maxine O'Flaherty", 'Kevin Whitby'],
  };
  private readonly houseChasers: Record<HouseKey, string[]> = {
    gryffindor: [
      'Angelina Johnson',
      'Alicia Spinnet',
      'Katie Bell',
      'Dean Thomas',
      'Seamus Finnigan',
    ],
    slytherin: [
      'Marcus Flint',
      'Adrian Pucey',
      'Graham Montague',
      'Cassius Warrington',
      'Blaise Zabini',
    ],
    ravenclaw: [
      'Michael Corner',
      'Terry Boot',
      'Anthony Goldstein',
      'Padma Patil',
      'Su Li',
    ],
    hufflepuff: [
      'Hannah Abbott',
      'Susan Bones',
      'Ernie Macmillan',
      'Justin Finch-Fletchley',
      'Zacharias Smith',
    ],
  };
  statusCards: StatusCardView[] = this.statusCardConfig.map((card) =>
    this.buildStatusCardView(card)
  );
  stuckOrders: StuckOrderView[] = [];
  providers: ProviderView[] = [];
  housePoints: HousePointsView[] = [];
  dailyMatch: QuidditchMatch | null = null;
  dailyPointAwards: PointAward[] = [];
  dailyBludgerHits: BludgerHit[] = [];
  private dailyTimerId: ReturnType<typeof setTimeout> | null = null;
  readonly trivia = HOGWARTS_STORIES;
  readonly loreArticles = HOGWARTS_ARTICLES;
  readonly commerceLessons = HOGWARTS_COMMERCE_LESSONS;
  readonly letters: HogwartsLetter[] = HOGWARTS_LETTERS;
  triviaIndex = 0;
  lessonIndex = 0;
  letterIndex = 0;
  commerceIndex = 0;
  uploadFile: File | null = null;
  loading = false;
  statusMessage = '';
  statusType: 'success' | 'error' | '' = '';
  lastCount: number | null = null;
  lastPath: string | null = null;
  lastModified: number | null = null;
  lastSizeBytes: number | null = null;
  szakalLoading = false;
  szakalFilesLoading = false;
  szakalStatusLoading = false;
  szakalStatusMessage = '';
  szakalStatusType: 'success' | 'error' | '' = '';
  szakalFiles: SzakalFilesSummary | null = null;
  szakalStatus: SzakalStatusSummary | null = null;
  manufacturers: Manufacture[] = [];
  manufacturerFilter = '';
  selectedManufacturer: Manufacture | null = null;
  selectedBrandId = '';
  brandMappingLoading = false;
  brandMappingMessage = '';
  brandMappingType: 'success' | 'error' | '' = '';
  manufacturerDropdownOpen = false;
  mappingList: TecDocBrandMapping[] = [];
  mappingListFilter = '';
  mappingModalOpen = false;
  mappingListLoading = false;

  constructor(
    private febiPriceAdminService: FebiPriceAdminService,
    private hogwartsAdminService: HogwartsAdminService,
    private manufactureService: ManufactureService,
    private snackbarService: SnackbarService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.refreshDailyHogwarts();
    this.scheduleDailyRefresh();
    this.loadMeta();
    this.loadOverview();
    this.loadRevenue();
    this.refreshSzakalFiles();
    this.refreshSzakalStatus();
    this.loadManufacturers();
    this.setInitialLessonIndex();
    this.setInitialLetterIndex();
    this.setInitialCommerceIndex();
    this.startLessonRotation();
    this.startLetterRotation();
    this.startCommerceRotation();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.lessonTimerId) {
      clearInterval(this.lessonTimerId);
    }
    if (this.lessonTimeoutId) {
      clearTimeout(this.lessonTimeoutId);
    }
    if (this.letterTimerId) {
      clearInterval(this.letterTimerId);
    }
    if (this.letterTimeoutId) {
      clearTimeout(this.letterTimeoutId);
    }
    if (this.commerceTimerId) {
      clearInterval(this.commerceTimerId);
    }
    if (this.commerceTimeoutId) {
      clearTimeout(this.commerceTimeoutId);
    }
    if (this.dailyTimerId) {
      clearTimeout(this.dailyTimerId);
    }
  }

  get pageClasses(): string[] {
    const classes = [`tab-${this.activeTab}`, `glow-${this.glowLevel}`];
    if (this.rainEnabled) {
      classes.push('rain-on');
    }
    return classes;
  }

  get activeTrivia() {
    return this.trivia[this.triviaIndex] ?? this.trivia[0];
  }

  get activeLesson() {
    return this.loreArticles[this.lessonIndex] ?? this.loreArticles[0];
  }

  get activeLetter() {
    return this.letters[this.letterIndex] ?? this.letters[0];
  }

  get activeCommerceLesson() {
    return this.commerceLessons[this.commerceIndex] ?? this.commerceLessons[0];
  }

  get revenueHistorySorted(): RevenueHistoryRowView[] {
    const direction = this.ledgerSort.direction === 'desc' ? -1 : 1;
    const rows = [...this.revenueHistory];
    const numeric = (value: number | null | undefined) => {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return this.ledgerSort.direction === 'desc'
          ? Number.NEGATIVE_INFINITY
          : Number.POSITIVE_INFINITY;
      }
      return value;
    };

    rows.sort((a, b) => {
      const aValue = this.ledgerSortValue(a, numeric);
      const bValue = this.ledgerSortValue(b, numeric);
      if (aValue === bValue) {
        return (b.year - a.year) * direction;
      }
      return (aValue - bValue) * direction;
    });

    return rows;
  }

  setActiveTab(tab: 'common' | 'watchtower'): void {
    this.activeTab = tab;
    this.refreshUi();
  }

  setGlow(level: 'low' | 'medium' | 'high'): void {
    this.glowLevel = level;
    this.refreshUi();
  }

  toggleRain(): void {
    this.rainEnabled = !this.rainEnabled;
    this.refreshUi();
  }

  nextTrivia(): void {
    this.rotateTrivia();
    this.refreshUi();
  }

  nextLesson(): void {
    this.rotateLesson();
    this.refreshUi();
  }

  nextLetter(): void {
    this.rotateLetter();
    this.refreshUi();
  }

  nextCommerceLesson(): void {
    this.rotateCommerceLesson();
    this.refreshUi();
  }

  openStoryNook(): void {
    const story = this.activeTrivia;
    if (!story) {
      return;
    }
    this.readingNook = {
      title: story.title,
      body: story.body,
      tag: 'Story',
      source: 'Daily Prophet',
    };
  }

  openLessonNook(): void {
    const lesson = this.activeLesson;
    if (!lesson) {
      return;
    }
    this.readingNook = {
      title: lesson.title,
      subtitle: lesson.subtitle,
      body: lesson.body,
      tag: lesson.tag ?? 'Lesson',
      source: 'Common Room Library',
    };
  }

  openLetterNook(): void {
    const letter = this.activeLetter;
    if (!letter) {
      return;
    }
    this.readingNook = {
      title: letter.title,
      body: letter.body,
      tag: 'Owl Post',
      source: letter.from,
    };
  }

  openCommerceNook(): void {
    const lesson = this.activeCommerceLesson;
    if (!lesson) {
      return;
    }
    this.readingNook = {
      title: lesson.title,
      subtitle: lesson.subtitle,
      body: lesson.body,
      tag: lesson.tag ?? 'Commerce Lesson',
      source: 'Professor of Commerce',
    };
  }

  closeReadingNook(): void {
    this.readingNook = null;
  }

  private setInitialLessonIndex(): void {
    if (!this.loreArticles.length) {
      this.lessonIndex = 0;
      return;
    }
    const slot = Math.floor(Date.now() / this.lessonIntervalMs);
    this.lessonIndex = (slot + 5) % this.loreArticles.length;
  }

  private setInitialLetterIndex(): void {
    if (!this.letters.length) {
      this.letterIndex = 0;
      return;
    }
    const slot = Math.floor(Date.now() / this.letterIntervalMs);
    this.letterIndex = slot % this.letters.length;
  }

  private setInitialCommerceIndex(): void {
    if (!this.commerceLessons.length) {
      this.commerceIndex = 0;
      return;
    }
    const slot = Math.floor(Date.now() / this.commerceIntervalMs);
    this.commerceIndex = slot % this.commerceLessons.length;
  }

  private startLessonRotation(): void {
    const now = Date.now();
    const msUntilNext =
      this.lessonIntervalMs - (now % this.lessonIntervalMs);
    this.lessonTimeoutId = setTimeout(() => {
      this.rotateLesson();
      this.lessonTimerId = setInterval(() => {
        this.rotateLesson();
      }, this.lessonIntervalMs);
    }, msUntilNext);
  }

  private startLetterRotation(): void {
    const now = Date.now();
    const msUntilNext = this.letterIntervalMs - (now % this.letterIntervalMs);
    this.letterTimeoutId = setTimeout(() => {
      this.rotateLetter();
      this.letterTimerId = setInterval(() => {
        this.rotateLetter();
      }, this.letterIntervalMs);
    }, msUntilNext);
  }

  private startCommerceRotation(): void {
    const now = Date.now();
    const msUntilNext =
      this.commerceIntervalMs - (now % this.commerceIntervalMs);
    this.commerceTimeoutId = setTimeout(() => {
      this.rotateCommerceLesson();
      this.commerceTimerId = setInterval(() => {
        this.rotateCommerceLesson();
      }, this.commerceIntervalMs);
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

  private rotateLetter(): void {
    if (!this.letters.length) {
      return;
    }
    this.letterIndex = (this.letterIndex + 1) % this.letters.length;
  }

  private rotateCommerceLesson(): void {
    if (!this.commerceLessons.length) {
      return;
    }
    this.commerceIndex = (this.commerceIndex + 1) % this.commerceLessons.length;
  }

  private scheduleDailyRefresh(): void {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const msUntilNext = Math.max(0, next.getTime() - now.getTime());
    if (this.dailyTimerId) {
      clearTimeout(this.dailyTimerId);
    }
    this.dailyTimerId = setTimeout(() => {
      this.refreshDailyHogwarts();
      this.scheduleDailyRefresh();
    }, msUntilNext + 1000);
  }

  private refreshDailyHogwarts(): void {
    const dayKey = this.getDayKey();
    const rng = this.createRng(this.hashSeed(dayKey));
    this.housePoints = this.buildHousePoints(rng);
    this.dailyMatch = this.buildDailyMatch(rng);
    this.dailyBludgerHits = this.dailyMatch
      ? this.buildBludgerHits(rng, this.dailyMatch)
      : [];
    this.dailyPointAwards = this.buildPointAwards(rng);
    this.triviaIndex = this.pickDailyTriviaIndex(dayKey);
    this.today = new Date();
    this.refreshUi();
  }

  private buildHousePoints(rng: () => number): HousePointsView[] {
    const shuffled = this.pickDistinct(
      rng,
      this.houseRoster,
      this.houseRoster.length
    );
    const points = shuffled.map(
      () => 220 + this.randInt(rng, 0, 28) * 5
    );
    const maxPoints = Math.max(...points);
    return shuffled.map((house, index) => {
      const score = points[index] ?? 0;
      const progress =
        maxPoints > 0 ? Math.round((score / maxPoints) * 100) : 0;
      return {
        ...house,
        points: score,
        progress,
      };
    });
  }

  private buildDailyMatch(rng: () => number): QuidditchMatch {
    const [home, away] = this.pickDistinct(rng, this.houseRoster, 2);
    const homeGoals = this.randInt(rng, 7, 22);
    const awayGoals = this.randInt(rng, 6, 21);
    const snitchHome = rng() > 0.45;
    const homeLineup = this.buildLineup(home, rng);
    const awayLineup = this.buildLineup(away, rng);
    let homeScore = homeGoals * 10 + (snitchHome ? 150 : 0);
    let awayScore = awayGoals * 10 + (!snitchHome ? 150 : 0);
    if (homeScore === awayScore) {
      if (snitchHome) {
        awayScore += 10;
      } else {
        homeScore += 10;
      }
    }
    const winner = homeScore > awayScore ? home : away;
    const homeSeeker = homeLineup.lineup.seeker;
    const awaySeeker = awayLineup.lineup.seeker;
    const winningSeeker = winner.key === home.key ? homeSeeker : awaySeeker;
    const minute = this.randInt(rng, 14, 78);
    const summary = `${winningSeeker} caught the Snitch at ${minute} min for ${winner.name}.`;

    return {
      dayKey: this.getDayKey(),
      home: {
        house: home,
        score: homeScore,
        goals: homeGoals,
        snitch: snitchHome,
        seeker: homeSeeker,
        lineup: homeLineup.lineup,
        substitutes: homeLineup.substitutes,
      },
      away: {
        house: away,
        score: awayScore,
        goals: awayGoals,
        snitch: !snitchHome,
        seeker: awaySeeker,
        lineup: awayLineup.lineup,
        substitutes: awayLineup.substitutes,
      },
      winner,
      summary,
    };
  }

  private buildLineup(
    house: HouseInfo,
    rng: () => number
  ): { lineup: QuidditchLineup; substitutes: string[] } {
    const seeker = this.pick(rng, this.houseSeekers[house.key]);
    const keeper = this.pick(rng, this.houseKeepers[house.key]);
    const beaters = this.pickDistinct(rng, this.houseBeaters[house.key], 2);
    const chasers = this.pickDistinct(rng, this.houseChasers[house.key], 3);
    const lineupNames = [seeker, keeper, ...beaters, ...chasers];
    const substitutesPool = this.housePlayers[house.key].filter(
      (name) => !lineupNames.includes(name)
    );
    const subCount = Math.min(
      this.randInt(rng, 2, 4),
      substitutesPool.length
    );
    const substitutes =
      subCount > 0 ? this.pickDistinct(rng, substitutesPool, subCount) : [];

    return {
      lineup: {
        seeker,
        keeper,
        beaters,
        chasers,
      },
      substitutes,
    };
  }

  private buildPointAwards(rng: () => number): PointAward[] {
    const count = 5;
    const awards: PointAward[] = [];
    for (let i = 0; i < count; i += 1) {
      const house = this.pick(rng, this.houseRoster);
      const by = this.pick(rng, this.professorPool);
      const student = this.pick(rng, this.housePlayers[house.key]);
      const points = this.randInt(rng, 1, 6) * 5 + 5;
      const reason = this.pick(rng, this.pointReasons);
      awards.push({
        by,
        house: house.name,
        accent: house.accent,
        points,
        detail: `${student} for ${reason}.`,
      });
    }
    return awards;
  }

  private buildBludgerHits(
    rng: () => number,
    match: QuidditchMatch
  ): BludgerHit[] {
    const count = 2 + this.randInt(rng, 0, 1);
    const hits: BludgerHit[] = [];
    const home = match.home.house;
    const away = match.away.house;
    const homeBeaters = match.home.lineup.beaters;
    const awayBeaters = match.away.lineup.beaters;

    for (let i = 0; i < count; i += 1) {
      const attacker = rng() > 0.5 ? home : away;
      const target = attacker.key === home.key ? away : home;
      const beaters =
        attacker.key === home.key ? homeBeaters : awayBeaters;
      const by = this.pick(rng, beaters);
      const moment = this.pick(rng, this.bludgerMoments);
      const minute = this.randInt(rng, 6, 72);
      hits.push({
        by,
        house: attacker.name,
        accent: attacker.accent,
        detail: this.formatTemplate(moment, {
          target: target.name,
          minute: minute.toString(),
        }),
      });
    }
    return hits;
  }

  private pickDailyTriviaIndex(dayKey: string): number {
    if (!this.trivia.length) {
      return 0;
    }
    const seed = this.hashSeed(`${dayKey}-story`);
    const rng = this.createRng(seed);
    return this.randInt(rng, 0, this.trivia.length - 1);
  }

  private getDayKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private hashSeed(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private createRng(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private randInt(rng: () => number, min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  private pick<T>(rng: () => number, values: T[]): T {
    const index = this.randInt(rng, 0, values.length - 1);
    return values[index];
  }

  private pickDistinct<T>(rng: () => number, values: T[], count: number): T[] {
    const pool = [...values];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = this.randInt(rng, 0, i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(count, pool.length));
  }

  private formatTemplate(
    template: string,
    values: Record<string, string>
  ): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
  }

  private refreshUi(): void {
    if (this.destroyed) {
      return;
    }
    this.ngZone.run(() => {
      Promise.resolve().then(() => {
        if (this.destroyed) {
          return;
        }
        this.cdr.detectChanges();
      });
    });
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

  private loadRevenue(): void {
    this.revenueLoading = true;
    this.revenueError = '';
    this.hogwartsAdminService
      .fetchRevenueOverview(this.revenueDays, this.revenueYears)
      .pipe(finalize(() => (this.revenueLoading = false)))
      .subscribe({
        next: (overview) => this.applyRevenueOverview(overview),
        error: () => {
          this.revenueError = 'Revenue metrics are currently unavailable.';
          this.revenueSummary = null;
          this.revenueHistory = [];
        },
      });
  }

  private applyRevenueOverview(overview: HogwartsRevenueOverviewResponse): void {
    const current = overview?.current;
    const history = overview?.history ?? [];
    this.revenueSummary = current ? this.mapRevenueSummary(current) : null;
    this.revenueCurrentYear =
      overview?.currentTo ? new Date(overview.currentTo).getFullYear() : null;
    this.revenueHistory = history.map((row) => this.mapRevenueHistoryRow(row));
    this.ledgerSort = { column: 'revenue', direction: 'desc' };
  }

  sortLedger(column: LedgerSortColumn): void {
    if (this.ledgerSort.column === column) {
      this.ledgerSort = {
        column,
        direction: this.ledgerSort.direction === 'desc' ? 'asc' : 'desc',
      };
      return;
    }
    this.ledgerSort = { column, direction: 'desc' };
  }

  private ledgerSortValue(
    row: RevenueHistoryRowView,
    numeric: (value: number | null | undefined) => number
  ): number {
    switch (this.ledgerSort.column) {
      case 'year':
        return row.year;
      case 'orders':
        return row.orders;
      case 'revenue':
        return numeric(row.revenueValue);
      case 'aov':
        return numeric(row.aovValue);
      case 'activePartners':
        return row.activePartners;
      case 'ordersPerPartner':
        return numeric(row.ordersPerPartnerValue);
      default:
        return 0;
    }
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
    const oldestLabel = this.formatDurationShort(snapshot?.oldestMinutes ?? null);
    const p95Label = this.formatDurationShort(snapshot?.p95Minutes ?? null);

    return {
      ...config,
      count: snapshot?.count ?? 0,
      oldestMinutes: snapshot?.oldestMinutes ?? null,
      p95Minutes: snapshot?.p95Minutes ?? null,
      oldestLabel,
      p95Label,
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
      const ageLabel = this.formatDurationShort(ageMinutes);
      const customer =
        row.partnerName?.trim() ||
        (row.ppid !== null && row.ppid !== undefined
          ? `Partner #${row.ppid}`
          : 'Nepoznat partner');

      return {
        id: this.formatOrderId(row),
        status: statusKey,
        ageMinutes,
        ageLabel,
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

  private mapRevenueSummary(metrics: HogwartsRevenueMetrics): RevenueSummaryView {
    return {
      orders: metrics.orders ?? 0,
      revenue: this.formatTotal(metrics.revenue),
      aov: this.formatMoney(metrics.aov),
      activePartners: metrics.activePartners ?? 0,
      ordersPerPartner: this.formatRatio(metrics.ordersPerActivePartner),
    };
  }

  private mapRevenueHistoryRow(row: HogwartsRevenuePeriodRow): RevenueHistoryRowView {
    const revenueValue = row.metrics?.revenue ?? 0;
    const aovValue = row.metrics?.aov ?? null;
    const ordersPerPartnerValue = row.metrics?.ordersPerActivePartner ?? null;

    return {
      year: row.year,
      orders: row.metrics?.orders ?? 0,
      revenueValue,
      revenue: this.formatTotal(revenueValue),
      aovValue,
      aov: this.formatMoney(aovValue),
      activePartners: row.metrics?.activePartners ?? 0,
      ordersPerPartnerValue,
      ordersPerPartner: this.formatRatio(ordersPerPartnerValue),
    };
  }

  private formatAge(minutes: number | null | undefined): string {
    const duration = this.formatDurationShort(minutes);
    return duration === '--' ? '--' : `${duration} ago`;
  }

  private formatDurationShort(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined) {
      return '--';
    }
    const totalMinutes = Math.max(0, Math.floor(minutes));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    if (days > 0) {
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
    if (totalMinutes > 0 && hours === 0) {
      return '<1h';
    }
    return `${hours}h`;
  }

  private formatMoney(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '--';
    }
    const formatted = new Intl.NumberFormat('sr-RS', {
      maximumFractionDigits: 0,
    }).format(value);
    return `${formatted} RSD`;
  }

  private formatRatio(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '--';
    }
    return value.toFixed(2);
  }

  private formatAgeFromTimestamp(timestamp: number | null | undefined): string {
    if (!timestamp) {
      return '--';
    }
    const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    const duration = this.formatDurationShort(diffMinutes);
    return duration === '--' ? '--' : `${duration} ago`;
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

  refreshSzakalFiles(): void {
    if (this.szakalFilesLoading) {
      return;
    }
    this.szakalFilesLoading = true;
    this.hogwartsAdminService
      .fetchSzakalFiles()
      .pipe(finalize(() => (this.szakalFilesLoading = false)))
      .subscribe({
        next: (files: SzakalFilesSummary) => {
          this.szakalFiles = files;
          this.refreshUi();
        },
        error: (err) => this.handleSzakalError(err),
      });
  }

  refreshSzakalStatus(): void {
    if (this.szakalStatusLoading) {
      return;
    }
    this.szakalStatusLoading = true;
    this.hogwartsAdminService
      .fetchSzakalStatus()
      .pipe(finalize(() => (this.szakalStatusLoading = false)))
      .subscribe({
        next: (status: SzakalStatusSummary) => {
          this.szakalStatus = status;
          this.refreshUi();
        },
        error: (err) => this.handleSzakalError(err),
      });
  }

  importSzakalMaster(): void {
    this.runSzakalAction(
      this.hogwartsAdminService.importSzakalMaster(),
      'Master import completed'
    );
  }

  importSzakalPricelists(): void {
    this.runSzakalAction(
      this.hogwartsAdminService.importSzakalPricelists(),
      'Pricelists import completed'
    );
  }

  importSzakalAll(): void {
    this.runSzakalAction(
      this.hogwartsAdminService.importSzakalAll(),
      'Full import completed'
    );
  }

  importSzakalBarcodes(): void {
    if (this.szakalLoading) {
      return;
    }
    this.szakalLoading = true;
    this.hogwartsAdminService
      .importSzakalBarcodes()
      .pipe(finalize(() => (this.szakalLoading = false)))
      .subscribe({
        next: (result: SzakalImportResult) => {
          const rows = result?.rows ?? 0;
          this.setSzakalStatus(`Barcodes updated: ${rows}`, 'success');
          this.snackbarService.showSuccess('Barcode import completed');
          this.refreshSzakalStatus();
        },
        error: (err) => this.handleSzakalError(err),
      });
  }

  importSzakalOeLinks(): void {
    if (this.szakalLoading) {
      return;
    }
    this.szakalLoading = true;
    this.hogwartsAdminService
      .importSzakalOeLinks()
      .pipe(finalize(() => (this.szakalLoading = false)))
      .subscribe({
        next: (result: SzakalImportResult) => {
          const rows = result?.rows ?? 0;
          this.setSzakalStatus(`OE links updated: ${rows}`, 'success');
          this.snackbarService.showSuccess('OE links import completed');
          this.refreshSzakalStatus();
        },
        error: (err) => this.handleSzakalError(err),
      });
  }

  private runSzakalAction(action: Observable<SzakalImportSummary>, message: string): void {
    if (this.szakalLoading) {
      return;
    }
    this.szakalLoading = true;
    action
      .pipe(finalize(() => (this.szakalLoading = false)))
      .subscribe({
        next: (summary) => {
          this.setSzakalStatus(
            `${message}${this.formatSzakalImportSummary(summary)}`,
            'success'
          );
          this.snackbarService.showSuccess(message);
          this.refreshSzakalStatus();
        },
        error: (err) => this.handleSzakalError(err),
      });
  }

  private formatSzakalImportSummary(summary: SzakalImportSummary | null): string {
    if (!summary) {
      return '';
    }
    const masterRows =
      summary.master && typeof summary.master.rows === 'number'
        ? summary.master.rows
        : null;
    const priceRows =
      summary.priceLists && summary.priceLists.length
        ? summary.priceLists
            .map((entry) => {
              const listMatch = entry?.file?.match(/pricelist_([0-3])/i);
              const listNo = listMatch ? listMatch[1] : '?';
              return `PL${listNo}: ${entry?.rows ?? 0}`;
            })
            .join(', ')
        : null;

    const parts: string[] = [];
    if (masterRows !== null) {
      parts.push(`Master: ${masterRows}`);
    }
    if (priceRows) {
      parts.push(`Pricelists: ${priceRows}`);
    }
    return parts.length ? ` (${parts.join(' | ')})` : '';
  }

  private handleSzakalError(error: any): void {
    const message =
      error?.error?.message ||
      error?.message ||
      'Szakal request failed.';
    this.setSzakalStatus(message, 'error');
    this.snackbarService.showError(message);
  }

  private setSzakalStatus(message: string, type: 'success' | 'error'): void {
    this.szakalStatusMessage = message;
    this.szakalStatusType = type;
  }

  get filteredManufacturers(): Manufacture[] {
    const filter = this.manufacturerFilter.trim().toLowerCase();
    if (!this.manufacturers.length) {
      return [];
    }
    const results = filter
      ? this.manufacturers.filter((m) => {
          const name = (m?.naziv || '').toLowerCase();
          const proid = (m?.proid || '').toLowerCase();
          return name.includes(filter) || proid.includes(filter);
        })
      : this.manufacturers;
    return results.slice(0, 200);
  }

  onManufacturerFilter(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.manufacturerFilter = input?.value ?? '';
    this.manufacturerDropdownOpen = true;
    this.refreshUi();
  }

  onManufacturerFocus(): void {
    this.manufacturerDropdownOpen = true;
  }

  onManufacturerBlur(): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.manufacturerDropdownOpen = false;
        this.refreshUi();
      }, 150);
    });
  }

  onManufacturerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }
    const value = this.manufacturerFilter.trim().toLowerCase();
    if (!value) {
      return;
    }
    const match =
      this.manufacturers.find((m) => (m?.proid || '').toLowerCase() === value) ||
      this.manufacturers.find((m) => (m?.naziv || '').toLowerCase() === value);
    if (match) {
      this.selectManufacturer(match);
    }
  }

  onManufacturerSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const proid = select?.value?.trim();
    const match =
      this.manufacturers.find((m) => m?.proid === proid) || null;
    if (match) {
      this.selectManufacturer(match);
    }
  }

  selectManufacturer(manufacturer: Manufacture): void {
    this.selectedManufacturer = manufacturer;
    this.manufacturerFilter = manufacturer?.proid
      ? `${manufacturer.proid} - ${manufacturer.naziv ?? ''}`.trim()
      : '';
    this.manufacturerDropdownOpen = false;
    this.loadBrandMapping();
    this.refreshUi();
  }

  onBrandIdInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedBrandId = input?.value ?? '';
  }

  saveBrandMapping(): void {
    if (!this.selectedManufacturer?.proid) {
      this.setBrandMappingStatus('Select manufacturer first.', 'error');
      return;
    }
    const brandId = Number(this.selectedBrandId);
    if (!Number.isFinite(brandId) || brandId <= 0) {
      this.setBrandMappingStatus('BrandId must be a positive number.', 'error');
      return;
    }
    this.brandMappingLoading = true;
    this.hogwartsAdminService
      .upsertTecdocBrandMapping(this.selectedManufacturer.proid, brandId)
      .pipe(finalize(() => (this.brandMappingLoading = false)))
      .subscribe({
        next: (mapping) => {
          this.selectedBrandId = mapping?.brandId?.toString() ?? '';
          this.setBrandMappingStatus('Mapping saved.', 'success');
          this.refreshBrandMappings();
        },
        error: (err) => this.handleBrandMappingError(err),
      });
  }

  deleteBrandMapping(): void {
    if (!this.selectedManufacturer?.proid) {
      this.setBrandMappingStatus('Select manufacturer first.', 'error');
      return;
    }
    this.brandMappingLoading = true;
    this.hogwartsAdminService
      .deleteTecdocBrandMapping(this.selectedManufacturer.proid)
      .pipe(finalize(() => (this.brandMappingLoading = false)))
      .subscribe({
        next: () => {
          this.selectedBrandId = '';
          this.setBrandMappingStatus('Mapping deleted.', 'success');
          this.refreshBrandMappings();
        },
        error: (err) => this.handleBrandMappingError(err),
      });
  }

  private loadManufacturers(): void {
    this.manufactureService.getAll().subscribe({
      next: (manufacturers) => {
        this.manufacturers = manufacturers || [];
        this.refreshUi();
      },
      error: () => {
        this.manufacturers = [];
      },
    });
  }

  private loadBrandMapping(): void {
    const proid = this.selectedManufacturer?.proid;
    if (!proid) {
      this.selectedBrandId = '';
      return;
    }
    this.brandMappingLoading = true;
    this.hogwartsAdminService
      .fetchTecdocBrandMapping(proid)
      .pipe(finalize(() => (this.brandMappingLoading = false)))
      .subscribe({
        next: (mapping: TecDocBrandMapping) => {
          this.selectedBrandId = mapping?.brandId?.toString() ?? '';
          this.refreshUi();
        },
        error: () => {
          this.selectedBrandId = '';
        },
      });
  }

  private handleBrandMappingError(error: any): void {
    const message =
      error?.error?.message ||
      error?.message ||
      'Brand mapping failed.';
    this.setBrandMappingStatus(message, 'error');
  }

  private setBrandMappingStatus(message: string, type: 'success' | 'error'): void {
    this.brandMappingMessage = message;
    this.brandMappingType = type;
  }

  openMappingModal(): void {
    this.mappingModalOpen = true;
    this.refreshBrandMappings();
  }

  closeMappingModal(): void {
    this.mappingModalOpen = false;
  }

  refreshBrandMappings(): void {
    if (!this.mappingModalOpen && !this.mappingList.length) {
      return;
    }
    this.mappingListLoading = true;
    this.hogwartsAdminService
      .fetchTecdocBrandMappings()
      .pipe(finalize(() => (this.mappingListLoading = false)))
      .subscribe({
        next: (list) => {
          this.mappingList = list || [];
          this.refreshUi();
        },
        error: () => {
          this.mappingList = [];
        },
      });
  }

  onMappingFilter(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.mappingListFilter = input?.value ?? '';
  }

  get filteredBrandMappings(): TecDocBrandMapping[] {
    const needle = this.mappingListFilter.trim().toLowerCase();
    if (!needle) {
      return this.mappingList;
    }
    return this.mappingList.filter((entry) => {
      const proid = (entry?.proid || '').toLowerCase();
      const brandId = entry?.brandId != null ? entry.brandId.toString() : '';
      const name = this.resolveManufacturerName(entry?.proid).toLowerCase();
      return proid.includes(needle) || brandId.includes(needle) || name.includes(needle);
    });
  }

  resolveManufacturerName(proid?: string | null): string {
    if (!proid) {
      return '';
    }
    const found = this.manufacturers.find((m) => m?.proid === proid);
    return found?.naziv ?? '';
  }
}
