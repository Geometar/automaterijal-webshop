import { Component } from '@angular/core';
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';
import { YouTubePlayer } from '@angular/youtube-player';
import { ColorEnum } from '../../../shared/data-models/enums';

// Komponente
import { HistoryTimelineComponent } from './history-timeline/history-timeline.component';
import { HeaderComponent } from './header/header.component';
import { BrendoviComponent } from './brendovi/brendovi.component';

@Component({
  selector: 'app-o-nama',
  standalone: true,
  imports: [AutomIconComponent, HistoryTimelineComponent, YouTubePlayer, HeaderComponent, BrendoviComponent],
  templateUrl: './o-nama.component.html',
  styleUrl: './o-nama.component.scss'
})
export class ONamaComponent {
  iconColor = ColorEnum;

}
