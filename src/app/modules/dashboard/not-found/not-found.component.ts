// page-not-found.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

// Automaterd imports
import { ButtonComponent } from '../../../shared/components/button/button.component';

// Enums
import { ButtonThemes, ButtonTypes } from '../../../shared/data-models/enums';
import { SeoService } from '../../../shared/service/seo.service';

@Component({
  selector: 'not-found',
  templateUrl: './not-found.component.html',
  imports: [CommonModule, ButtonComponent, RouterModule],
  styleUrls: ['./not-found.component.scss'],
  standalone: true
})
export class PageNotFoundComponent implements OnInit, OnDestroy {
  searchQuery: string = '';

  //Enums
  buttonThemes = ButtonThemes;
  buttonTypes = ButtonTypes;

  constructor(private seo: SeoService) { }

  ngOnInit(): void {
    this.seo.updateSeoTags({
      title: '404 – Stranica nije pronađena | Automaterijal',
      description: 'Žao nam je, ali stranica koju tražite ne postoji. Vratite se na početnu ili nastavite pretragu delova.',
      url: 'https://automaterijal.com/404',
      type: 'website',
      robots: 'noindex, follow',
      image: 'https://automaterijal.com/images/logo/logo.svg',
      imageAlt: 'Automaterijal logo',
      siteName: 'Automaterijal',
      locale: 'sr_RS',
      canonical: 'https://automaterijal.com/404'
    });

    // Po želji: JSON-LD za 404 (nije obavezno)
    this.seo.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: '404 – Stranica nije pronađena',
      url: 'https://automaterijal.com/404',
      isPartOf: { '@type': 'WebSite', name: 'Automaterijal' }
    });
  }

  ngOnDestroy(): void {
    this.seo.clearJsonLd('seo-jsonld');
  }
}