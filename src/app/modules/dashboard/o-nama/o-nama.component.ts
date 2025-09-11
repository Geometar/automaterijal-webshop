import { Component, OnInit } from '@angular/core';

// Enums
import { ColorEnum } from '../../../shared/data-models/enums';

// Automaterijal Imports
import { BrendoviComponent } from './brendovi/brendovi.component';
import { HeaderComponent } from './header/header.component';
import { HistoryTimelineComponent } from './history-timeline/history-timeline.component';

// Services
import { SeoService } from '../../../shared/service/seo.service';

@Component({
  selector: 'app-o-nama',
  standalone: true,
  imports: [
    HistoryTimelineComponent,
    HeaderComponent,
    BrendoviComponent,
  ],
  templateUrl: './o-nama.component.html',
  styleUrl: './o-nama.component.scss',
})
export class ONamaComponent implements OnInit {
  iconColor = ColorEnum;

  constructor(private seoService: SeoService) { }

  ngOnInit(): void {
    this.updateSeoTags();
  }

  private updateSeoTags(): void {
    this.seoService.updateSeoTags({
      title: 'O nama | Automaterijal – Istorija, partneri i razvoj',
      description:
        'Saznajte više o kompaniji Automaterijal. Naša istorija, partneri i razvojni put od 1990. do danas.',
      url: 'https://www.automaterijal.com/onama',
      canonical: 'https://www.automaterijal.com/onama',
      robots: 'index, follow',
      siteName: 'Automaterijal',
      locale: 'sr_RS',
      image: 'https://www.automaterijal.com/images/navigation/onama-hero.webp',
      imageAlt: 'Automaterijal – istorija i partneri'
    });
  }
}
