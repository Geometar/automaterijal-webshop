import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class SeoService {
  constructor(private titleService: Title, private metaService: Meta) { }

  updateSeoTags({
    title,
    description,
    url,
    image = 'https://www.automaterijal.com/images/logo/logo.svg',
    type = 'website',
    keywords,
    robots,
  }: {
    title: string;
    description: string;
    url: string;
    image?: string;
    type?: string;
    keywords?: string;
    robots?: string;
  }): void {
    this.titleService.setTitle(title);

    this.metaService.removeTag("name='description'");
    this.metaService.addTag({ name: 'description', content: description }, true);

    this.metaService.removeTag("property='og:description'");
    this.metaService.addTag({ property: 'og:description', content: description }, true);

    if (keywords) {
      this.metaService.updateTag({ name: 'keywords', content: keywords });
    }

    if (robots) {
      this.metaService.updateTag({ name: 'robots', content: robots });
    }

    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:type', content: type });
    this.metaService.updateTag({ property: 'og:image', content: image });
  }
}