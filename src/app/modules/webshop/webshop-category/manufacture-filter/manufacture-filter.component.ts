import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';

// Automaterijal imports
import { CheckboxComponent } from '../../../../shared/components/checkbox/checkbox.component';

// Data models
import { CheckboxModel } from '../../../../shared/data-models/interface';

// Enums
import { OrientationEnum, SizeEnum } from '../../../../shared/data-models/enums';

@Component({
  selector: 'manufacture-filter',
  standalone: true,
  imports: [CommonModule, CheckboxComponent],
  templateUrl: './manufacture-filter.component.html',
  styleUrl: './manufacture-filter.component.scss'
})
export class ManufactureFilterComponent implements OnChanges {
  @Input() manufactures: CheckboxModel[] = [];
  @Input() selected: (string | number)[] = [];
  @Input() filterTerm = '';

  @Output() selectionChanged = new EventEmitter<(string | number)[]>();

  readonly state = signal<CheckboxModel[]>([]);

  // Expose enums
  readonly sizeEnum = SizeEnum;
  readonly orientationEnum = OrientationEnum;

  readonly filteredManufactures = computed(() => {
    const term = this.filterTerm.toLowerCase();
    return this.state().filter((item) =>
      item.value.toLowerCase().includes(term)
    );
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['manufactures'] || changes['selected']) {
      this.syncState();
    }
  }

  syncState(): void {
    const updated = this.manufactures.map((m) => ({
      ...m,
      checked: this.selected.includes(m.key!),
    }));
    this.state.set(updated);
  }

  emitChanges(models: CheckboxModel[]): void {
    this.state.set(models);
    const selected = models
      .filter((m) => m.checked && m.key !== undefined)
      .map((m) => m.key as string | number);
    this.selectionChanged.emit(selected);
  }
}
