import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';

// Automateriajl import
import { RadioButtonComponent } from '../../../../shared/components/radio-button/radio-button.component';

// Data models
import { RadioOption } from '../../../../shared/data-models/interface';

// Enums
import { OrientationEnum } from '../../../../shared/data-models/enums';

@Component({
  selector: 'availability-filter',
  standalone: true,
  imports: [CommonModule, RadioButtonComponent],
  templateUrl: './availability-filter.component.html',
  styleUrl: './availability-filter.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AvailabilityFilterComponent implements OnChanges, OnInit {
  @Input() onStock: boolean = false;
  @Output() availabilityChanged = new EventEmitter<boolean>();

  // Enums
  readonly orientation = OrientationEnum;

  radioOptions: RadioOption[] = [];
  readonly radioOptionKeys = ['Svi artikli', 'Ima na stanju'];

  get isMobileView(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return window.innerWidth < 991;
    }
    return false; // fallback za server-side render
  }

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit(): void {
    this.buildOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['onStock']) {
      this.buildOptions();
    }
  }

  buildOptions(): void {
    const selected = this.onStock ? 'Ima na stanju' : 'Svi artikli';

    this.radioOptions = this.radioOptionKeys.map((value) => ({
      key: value,
      value,
      checked: value === selected,
    }));
  }

  emitSelected(): void {
    const selected = this.radioOptions.find((r) => r.checked);
    const isAvailable = selected?.key === 'Ima na stanju';
    this.availabilityChanged.emit(isAvailable);
  }
}
