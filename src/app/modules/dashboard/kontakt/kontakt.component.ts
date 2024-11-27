import { Component } from '@angular/core';
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';

// Enums
import { ColorEnum, IconsEnum } from '../../../shared/data-models/enums';

@Component({
  selector: 'app-kontakt',
  standalone: true,
  imports: [AutomIconComponent],
  templateUrl: './kontakt.component.html',
  styleUrl: './kontakt.component.scss'
})
export class KontaktComponent {
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;

}
