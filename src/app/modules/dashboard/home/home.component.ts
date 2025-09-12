
import { Component, OnDestroy, OnInit } from '@angular/core';

// Automaterijal imports
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
export class HomeComponent implements OnInit, OnDestroy {
  constructor(private seo: SeoService) { }

  ngOnInit(): void {
    const url = 'https://automaterijal.com/';
    const hero = 'https://automaterijal.com/images/navigation/hero-banner.png';

    // Preload hero (jednom, webp)
    this.seo.preloadImage(hero);

    // Meta + OG + canonical
    this.seo.updateSeoTags({
      title: 'Auto delovi, filteri i maziva – Automaterijal (Šabac, Srbija)',
      description: 'Sve za vaše vozilo na jednom mestu: delovi, filteri, ulja i maziva za putnička, teretna i građevinska vozila. Brza isporuka širom Srbije.',
      url,
      image: hero,
      imageAlt: 'Automaterijal – širok izbor auto delova, filtera i maziva',
      type: 'website',
      robots: 'index, follow',
      siteName: 'Automaterijal',
      locale: 'sr_RS',
      canonical: url
    });

    // (opciono) ako dodaš metodu u SeoService:
    // this.seo.setHtmlLang('sr-RS');

    // JSON-LD (@graph)
    this.seo.setJsonLd({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "name": "Automaterijal d.o.o.",
          "url": url,
          "logo": "https://automaterijal.com/images/logo/logo.svg",
          "sameAs": [
            "https://www.facebook.com/automaterijal",
            "https://www.instagram.com/automaterijal"
          ]
        },
        {
          "@type": "AutoPartsStore",
          "name": "Automaterijal d.o.o.",
          "image": hero,
          "url": url,
          "telephone": "+38115319000",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Kralja Milutina 159",
            "addressLocality": "Šabac",
            "postalCode": "15000",
            "addressCountry": "RS"
          },
          "openingHoursSpecification": [
            { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "08:00", "closes": "17:00" },
            { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "08:00", "closes": "14:00" }
          ]
        },
        {
          "@type": "WebSite",
          "url": url,
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://automaterijal.com/webshop?searchTerm={query}",
            "query-input": "required name=query"
          }
        }
      ]
    }); // default id = 'seo-jsonld'
  }

  ngOnDestroy(): void {
    this.seo.clearJsonLd('seo-jsonld');
  }
}