import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// Component imported
import { VehicleDetailsAcordionComponent } from './vehicle-details-acordion/vehicle-details-acordion.component';

// Data models
import { TDVehicleDetails } from '../../../shared/data-models/model/tecdoc';

// Service
import { TecdocService } from '../../../shared/service/tecdoc.service';

@Component({
  selector: 'webshop-vehicles',
  standalone: true,
  imports: [VehicleDetailsAcordionComponent],
  templateUrl: './webshop-vehicles.component.html',
  styleUrl: './webshop-vehicles.component.scss'
})
export class WebshopVehiclesComponent implements OnInit, OnDestroy {
  @Input() vehicleDetails?: TDVehicleDetails;

  private destroy$ = new Subject<void>();

  constructor(private tecdocService: TecdocService) { }

  /** Start of: Angular lifecycle hooks */

  ngOnInit(): void {
    if (this.vehicleDetails?.mfrId) {
      this.getAssemblyGroup();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** End of: Angular lifecycle hooks */

  // Start of: Events

  getAssemblyGroup(): void {
    this.tecdocService
      .getAssemblyGroups(
        this.vehicleDetails?.linkageTargetId!,
        this.vehicleDetails?.linkageTargetType!
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
        })
      )
      .subscribe({
        next: (response: AssignedNodesOptions[]) => {
          console.log(response);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        },
      });
  }

  // End of: Events

}
