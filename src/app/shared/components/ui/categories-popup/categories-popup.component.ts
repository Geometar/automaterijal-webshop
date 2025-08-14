// categories-popup.component.ts
import { Component, EventEmitter, Input, Output, signal, computed, inject, ViewChild, ElementRef, ViewEncapsulation, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

// Autom import
import { AutomIconComponent } from '../../autom-icon/autom-icon.component';
import { AutomTooltipDirective } from '../../autom-tooltip/autom-tooltip.directive';
import { ButtonComponent } from '../../button/button.component';
import { InputFieldsComponent } from '../../input-fields/input-fields.component';
import { PopupComponent } from '../../popup/popup.component';

// Data Models
import { ArticleCategories, SubCategories } from '../../../data-models/model/article-categories';

// Enums
import {
  ButtonThemes, ButtonTypes, ColorEnum, IconsEnum, InputTypeEnum,
  PositionEnum, SizeEnum, TooltipPositionEnum, TooltipThemeEnum, TooltipTypesEnum,
} from '../../../data-models/enums';

// Services
import { CategoriesStateService } from '../../../service/state/categories-state.service';

export type CategoryPick =
  | { kind: 'group'; groupId?: string; name?: string }
  | { kind: 'subgroup'; groupId?: string; subGroupId?: number; name?: string };

@Component({
  selector: 'categories-popup',
  standalone: true,
  imports: [
    CommonModule,
    PopupComponent,
    ButtonComponent,
    AutomTooltipDirective,
    InputFieldsComponent,
    AutomIconComponent
  ],
  templateUrl: './categories-popup.component.html',
  styleUrls: ['./categories-popup.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CategoriesPopupComponent {
  // UI
  title = 'Izaberite kategoriju';

  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() categorySelected = new EventEmitter<CategoryPick>();

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconsEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;
  tooltipPosition = TooltipPositionEnum;
  tooltipTheme = TooltipThemeEnum;
  tooltipType = TooltipTypesEnum;

  // Data/state
  private categoriesState = inject(CategoriesStateService);
  search = signal<string>('');
  selectedGroupId = signal<string | undefined>(undefined);

  categories = toSignal(this.categoriesState.getCategories$(), { initialValue: [] as ArticleCategories[] });
  loading = computed(() => !this.categories().length); // naive loading flag

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
  }

  get isMobileView(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return window.innerWidth < 991;
    }
    return false; // fallback za server-side render
  }

  // Map groupId (or name) -> icon + accent; adjust to your taxonomy codes
  private iconMap: Record<string, IconsEnum> = {
    // Filters
    FILPUT: this.iconsEnum.FILTER, FILTTE: this.iconsEnum.FILTER,
    // Elektrika
    ELEKTR: this.iconsEnum.DISC,
    // Maziva
    MOS: this.iconsEnum.DROPLET,
    // Kočioni sistemi
    KOCHIS: this.iconsEnum.DISC,
    // Transmisija
    TRIP: this.iconsEnum.SETTINGS,
    // Rashladni sistem
    RASHL: this.iconsEnum.WIND,
    // Karoserija
    KAROSE: this.iconsEnum.CAR,
    // Oprema/pribor
    ADO: this.iconsEnum.PACKAGE,
    PRI: this.iconsEnum.ALERT_CIRCLE,

    DEFAULT: this.iconsEnum.LIST
  };

  @ViewChild('groupsRef') groupsRef!: ElementRef<HTMLElement>;

  scrollGroups(dir: 1 | -1) {
    const el = this.groupsRef?.nativeElement;
    if (!el) return;
    const page = el.clientWidth * 0.9;         // skoro širina ekrana
    el.scrollBy({ left: dir * page, behavior: 'smooth' });
  }

  private accentMap: Record<string, string> = {
    FILPUT: '#2d8cf0',
    FILTTE: '#2d8cf0',
    ELEKTR: '#8a63d2',
    MOS: '#f59e0b',
    KOCHIS: '#ef4444',
    TRIP: '#10b981',
    RASHL: '#06b6d4',
    KAROSE: '#64748b',
    ADO: '#fb7185',
    PRI: '#0ea5e9',
    DEFAULT: '#ff6600'
  };

  /** Filtered groups keeping only matching subgroups */
  filtered = computed<ArticleCategories[]>(() => {
    const term = this.search().trim().toLowerCase();
    const groups = this.categories();
    if (!term) return groups;

    return groups
      .map(g => ({
        ...g,
        articleSubGroups: (g.articleSubGroups || []).filter(s => s.name?.toLowerCase().includes(term)),
      }))
      .filter(g => g.name?.toLowerCase().includes(term) || (g.articleSubGroups?.length ?? 0) > 0);
  });

  selectedGroup = computed<ArticleCategories | undefined>(() => {
    const id = this.selectedGroupId();
    return this.filtered().find(g => g.groupId === id);
  });

  /** Quick tags for popular categories (IDs or names from your taxonomy) */
  quickTags = [
    { id: 'FILPUT', label: 'Filteri (putnički)' },
    { id: 'FILTTE', label: 'Filteri (teretni)' },
    { id: 'ELEKTR', label: 'Elektrika' },
    { id: 'MOS', label: 'Maziva' },
    { id: 'KOCHIS', label: 'Kočioni sistemi' },
  ];

  // --- UI actions ---
  onSearch = (e: unknown) => {
    if (typeof e === 'string') return this.search.set(e.trim());
    if (e && typeof e === 'object') {
      const maybe = (e as any).value ?? (e as any).query ?? (e as any).term ?? '';
      return this.search.set(String(maybe).trim());
    }
    this.search.set('');
  };

  selectGroup(g: ArticleCategories): void {
    this.selectedGroupId.set(g.groupId);
  }

  useQuickTag(tagId: string): void {
    const hit = this.filtered().find(g => (g.groupId || '').toUpperCase() === tagId.toUpperCase());
    if (hit) this.selectedGroupId.set(hit.groupId);
    else this.search.set(tagId); // fallback: search by tag
  }

  pickGroup(g: ArticleCategories): void {
    this.categorySelected.emit({ kind: 'group', groupId: g.groupId, name: g.name });
    this.close.emit();
  }

  pickSub(s: SubCategories): void {
    this.categorySelected.emit({ kind: 'subgroup', groupId: s.groupId, subGroupId: s.subGroupId, name: s.name });
    this.close.emit();
  }

  reset(): void {
    this.search.set('');
    this.selectedGroupId.set(undefined);
  }

  // --- Helpers for template ---
  trackGroup = (_: number, g: ArticleCategories) => g.groupId ?? g.name ?? _;
  trackSub = (_: number, s: SubCategories) => `${s.groupId ?? 'g'}-${s.subGroupId ?? _}`;

  iconForGroup(g: ArticleCategories): IconsEnum {
    const key = (g.groupId || g.name || 'DEFAULT').toString().toUpperCase();
    return this.iconMap[key] ?? this.iconMap['DEFAULT'];
    // ^ If your IconsEnum differs, map accordingly
  }

  accentForGroup(g: ArticleCategories): string {
    const key = (g.groupId || g.name || 'DEFAULT').toString().toUpperCase();
    return this.accentMap[key] ?? this.accentMap['DEFAULT'];
  }
}