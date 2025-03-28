import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Component imports
import { AutomIconComponent } from '../../../../shared/components/autom-icon/autom-icon.component';

// Enums
import { ColorEnum } from '../../../../shared/data-models/enums';

@Component({
  selector: 'autom-timovi-home',
  standalone: true,
  imports: [AutomIconComponent, RouterLink],
  templateUrl: './timovi.component.html',
  styleUrl: './timovi.component.scss'
})
export class TimoviComponent {
  iconColor = ColorEnum;
}
