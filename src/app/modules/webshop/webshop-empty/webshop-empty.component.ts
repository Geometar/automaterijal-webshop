import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs/operators';
import { RouterModule } from '@angular/router';

// Autom Imports
import { DividerComponent } from '../../../shared/components/divider/divider.component';
import { ShowcaseComponent, ShowcaseSection } from '../../../shared/components/showcase/showcase.component';
import { VehicleSelectionPopupComponent } from '../../../shared/components/ui/vehicle-selection-popup/vehicle-selection-popup.component';

// Data models
import { Category } from '../../../shared/data-models/interface';
import { Roba, ShowcaseResponse } from '../../../shared/data-models/model/roba';
import { TDVehicleDetails } from '../../../shared/data-models/model';

// Enums
import { IconsEnum } from '../../../shared/data-models/enums';

// Services
import { ConfigService } from '../../../shared/service/config.service';
import { RobaService } from '../../../shared/service/roba.service';
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';
import { VehicleUrlService } from '../../../shared/service/utils/vehicle-url.service';

@Component({
  selector: 'webshop-empty',
  standalone: true,
  imports: [CommonModule, ShowcaseComponent, VehicleSelectionPopupComponent, DividerComponent, RouterModule],
  templateUrl: './webshop-empty.component.html',
  styleUrl: './webshop-empty.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class WebshopEmptyComponent implements OnInit {
  @Output() selectedVehicleDetailsEmit = new EventEmitter<TDVehicleDetails>();
  iconEnum = IconsEnum;

  brands: Category[] = [];
  error: string | null = null;
  showcase: ShowcaseSection[] = [];

  // Misc
  chooseVehicleVisible = false;
  showcaseLoading = false;

  constructor(
    private configService: ConfigService,
    private robaService: RobaService,
    private urlHelperService: UrlHelperService,
    private vehicleUrlService: VehicleUrlService,
  ) { }

  ngOnInit(): void {
    this.configService
      .getConfig()
      .pipe(take(1))
      .subscribe((config) => {
        this.brands = config.brands.filter((brand) => brand.visible !== false);
      });
    this.loadShowcase();
  }

  handleSelectedVehicle(vehicleDetails: TDVehicleDetails): void {
    this.vehicleUrlService.navigateToVehicle(vehicleDetails);

    if (!vehicleDetails.description) {
      return;
    }

    this.selectedVehicleDetailsEmit.emit(vehicleDetails);
  }

  private loadShowcase(): void {
    this.showcaseLoading = true;
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
        this.showcaseLoading = false;
      },
    });
  }

  // Grupisanje po nazivu podgrupe
  private groupBySubgroup(data: Roba[]): { title: string; titleUrl: string, artikli: Roba[] }[] {
    const grouped: Record<string, Roba[]> = {};

    for (const item of data) {
      const key = item.podGrupaNaziv || 'Ostalo';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    // pretvori u niz sekcija i izbaci prazne
    return Object.entries(grouped)
      .map(([subgroup, artikli]) => {
        let category = 'Ostalo';
        if (artikli.length > 0) {
          category = artikli[0].grupaNaziv || 'Ostalo';
        }
        return { title: (category + ' - ' + subgroup), titleUrl: this.urlHelperService.buildCategoryUrl(category, subgroup), artikli };
      })
      .filter(s => s.artikli.length > 0);
  }

  scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
