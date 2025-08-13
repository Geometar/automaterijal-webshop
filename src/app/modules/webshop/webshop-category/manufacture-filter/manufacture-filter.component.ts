import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  computed,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  PLATFORM_ID,
  signal,
  SimpleChanges
} from '@angular/core';

// Automaterijal imports
import { CheckboxComponent } from '../../../../shared/components/checkbox/checkbox.component';
import { SelectComponent } from '../../../../shared/components/select/select.component';

// Data models
import { CheckboxModel, SelectModel } from '../../../../shared/data-models/interface';

// Enums
import { OrientationEnum, SizeEnum } from '../../../../shared/data-models/enums';

@Component({
  selector: 'manufacture-filter',
  standalone: true,
  imports: [CommonModule, CheckboxComponent, SelectComponent],
  templateUrl: './manufacture-filter.component.html',
  styleUrl: './manufacture-filter.component.scss'
})
export class ManufactureFilterComponent implements OnInit, OnChanges {
  @Input() manufactures: CheckboxModel[] = [];
  @Input() selected: (string | number)[] = [];
  @Input() filterTerm = '';

  @Output() selectionChanged = new EventEmitter<(string | number)[]>();

  readonly state = signal<CheckboxModel[]>([]);

  // Enums
  readonly sizeEnum = SizeEnum;
  readonly orientationEnum = OrientationEnum;

  // Misc
  isMobile = false;
  selectReady = false;

  // Select config
  selectOptions: SelectModel[] = [];
  selectedOption: SelectModel | null = null;

  readonly _filterTerm = signal('');
  readonly filteredManufactures = computed(() => {
    const term = this._filterTerm().toLowerCase();
    return this.state().filter((item) =>
      item.value.toLowerCase().includes(term)
    );
  });

  // --- NEW: paging for desktop list ---
  readonly basePage = 18;                      // initial visible count
  readonly pageStep = 18;                      // how many to add per click
  private _visibleLimit = signal(this.basePage);
  visibleLimit = this._visibleLimit;           // expose for template

  // Selected count for badge
  selectedCount = signal<number>(0);

  // Computed list respecting filter term and visible window
  visibleItems = computed<CheckboxModel[]>(() => {
    const full = this._filterTerm().trim()
      ? this.filteredManufactures()
      : this.state();

    const limit = this._visibleLimit();
    return full.slice(0, limit);
  });

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) { }

  @HostListener('window:resize', [])
  onResize(): void {
    this.isMobile = isPlatformBrowser(this.platformId) && window.innerWidth < 991;
  }

  ngOnInit(): void {
    this.onResize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['manufactures'] || changes['selected']) {
      this.syncState();
    }
    if (changes['filterTerm']) {
      this._filterTerm.set(this.filterTerm);
    }
  }

  // --- UI helpers ---
  hasMore(): boolean {
    const total = this._filterTerm().trim()
      ? this.filteredManufactures().length
      : this.state().length;
    return this._visibleLimit() < total;
  }

  showMore(): void {
    this._visibleLimit.update(v => v + this.pageStep);
  }

  showLess(): void {
    this._visibleLimit.set(this.basePage);
  }

  selectedLabels(): string[] {
    const map = new Map(this.state().map(i => [String(i.key), i.value]));
    return (this.selected || []).map(id => map.get(String(id))!).filter(Boolean);
  }

  removeSelectedByLabel(label: string): void {
    const models = this.state().map(m =>
      m.value === label ? { ...m, checked: false } : m
    );
    this.emitChanges(models);
  }

  quickPick(label: string): void {
    const models = this.state().map(m =>
      m.value === label ? { ...m, checked: !m.checked } : m
    );
    this.emitChanges(models);
  }

  clearAll(): void {
    const cleared = this.state().map(m => ({ ...m, checked: false }));
    this.emitChanges(cleared);
    this.selectedOption = null;
  }

  // --- Core logic ---
  syncState(): void {
    const updated = this.manufactures.map((m) => ({
      ...m,
      checked: this.selected.includes(m.key!)
    }));
    this.state.set(updated);

    // Build select options
    this.selectOptions = this.manufactures.map(m => ({
      key: m.key,
      value: m.value
    }));

    // Preselect if applicable
    if (this.selected.length === 1) {
      const match = this.selectOptions.find(opt => opt.key === this.selected[0]);
      if (match) {
        this.selectedOption = match;
      }
    } else {
      this.selectedOption = null;
    }

    // Update count + reset visible window
    this.selectedCount.set(updated.filter(i => i.checked).length);
    this._visibleLimit.set(this.basePage);

    // Trigger change detection
    setTimeout(() => {
      this.selectReady = true;
      this.cdr.detectChanges();
    });
  }

  emitChanges(models: CheckboxModel[]): void {
    this.state.set(models);
    const selected = models
      .filter((m) => m.checked && m.key !== undefined)
      .map((m) => m.key as string | number);

    this.selectedCount.set(selected.length);
    this.selectionChanged.emit(selected);
  }

  onSelectChange(selected: SelectModel): void {
    this.selectedOption = selected;
    this.selectionChanged.emit(selected.key ? [selected.key] : []);
    this.selectedCount.set(selected?.key ? 1 : 0);
  }
}