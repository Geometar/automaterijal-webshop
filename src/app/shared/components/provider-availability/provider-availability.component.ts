import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { AvailabilityVm } from '../../utils/availability-utils';
import { MetaPillComponent } from '../meta-pill/meta-pill.component';

@Component({
  selector: 'autom-provider-availability',
  standalone: true,
  imports: [CommonModule, MetaPillComponent],
  templateUrl: './provider-availability.component.html',
  styleUrl: './provider-availability.component.scss',
})
export class ProviderAvailabilityComponent {
  @Input() availability: AvailabilityVm | null = null;
  @Input() isStaff = true;
  @Input() showQuantity = false;
  @Input() variant: 'row' | 'details' = 'row';
  @Input() forceShow = false;
  @Input() mixedWarehouse = false;
  @Input() mixedLocalQuantity = 0;
  @Input() mixedExternalQuantity = 0;
  @Input() mixedExternalLabel = 'Magacin Beograd';

  get showBox(): boolean {
    return !!this.availability?.showProviderBox || this.forceShow;
  }

  get showMixedSplit(): boolean {
    if (!this.mixedWarehouse) {
      return false;
    }
    return this.mixedLocalQuantity > 0 && this.mixedExternalQuantity > 0;
  }
}
