import { Component, OnInit } from '@angular/core';

// Automaterijal components
import { BlogComponent } from './blog/blog.component';
import { BrendoviComponent } from './brendovi/brendovi.component';
import { HeaderComponent } from "./header/header.component";
import { ONamaSmallComponent } from './o-nama-small/o-nama-small.component';
import { TimoviComponent } from './timovi/timovi.component';

// Service
import { SeoService } from '../../../shared/service/seo.service';

@Component({
  selector: 'autom-home',
  standalone: true,
  imports: [HeaderComponent, BlogComponent, BrendoviComponent, ONamaSmallComponent, TimoviComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  constructor(private seoService: SeoService) { }

  ngOnInit(): void {
    this.updateSeoTags();
  }

  private updateSeoTags(): void {
    this.seoService.updateSeoTags({
      title: 'Automaterijal | Auto delovi, filteri i maziva',
      description: 'Automaterijal - prodaja auto delova, filtera i maziva za sve vrste vozila. Širok asortiman, kvalitetne marke, brza dostava.',
      url: 'https://www.automaterijal.com/',
      keywords: 'auto delovi, filteri, maziva, Automaterijal, rezervni delovi, Šabac, Srbija, motorna ulja, servisna oprema',
    });
  }
}
