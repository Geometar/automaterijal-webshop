import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// Component imported
import { AssemblyGroupsComponent } from './assembly-groups/assembly-groups.component';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { VehicleDetailsAcordionComponent } from './vehicle-details-acordion/vehicle-details-acordion.component';

// Data models
import {
  AssemblyGroup,
  AssemblyGroupDetails,
  TDVehicleDetails,
} from '../../../shared/data-models/model/tecdoc';
import { Magacin } from '../../../shared/data-models/model/roba';

// Service
import { TecdocService } from '../../../shared/service/tecdoc.service';
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';

@Component({
  selector: 'webshop-vehicles',
  standalone: true,
  imports: [
    AssemblyGroupsComponent,
    CommonModule,
    SpinnerComponent,
    VehicleDetailsAcordionComponent,
  ],
  templateUrl: './webshop-vehicles.component.html',
  styleUrl: './webshop-vehicles.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class WebshopVehiclesComponent implements OnInit, OnDestroy, OnChanges {
  @Input() showAssemblyGroups = true;
  @Input() vehicleDetails?: TDVehicleDetails;

  // Data
  assembleGroupData: AssemblyGroupDetails = {} as AssemblyGroupDetails;
  assemblyGroups: AssemblyGroup[] = [];
  magacinData: Magacin | null = null;

  // Misc
  assemblyGroupLoading = true;
  robaLoading = true;

  private destroy$ = new Subject<void>();

  constructor(
    private tecdocService: TecdocService,
    private urlHelperService: UrlHelperService
  ) { }

  /** Start of: Angular lifecycle hooks */

  ngOnInit(): void {
    if (this.vehicleDetails?.mfrId) {
      this.getAssemblyGroup();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vehicleDetails'] && !changes['vehicleDetails'].firstChange) {
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
        next: (response: AssemblyGroupDetails) => {
          this.assembleGroupData = response;
          this.assemblyGroups = response.assemblyGroupFacetCounts;
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        },
      });
  }

  // End of: Events

  getArticlesByAssembleGroup(assemblyGroup: AssemblyGroup): void {
    this.urlHelperService.addOrUpdateQueryParams({ assembleGroupId: assemblyGroup.assemblyGroupNodeId, assemblyGroupName: assemblyGroup.assemblyGroupName })
  }
}
