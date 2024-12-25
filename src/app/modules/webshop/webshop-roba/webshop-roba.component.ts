import { Component, Input } from '@angular/core';

// Data Models
import { Magacin } from '../../../shared/data-models/model/roba';

// Component imports
import { TableComponent } from '../../../shared/components/table/table.component';

@Component({
  selector: 'webshop-roba',
  standalone: true,
  imports: [TableComponent],
  templateUrl: './webshop-roba.component.html',
  styleUrl: './webshop-roba.component.scss'
})
export class WebshopRobaComponent {
  @Input() magacin: Magacin | null = null;

}
