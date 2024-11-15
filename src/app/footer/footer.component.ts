import { Component } from '@angular/core';
import { AutomIconComponent } from "../shared/components/autom-icon/autom-icon.component";

// Enums
import { ColorEnum, IconsEnum } from '../shared/data-models/enums';

@Component({
  selector: 'autom-footer',
  standalone: true,
  imports: [AutomIconComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;

}
