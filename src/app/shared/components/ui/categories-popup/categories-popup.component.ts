import { Component, EventEmitter, HostListener, Output, ViewEncapsulation } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Autom imports
import { AutomIconComponent } from '../../autom-icon/autom-icon.component';
import { InputFieldsComponent } from '../../input-fields/input-fields.component';
import { PopupComponent } from '../../popup/popup.component';

// Data models
import { Bucket, BucketGroup } from '../../../data-models/model';

// Enums
import { IconsEnum, InputTypeEnum, PositionEnum, SizeEnum } from '../../../data-models/enums';

// Services
import { CategoriesBucketsService } from '../../../service/utils/categories-buckets.service';
import { UrlHelperService } from '../../../service/utils/url-helper.service';

@Component({
  selector: 'autom-categories-popup',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PopupComponent,
    InputFieldsComponent,
    AutomIconComponent
  ],
  styleUrls: ['./categories-popup.component.scss'],
  templateUrl: './categories-popup.component.html',
  encapsulation: ViewEncapsulation.None
})
export class CategoriesPopupComponent {
  @Output() close = new EventEmitter<void>();
  @Output() requestVehicleSearch = new EventEmitter<void>();

  // Enums
  readonly inputTypeEnum = InputTypeEnum;
  readonly positionEnum = PositionEnum;
  readonly sizeEnum = SizeEnum;
  readonly subPosition = PositionEnum;
  readonly iconsEnum = IconsEnum;

  // Observables
  readonly buckets$: Observable<Bucket[]>;
  readonly vm$: Observable<Bucket[]>;
  readonly stats$: Observable<{ groups: number; subgroups: number }>;

  // Search query state
  private readonly query$ = new BehaviorSubject<string>('');

  // UI state
  activeBucket?: Bucket;
  activeGroup?: BucketGroup | null;

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.close.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeSubpanel();
  }

  closeSubpanel(): void {
    this.activeGroup = null;
  }

  constructor(private bucketsService: CategoriesBucketsService, private urlHelper: UrlHelperService) {
    this.buckets$ = this.bucketsService.getBuckets$();

    this.vm$ = combineLatest([this.buckets$, this.query$]).pipe(
      map(([buckets, q]) => {
        const term = q.trim().toLowerCase();

        return buckets.map((b) => {
          const groups = b.groups
            .map((g) => {
              // da li matchuje ime grupe
              const groupMatch =
                g.name.toLowerCase().includes(term) ||
                g.code.toLowerCase().includes(term);

              // filtriraj subgrupe
              const subgroups = (g.subgroups ?? []).filter((sg) =>
                sg.name.toLowerCase().includes(term)
              );

              if (!term || groupMatch || subgroups.length > 0) {
                return {
                  ...g,
                  subgroups: groupMatch ? g.subgroups : subgroups
                };
              }
              return null;
            })
            .filter(Boolean) as BucketGroup[];

          return { ...b, groups };
        });
      })
    );

    this.stats$ = this.buckets$.pipe(
      map((buckets) => {
        const groups = buckets.reduce((acc, bucket) => acc + (bucket.groups?.length ?? 0), 0);
        const subgroups = buckets.reduce(
          (acc, bucket) =>
            acc +
            (bucket.groups?.reduce((groupAcc, group) => groupAcc + (group.subgroups?.length ?? 0), 0) ?? 0),
          0
        );

        return { groups, subgroups };
      })
    );
  }

  // --- Handlers -------------------------------------------------------------

  openVehicleSearch(): void {
    this.close.emit();
    this.requestVehicleSearch.emit();
  }

  onSearch(e: string | { value?: string } | null): void {
    const term = typeof e === 'string' ? e : (e?.value ?? '');
    this.query$.next(term);
  }

  selectBucket(bucket: Bucket): void {
    this.activeBucket = bucket;
    this.activeGroup = undefined;
  }

  selectGroup(group: BucketGroup): void {
    this.activeGroup = group;
  }

  pickGroup(_group: BucketGroup): void {
    this.onCategoryNavigate();
  }

  pickSubgroup(_group: BucketGroup, _sub: { id: number; name: string }): void {
    this.onCategoryNavigate();
  }

  categoryUrl(group: BucketGroup, sub?: { id: number; name: string } | null): string {
    return this.urlHelper.buildCategoryUrl(group.name, sub?.name ?? null);
  }

  onCategoryNavigate(): void {
    this.activeGroup = null;
    this.close.emit();
  }

  // --- Helpers -------------------------------------------------------------

  hasAnyGroups(buckets: Bucket[] | null | undefined): boolean {
    if (!buckets || !buckets.length) { return false; }
    for (const b of buckets) {
      if ((b.groups?.length ?? 0) > 0) { return true; }
    }
    return false;
  }

  trackBucket = (_: number, b: Bucket) => b.key;
  trackGroup = (_: number, g: BucketGroup) => g.code;
  trackSub = (_: number, s: { id: number }) => s.id;
}
