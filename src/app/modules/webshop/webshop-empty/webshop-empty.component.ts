import { Component } from '@angular/core';

// Enums
import { IconsEnum } from '../../../shared/data-models/enums';

// Component Imports
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';

@Component({
  selector: 'webshop-empty',
  standalone: true,
  imports: [AutomIconComponent],
  templateUrl: './webshop-empty.component.html',
  styleUrl: './webshop-empty.component.scss'
})
export class WebshopEmptyComponent {
  iconEnum = IconsEnum;

}
