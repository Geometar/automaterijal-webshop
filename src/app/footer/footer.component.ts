import { Component } from '@angular/core';

// Component imports
import { AutomIconComponent } from "../shared/components/autom-icon/autom-icon.component";
import { RouterLink } from '@angular/router';

// Enums
import { ColorEnum, IconsEnum } from '../shared/data-models/enums';

@Component({
  selector: 'autom-footer',
  standalone: true,
  imports: [AutomIconComponent, RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;

}
