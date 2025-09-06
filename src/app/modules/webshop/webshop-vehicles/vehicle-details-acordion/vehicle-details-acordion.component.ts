import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewEncapsulation,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';

// Data models
import { TDVehicleDetails } from '../../../../shared/data-models/model/tecdoc';

type TechItem = { key: string; value: string };
type TechSection = { title: string; items: TechItem[] };

@Component({
  selector: 'vehicle-details-accordion',
  standalone: true,
  imports: [CommonModule, MatExpansionModule],
  templateUrl: './vehicle-details-acordion.component.html',
  styleUrls: ['./vehicle-details-acordion.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehicleDetailsAccordionComponent implements OnInit, OnChanges {
  @Input() vehicleDetails?: TDVehicleDetails;

  vehicleImg?: string;
  vehicleLabel = 'Vozilo';
  techData: TechSection[] = [];

  readonly panelOpenState = signal(false);

  private lastRef?: TDVehicleDetails;

  // ─────────────────────────────
  // Lifecycle
  // ─────────────────────────────

  ngOnInit(): void {
    this.hydrateFromDetails();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['vehicleDetails']) return;
    // izbegni rad ako je isti objekat (po referenci)
    if (this.lastRef === this.vehicleDetails) return;
    this.hydrateFromDetails();
  }

  // ─────────────────────────────
  // Init
  // ─────────────────────────────

  private hydrateFromDetails(): void {
    this.lastRef = this.vehicleDetails;
    this.initVehicleImg();
    this.initVehicleLabel();
    this.populateTechDocData();
  }

  private initVehicleImg(): void {
    const imgs = this.vehicleDetails?.vehicleImages?.[0];
    if (!imgs) {
      this.vehicleImg = undefined;
      return;
    }
    // izaberi najveću dostupnu
    this.vehicleImg =
      imgs.imageURL800 || imgs.imageURL400 || imgs.imageURL200 || imgs.imageURL100 || undefined;
  }

  private initVehicleLabel(): void {
    const v = this.vehicleDetails;
    if (!v) {
      this.vehicleLabel = 'Vozilo';
      return;
    }
    const parts = [
      v.mfrName,
      v.hmdMfrModelName,
      v.description,
      v.engineType,
      v.horsePowerTo ? `${v.horsePowerTo}HP` : '',
      v.kiloWattsTo ? `${v.kiloWattsTo}KW` : '',
      v.beginYearMonth,
      '-',
      v.endYearMonth || 'trenutno'
    ]
      .filter(Boolean)
      .map((s) => String(s).trim());
    this.vehicleLabel = parts.join(' ').replace(/\s+/g, ' ').trim() || 'Vozilo';
  }

  private populateTechDocData(): void {
    const v = this.vehicleDetails;
    if (!v) {
      this.techData = [];
      return;
    }

    const nonEmpty = (item: TechItem) =>
      item.value !== undefined && item.value !== null && String(item.value).trim() !== '' && String(item.value) !== 'N/A';

    const osnovne: TechItem[] = [
      { key: 'Tip', value: v.description || 'N/A' },
      { key: 'Godina proizvodnje', value: `${v.beginYearMonth || 'N/A'} - ${v.endYearMonth || 'trenutno'}` },
      { key: 'Tip karoserije', value: v.bodyStyle || 'N/A' },
      { key: 'Pogon', value: v.driveType || 'N/A' }
    ].filter(nonEmpty);

    const tehnicki: TechItem[] = [
      { key: 'Snaga (kW)', value: v.kiloWattsTo ? `${v.kiloWattsTo} kW` : 'N/A' },
      { key: 'Snaga (HP)', value: v.horsePowerTo ? `${v.horsePowerTo} HP` : 'N/A' },
      { key: 'Zapremina (cc)', value: v.capacityCC ? `${v.capacityCC} cc` : 'N/A' },
      { key: 'Cilindri', value: v.cylinders?.toString() || 'N/A' },
      { key: 'Ventili po cilindru', value: v.valves?.toString() || 'N/A' },
      { key: 'Vrsta motora', value: v.engineType || 'N/A' },
      { key: 'Gorivo', value: v.fuelType || 'N/A' },
      { key: 'Sistem ubrizgavanja', value: v.fuelMixtureFormationType || 'N/A' }
    ].filter(nonEmpty);

    const motori: TechItem[] = (v.engines || [])
      .map((e) => ({ key: 'Kod motora', value: (e.code || '').trim() }))
      .filter(nonEmpty);

    const sections: TechSection[] = [];
    if (osnovne.length) sections.push({ title: 'Osnovne informacije', items: osnovne });
    if (tehnicki.length) sections.push({ title: 'Tehnički podaci', items: tehnicki });
    if (motori.length) sections.push({ title: 'Šifra motora', items: motori });

    this.techData = sections;
  }

  // ─────────────────────────────
  // TrackBy
  // ─────────────────────────────

  trackByTitle(_: number, section: TechSection): string {
    return section.title;
  }

  trackByKey(_: number, item: TechItem): string {
    return item.key;
  }
}