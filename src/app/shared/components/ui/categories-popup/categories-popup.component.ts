// categories-popup.component.ts
import { Component, EventEmitter, Input, Output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopupComponent } from '../../popup/popup.component';
import { ButtonComponent } from '../../button/button.component';
import { AutomTooltipDirective } from '../../autom-tooltip/autom-tooltip.directive';
import { toSignal } from '@angular/core/rxjs-interop';

// Autom Import
import { InputFieldsComponent } from '../../input-fields/input-fields.component';
import { AutomIconComponent } from '../../autom-icon/autom-icon.component';
import { CategoriesStateService } from '../../../service/state/categories-state.service';

// Data models
import { ArticleCategories, SubCategories } from '../../../data-models/model';

// Enums
import {
  ButtonThemes, ButtonTypes, ColorEnum, IconsEnum, InputTypeEnum,
  PositionEnum, SizeEnum, TooltipPositionEnum, TooltipThemeEnum, TooltipTypesEnum,
} from '../../../data-models/enums';

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
  styleUrls: ['./categories-popup.component.scss'] // <- plural + array
})
export class CategoriesPopupComponent {
  title = 'Izaberite kategoriju';

  // Control from parent
  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() categorySelected = new EventEmitter<CategoryPick>();

  // Enums to template
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

  // --- Data/state ---
  private categoriesState = inject(CategoriesStateService);

  /** Local UI state signals */
  search = signal<string>('');
  expanded = signal<Set<string>>(new Set()); // expanded groupIds

  /** Load-once categories from state */
  categories = toSignal(this.categoriesState.getCategories$(), { initialValue: [] as ArticleCategories[] });

  /** Filter groups and keep children that match */
  filtered = computed<ArticleCategories[]>(() => {
    const term = this.search().trim().toLowerCase();
    const groups = this.categories();
    if (!term) return groups;

    return groups
      .map(g => ({
        ...g,
        articleSubGroups: (g.articleSubGroups || []).filter(
          s => s.name?.toLowerCase().includes(term)
        ),
      }))
      .filter(g => g.name?.toLowerCase().includes(term) || (g.articleSubGroups?.length ?? 0) > 0);
  });

  /** Toggle expand/collapse for a group row */
  toggle(groupId?: string): void {
    if (!groupId) return;
    const next = new Set(this.expanded());
    next.has(groupId) ? next.delete(groupId) : next.add(groupId);
    this.expanded.set(next);
  }

  /** Pick a group (if no children or user chooses "All in group") */
  pickGroup(g: ArticleCategories): void {
    this.categorySelected.emit({ kind: 'group', groupId: g.groupId, name: g.name });
    this.close.emit();
  }

  /** Pick a sub-group (leaf) */
  pickSub(s: SubCategories): void {
    this.categorySelected.emit({ kind: 'subgroup', groupId: s.groupId, subGroupId: s.subGroupId, name: s.name });
    this.close.emit();
  }

  /** Clear search and collapse all expanded groups */
  reset(): void {
    this.search.set('');
    this.expanded.set(new Set());
  }

  // Normalize any event shape to a string and store in signal
  onSearch = (e: unknown) => {
    // Case 1: direktan string
    if (typeof e === 'string') {
      this.search.set(e.trim());
      return;
    }

    // Case 2: objekat sa value/query/term
    if (e && typeof e === 'object') {
      const maybe = (e as any).value ?? (e as any).query ?? (e as any).term ?? '';
      this.search.set(String(maybe).trim());
      return;
    }

    // Fallback
    this.search.set('');
  };

  /** TrackBy helpers for performance */
  trackGroup = (_: number, g: ArticleCategories) => g.groupId ?? g.name ?? _;
  trackSub = (_: number, s: SubCategories) => `${s.groupId ?? 'g'}-${s.subGroupId ?? _}`;
}