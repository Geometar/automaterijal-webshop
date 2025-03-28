
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Component imports
import { AutomIconComponent } from '../../../../shared/components/autom-icon/autom-icon.component';

// Enums
import { ColorEnum } from '../../../../shared/data-models/enums';

@Component({
  selector: 'home-header',
  standalone: true,
  imports: [AutomIconComponent, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  // Enums
  iconColor = ColorEnum;
}
