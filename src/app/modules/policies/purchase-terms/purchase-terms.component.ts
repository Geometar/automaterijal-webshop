import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SeoService } from '../../../shared/service/seo.service';

@Component({
  selector: 'app-purchase-terms',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './purchase-terms.component.html',
  styleUrl: './purchase-terms.component.scss',
})
export class PurchaseTermsComponent implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    const url = 'https://automaterijal.com/uslovi-kupovine';
    this.seo.updateSeoTags({
      title: 'Uslovi kupovine | Dostava, plaćanje, povrat | Automaterijal',
      description:
        'Sve na jednom mestu: dostava Aks/Bex (1–2 radna dana), plaćanje pouzećem i pravila povrata/garancije za online porudžbine.',
      url,
      canonical: url,
      robots: 'index, follow',
      siteName: 'Automaterijal',
      locale: 'sr_RS',
      image: 'https://automaterijal.com/images/logo/logo.svg',
      imageAlt: 'Automaterijal logo',
    });
  }
}
