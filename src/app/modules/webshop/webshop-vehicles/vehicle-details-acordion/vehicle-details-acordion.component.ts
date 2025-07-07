import { Component, Input, OnChanges, OnInit, signal, SimpleChanges, ViewEncapsulation } from '@angular/core';

// Data models
import { TDVehicleDetails } from '../../../../shared/data-models/model/tecdoc';

// Component imported
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'vehicle-details-accordion',
  standalone: true,
  imports: [CommonModule, MatExpansionModule],
  templateUrl: './vehicle-details-acordion.component.html',
  styleUrl: './vehicle-details-acordion.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class VehicleDetailsAcordionComponent implements OnInit, OnChanges {
  @Input() vehicleDetails?: TDVehicleDetails;

  vehicleImg: string | undefined = '';

  techData: any[] = [];

  readonly panelOpenState = signal(false);

  /** Start of: Angular lifecycle hooks */

  ngOnInit(): void {
    this.initVehicleImg();
    this.populateTechDocData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['vehicleDetails'].firstChange) {
      this.initVehicleImg();
      this.populateTechDocData();
    }
  }

  /** End of: Angular lifecycle hooks */

  /** Start of: Init methods */

  initVehicleImg(): void {
    if (this.vehicleDetails?.vehicleImages?.length) {
      this.vehicleImg = this.vehicleDetails.vehicleImages[0].imageURL200 ? this.vehicleDetails.vehicleImages[0].imageURL200 : this.vehicleDetails.vehicleImages[0].imageURL100;
    } else {
      this.vehicleImg = undefined; // Reset if no images are available
    }
  }

  populateTechDocData(): void {
    if (this.vehicleDetails) {
      this.techData = [
        {
          title: 'Osnovne informacije',
          items: [
            { key: 'Tip', value: this.vehicleDetails.description || 'N/A' },
            {
              key: 'Godina proizvodnje',
              value: `${this.vehicleDetails.beginYearMonth} - ${this.vehicleDetails.endYearMonth || 'trenutno'}`
            },
            { key: 'Tip karoserije', value: this.vehicleDetails.bodyStyle || 'N/A' },
            { key: 'Pogon', value: this.vehicleDetails.driveType || 'N/A' }
          ]
        },
        {
          title: 'Tehnički podaci',
          items: [
            { key: 'Snaga (kW)', value: this.vehicleDetails.kiloWattsTo + ' kW' },
            { key: 'Snaga (HP)', value: this.vehicleDetails.horsePowerTo + ' HP' },
            { key: 'Zapremina (cc)', value: this.vehicleDetails.capacityCC + ' cc' },
            { key: 'Cilindri', value: this.vehicleDetails.cylinders },
            { key: 'Ventili po cilindru', value: this.vehicleDetails.valves },
            { key: 'Vrsta motora', value: this.vehicleDetails.engineType },
            { key: 'Gorivo', value: this.vehicleDetails.fuelType },
            { key: 'Sistem ubrizgavanja', value: this.vehicleDetails.fuelMixtureFormationType }
          ]
        },
        {
          title: 'Šifra motora',
          items: this.vehicleDetails.engines!.map(engine => ({
            key: 'Kod motora', value: engine.code
          }))
        }
      ];
    }
  }

  /** End of: Init methods */

}
