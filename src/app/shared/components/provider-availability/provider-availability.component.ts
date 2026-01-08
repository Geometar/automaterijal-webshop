import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { AvailabilityVm } from '../../utils/availability-utils';

@Component({
  selector: 'autom-provider-availability',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './provider-availability.component.html',
  styleUrl: './provider-availability.component.scss',
})
export class ProviderAvailabilityComponent {
  @Input() availability: AvailabilityVm | null = null;
  @Input() isStaff = true;
  @Input() showQuantity = false;
  @Input() variant: 'row' | 'details' = 'row';

  get showBox(): boolean {
    return !!this.availability?.showProviderBox;
  }
}
