import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SeoService } from '../../../shared/service/seo.service';

@Component({
  selector: 'app-return-policy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './return-policy.component.html',
  styleUrl: './return-policy.component.scss',
})
export class ReturnPolicyComponent implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    const url = 'https://automaterijal.com/povrat-garancija';
    this.seo.updateSeoTags({
      title: 'Povrat i garancija | Automaterijal',
      description:
        'Povrat neoštećenih delova, reklamacije zbog nesaobraznosti i garancije proizvođača – sve na jednom mestu.',
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
