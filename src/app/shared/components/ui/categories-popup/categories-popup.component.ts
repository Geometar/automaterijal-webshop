import { Component, EventEmitter, HostListener, Output, ViewEncapsulation } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { CategoriesBucketsService } from '../../../service/utils/categories-buckets.service';
import { Bucket, BucketGroup, CategoryPick } from '../../../data-models/model';
import { AutomIconComponent } from '../../autom-icon/autom-icon.component';
import { PopupComponent } from '../../popup/popup.component';
import { InputFieldsComponent } from '../../input-fields/input-fields.component';
import { InputTypeEnum, PositionEnum, SizeEnum } from '../../../data-models/enums';
import { CommonModule } from '@angular/common';

export interface CategorySelection {
  groupCode: string;
  groupName: string;
  subGroupId?: number;
  subGroupName?: string;
}

@Component({
  selector: 'autom-categories-popup',
  standalone: true,
  imports: [
    CommonModule,
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
  @Output() selected = new EventEmitter<CategoryPick>();

  // Enums
  readonly inputTypeEnum = InputTypeEnum;
  readonly positionEnum = PositionEnum;
  readonly sizeEnum = SizeEnum;
  readonly subPosition = PositionEnum;

  // Observables
  readonly buckets$: Observable<Bucket[]>;
  readonly vm$: Observable<Bucket[]>;

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

  constructor(private bucketsService: CategoriesBucketsService) {
    // Init buckets stream
    this.buckets$ = this.bucketsService.getBuckets$();

    // Derive filtered buckets stream
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
  }

  // --- Handlers -------------------------------------------------------------

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

  pickGroup(group: BucketGroup): void {
    this.selected.emit({
      kind: 'group',
      groupId: group.code,
      groupName: group.name
    });
  }

  pickSubgroup(group: BucketGroup, sub: { id: number; name: string }): void {
    this.selected.emit({
      kind: 'subgroup',
      groupId: group.code,
      groupName: group.name,
      subGroupId: sub.id,
      subGroupName: sub.name
    });
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