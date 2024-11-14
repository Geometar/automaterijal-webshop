import { Component } from '@angular/core';
import { YouTubePlayer } from '@angular/youtube-player';
import { AutomIconComponent } from '../../../../shared/components/autom-icon/autom-icon.component';

// Enums
import { ColorEnum } from '../../../../shared/data-models/enums';

@Component({
  selector: 'home-header',
  standalone: true,
  imports: [AutomIconComponent, YouTubePlayer],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  iconColor = ColorEnum;
}
