import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// Component imported
import { VehicleDetailsAcordionComponent } from './vehicle-details-acordion/vehicle-details-acordion.component';

// Data models
import { AssemblyGroup, TDVehicleDetails } from '../../../shared/data-models/model/tecdoc';

// Service
import { TecdocService } from '../../../shared/service/tecdoc.service';
import { AssemblyGroupsComponent } from './assembly-groups/assembly-groups.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'webshop-vehicles',
  standalone: true,
  imports: [SpinnerComponent, VehicleDetailsAcordionComponent, AssemblyGroupsComponent, CommonModule],
  templateUrl: './webshop-vehicles.component.html',
  styleUrl: './webshop-vehicles.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class WebshopVehiclesComponent implements OnInit, OnDestroy, OnChanges {
  @Input() vehicleDetails?: TDVehicleDetails;

  // Data
  assemblyGroups: AssemblyGroup[] = [];

  // Misc
  assemblyGroupLoading = true;

  private destroy$ = new Subject<void>();

  constructor(private tecdocService: TecdocService) { }

  /** Start of: Angular lifecycle hooks */

  ngOnInit(): void {
    if (this.vehicleDetails?.mfrId) {
      this.getAssemblyGroup();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['vehicleDetails'].firstChange) {
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
    this.assemblyGroupLoading = true;
    this.tecdocService
      .getAssemblyGroups(
        this.vehicleDetails?.linkageTargetId!,
        this.vehicleDetails?.linkageTargetType!
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.assemblyGroupLoading = false;
        })
      )
      .subscribe({
        next: (response: AssemblyGroup[]) => {
          this.assemblyGroups = response;
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        },
      });
  }

  // End of: Events

}
