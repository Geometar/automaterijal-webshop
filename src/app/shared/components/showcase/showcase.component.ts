import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

// Data models
import { Filter, Roba } from '../../../shared/data-models/model/roba';

// Enums
import { IconsEnum } from '../../../shared/data-models/enums';

// Services
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';
import { RobaService } from '../../service/roba.service';
import { CategoriesStateService } from '../../service/state/categories-state.service';
import { ShowcaseStateService } from '../../service/state/showcase-state.service';

// Components
import { AutomProductCardComponent } from '../../../shared/components/product-card/product-card.component';

@Component({
  selector: 'autom-showcase',
  standalone: true,
  imports: [CommonModule, AutomProductCardComponent],
  templateUrl: './showcase.component.html',
  styleUrl: './showcase.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ShowcaseComponent implements OnInit {
  iconEnum = IconsEnum;
  showcase: { podgrupa: string; artikli: Roba[] }[] = [];

  constructor(
    private urlHelperService: UrlHelperService,
    private robaService: RobaService,
    private categoriesStateService: CategoriesStateService,
    private showcaseStateService: ShowcaseStateService
  ) { }

  ngOnInit(): void {
    const expired = this.showcaseStateService.isExpired();
    const cached = this.showcaseStateService.get();
    console.log('CACHE EXPIRED?', expired);
    console.log('CACHED LENGTH:', cached.length);
    console.log('CACHED STRUCTURE:', cached);

    if (!this.showcaseStateService.isExpired()) {
      const cached = this.showcaseStateService.get();
      if (cached.length > 0) {
        this.showcase = cached;
        return;
      }
    }

    this.loadFreshShowcase();
  }

  private loadFreshShowcase(): void {
    const PRIORITETNE_CODES = ['ADO', 'PRI', 'ALATI'];
    const MAZIVA_CODES = ['MPU', 'MTR', 'MIZ', 'MOM', 'MOS'];

    this.categoriesStateService.getCategories$().subscribe((categories) => {
      const podgrupePrioritetne = categories
        .filter((group) => PRIORITETNE_CODES.includes(group.groupId!))
        .flatMap((group) => group.articleSubGroups || []);

      const podgrupeMaziva = categories
        .filter((group) => MAZIVA_CODES.includes(group.groupId!))
        .flatMap((group) => group.articleSubGroups || []);

      const izabranePodgrupe = [
        ...this.getRandomSubset(podgrupePrioritetne, 3),
        ...this.getRandomSubset(podgrupeMaziva, 2),
      ];

      const requests = izabranePodgrupe.map((podgrupa) => {
        const filter = new Filter();
        filter.podgrupe = [podgrupa!.subGroupId!.toString()];
        filter.naStanju = true;

        return this.robaService.pronadjiSvuRobu(null, 50, 0, '', filter).pipe(
          map((res) =>
            res.robaDto!.content.filter((r) => r.slika?.slikeUrl)// && !r.slika!.slikeUrl!.includes('no-image'))
          ),
          map((artikli) => this.getRandomSubset(artikli, 5)),
          map((artikli) => ({
            podgrupa: podgrupa.name!,
            artikli,
          }))
        );
      });

      forkJoin(requests).subscribe((results) => {
        this.showcase = results.filter((r) => r.artikli.length > 0);
        this.showcaseStateService.set(this.showcase);
      });
    });
  }

  goToProduct(id: number): void {
    this.urlHelperService.navigateTo(`/webshop/${id}`);
  }

  private getRandomSubset<T>(array: T[], size: number): T[] {
    return [...array].sort(() => 0.5 - Math.random()).slice(0, size);
  }

  private groupBySubgroup(data: Roba[]): { podgrupa: string; artikli: Roba[] }[] {
    const grouped: Record<string, Roba[]> = {};

    for (const item of data) {
      const key = item.podGrupaNaziv || 'Ostalo';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    return Object.entries(grouped).map(([podgrupa, artikli]) => ({ podgrupa, artikli }));
  }
}