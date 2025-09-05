import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

// Models
import { Roba, ShowcaseResponse } from '../../../shared/data-models/model/roba';

// Enums
import { IconsEnum } from '../../../shared/data-models/enums';

// Services
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';
import { RobaService } from '../../service/roba.service';

// Components
import { AutomProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'autom-showcase',
  standalone: true,
  imports: [CommonModule, AutomProductCardComponent, SpinnerComponent],
  templateUrl: './showcase.component.html',
  styleUrl: './showcase.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ShowcaseComponent implements OnInit {
  iconEnum = IconsEnum;

  loading = false;
  error: string | null = null;

  // Struktura koju tvoj HTML očekuje
  showcase: { podgrupa: string; artikli: Roba[] }[] = [];

  constructor(
    private urlHelperService: UrlHelperService,
    private robaService: RobaService
  ) { }

  ngOnInit(): void {
    this.loadShowcase();
  }

  private loadShowcase(): void {
    this.loading = true;
    this.error = null;

    this.robaService.fetchShowcase().subscribe({
      next: (resp: ShowcaseResponse) => {
        // spoji sve sekcije u jedan niz i mapiraj u Roba
        const allItems: Roba[] = [
          ...(resp.prioritetne ?? []),
          ...(resp.maziva ?? []),
          ...(resp.alati ?? []),
          ...(resp.pribor ?? []),
        ];

        // grupiši po podgrupi (podGrupaNaziv)
        this.showcase = this.groupBySubgroup(allItems);
      },
      error: (err) => {
        console.error('Showcase error:', err);
        this.error = 'Nije moguće učitati showcase u ovom trenutku.';
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  // Grupisanje po nazivu podgrupe
  private groupBySubgroup(data: Roba[]): { podgrupa: string; artikli: Roba[] }[] {
    const grouped: Record<string, Roba[]> = {};

    for (const item of data) {
      const key = item.podGrupaNaziv || 'Ostalo';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    // pretvori u niz sekcija i izbaci prazne
    return Object.entries(grouped)
      .map(([podgrupa, artikli]) => ({ podgrupa, artikli }))
      .filter(s => s.artikli.length > 0);
  }


  goToProduct(id: number): void {
    this.urlHelperService.navigateTo(`/webshop/${id}`);
  }
}