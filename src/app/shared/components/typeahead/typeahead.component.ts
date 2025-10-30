import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, tap } from 'rxjs/operators';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';

// Component Imports
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

export interface TypeaheadItem {
  key?: string | number;
  value?: string;
  img?: string;
  meta?: string;
}

@Component({
  selector: 'typeahead',
  standalone: true,
  imports: [
    AsyncPipe,
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
  ],
  templateUrl: './typeahead.component.html',
  styleUrl: './typeahead.component.scss'
})
export class TypeaheadComponent implements OnChanges {
  @Input() data: TypeaheadItem[] = [];
  @Input() disabled = false;
  @Input() label = '';
  @Input() debounce = 300;
  @Input() minLength = 2;
  @Input() selectedItem: TypeaheadItem | null = null;
  @Output() emit = new EventEmitter<TypeaheadItem | null>();
  @Output() search = new EventEmitter<string>();

  stateCtrl = new FormControl({ value: '', disabled: this.disabled });
  filteredStates: Observable<TypeaheadItem[]>;
  private dataSubject = new BehaviorSubject<TypeaheadItem[]>([]);

  constructor() {
    const valueChanges$ = this.stateCtrl.valueChanges.pipe(
      debounceTime(this.debounce),
      distinctUntilChanged(),
      tap((value) => this.handleSearch(value)),
      startWith('')
    );

    this.filteredStates = combineLatest([
      valueChanges$,
      this.dataSubject.asObservable()
    ]).pipe(
      map(([state, data]) => (state ? this.filterStates(state, data) : data.slice()))
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled']) {
      if (this.disabled) {
        this.stateCtrl.disable({ emitEvent: false });
      } else {
        this.stateCtrl.enable({ emitEvent: false });
      }
    }

    if (changes['data']) {
      this.dataSubject.next(this.data.slice());
    }

    if (changes['selectedItem']) {
      if (this.selectedItem) {
        this.stateCtrl.setValue(this.selectedItem.value || '', { emitEvent: false });
      } else {
        this.stateCtrl.setValue('', { emitEvent: true });
      }
    }
  }

  showAllOptions(): void {
    this.stateCtrl.setValue(this.stateCtrl.value || '', { emitEvent: true });
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const selectedItem = this.data.find(item => item.value === event.option.value);
    if (selectedItem) {
      this.emit.emit(selectedItem);
    }
  }

  onInputBlur(): void {
    setTimeout(() => {
      const currentValue = this.stateCtrl.value?.trim();
      const selectedItem = this.data.find(item => item.value === currentValue);

      if (selectedItem) {
        this.stateCtrl.setValue(selectedItem.value!); // ✅ Keep valid selection
      } else if (this.selectedItem) {
        this.stateCtrl.setValue(this.selectedItem.value!, { emitEvent: false }); // 🔄 Revert to last selected item
      } else {
        this.stateCtrl.setValue('', { emitEvent: true }); // ❌ Clear input if no selection
        this.emit.emit(null); // 🔔 Notify parent that selection was removed
      }
    }, 150);
  }

  private handleSearch(rawValue: unknown): void {
    if (typeof rawValue !== 'string') {
      return;
    }

    const value = rawValue.trim();
    if (this.selectedItem?.value?.trim() === value) {
      return;
    }

    if (!value) {
      this.search.emit('');
      return;
    }

    if (value.length < this.minLength) {
      return;
    }

    this.search.emit(value);
  }

  private filterStates(value: string, data: TypeaheadItem[]): TypeaheadItem[] {
    const filterValue = value.toLowerCase();

    return data.filter(item => item.value!.toLowerCase().includes(filterValue));
  }
}
