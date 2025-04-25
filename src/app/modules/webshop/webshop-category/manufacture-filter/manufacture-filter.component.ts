import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, computed, EventEmitter, HostListener, Inject, Input, OnChanges, Output, PLATFORM_ID, signal, SimpleChanges } from '@angular/core';

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
export class ManufactureFilterComponent implements OnChanges {
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

  readonly filteredManufactures = computed(() => {
    const term = this._filterTerm().toLowerCase();
    return this.state().filter((item) =>
      item.value.toLowerCase().includes(term)
    );
  });

  readonly _filterTerm = signal('');

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object, private cdr: ChangeDetectorRef
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

  syncState(): void {
    const updated = this.manufactures.map((m) => ({
      ...m,
      checked: this.selected.includes(m.key!),
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
      if (match) this.selectedOption = match;
    }

    // ✅ Trigger outside change detection cycle
    setTimeout(() => {
      this.selectReady = true;
      this.cdr.detectChanges(); //
    });
  }

  emitChanges(models: CheckboxModel[]): void {
    this.state.set(models);
    const selected = models
      .filter((m) => m.checked && m.key !== undefined)
      .map((m) => m.key as string | number);
    this.selectionChanged.emit(selected);
  }

  onSelectChange(selected: SelectModel): void {
    this.selectedOption = selected;
    this.selectionChanged.emit(selected.key ? [selected.key] : []);
  }
}
