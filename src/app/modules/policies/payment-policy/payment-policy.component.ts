import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SeoService } from '../../../shared/service/seo.service';

@Component({
  selector: 'app-payment-policy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-policy.component.html',
  styleUrl: './payment-policy.component.scss',
})
export class PaymentPolicyComponent implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    const url = 'https://automaterijal.com/placanje';
    this.seo.updateSeoTags({
      title: 'Načini plaćanja | Automaterijal',
      description:
        'Plaćanje pouzećem uz fiskalni račun u paketu. Kartice su dostupne kod kurira gde je omogućeno. Bez skrivenih troškova.',
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
