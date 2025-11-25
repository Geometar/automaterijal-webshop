import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SeoService } from '../../../shared/service/seo.service';

@Component({
  selector: 'app-shipping-policy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shipping-policy.component.html',
  styleUrl: './shipping-policy.component.scss',
})
export class ShippingPolicyComponent implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    const url = 'https://automaterijal.com/dostava';
    this.seo.updateSeoTags({
      title: 'Dostava | Automaterijal',
      description:
        'Dostava Aks ili Bex, rok 1–2 radna dana za artikle na stanju. Besplatna isporuka za online porudžbine iznad 3.000 RSD.',
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
