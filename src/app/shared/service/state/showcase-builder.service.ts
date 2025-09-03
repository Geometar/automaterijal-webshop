import { Injectable } from '@angular/core';
import { CategoriesStateService } from './categories-state.service';
import {
  ArticleCategories,
  SubCategories,
} from '../../data-models/model/article-categories';
import { Filter, Roba } from '../../data-models/model/roba';
import { map, switchMap, forkJoin, Observable, of } from 'rxjs';
import { RobaService } from '../roba.service';
import categoriesConfigJson from '../../../../../public/config/categories-config.json';

interface ShowcaseSection {
  subGroup: SubCategories & { groupCode: string };
  products: Roba[];
}

@Injectable({ providedIn: 'root' })
export class ShowcaseBuilderService {
  private readonly PRIORITETNE_GRUPE = ['ADO', 'PRI', 'ALATI'];
  private readonly MAZIVA_GRUPE = ['MPU', 'MTR', 'MIZ', 'MOM', 'MOS'];

  private readonly config = categoriesConfigJson;

  constructor(
    private robaService: RobaService,
    private categoryState: CategoriesStateService
  ) { }

  public buildShowcase$(): Observable<ShowcaseSection[]> {
    return this.categoryState.getCategories$().pipe(
      switchMap((categories: ArticleCategories[]) => {
        const groupIdToCodeMap: Record<string, string> = {};

        // 1. Mapiraj groupId -> groupCode na osnovu config.include
        categories.forEach((cat) => {
          if (!cat.groupId) return;

          const matchingParent = this.config.parents.find((parent) => {
            if (parent.include === '*') return false;
            return parent.include.includes(cat.groupId!);
          });

          if (matchingParent) {
            groupIdToCodeMap[cat.groupId] = cat.groupId;
          }
        });

        // 2. Sastavi sve podgrupe sa pripadajućim groupCode
        const allSubgroups = categories.flatMap((cat) =>
          cat.articleSubGroups.map((sub) => ({
            ...sub,
            groupId: cat.groupId,
            groupCode: groupIdToCodeMap[cat.groupId!],
          }))
        );

        // 3. Random odabir podgrupa
        const prioritized = this.pickRandomSubgroups(
          allSubgroups,
          this.PRIORITETNE_GRUPE,
          3
        );
        const maziva = this.pickRandomSubgroups(
          allSubgroups,
          this.MAZIVA_GRUPE,
          2
        );

        const selectedSubgroups = [...prioritized, ...maziva];

        // 4. Za svaku podgrupu, traži robu sa slikama
        const requests = selectedSubgroups.map((subgroup) => {
          const filter = new Filter();
          filter.podgrupe = [subgroup.subGroupId!.toString()];
          filter.naStanju = true;

          return this.robaService
            .pronadjiSvuRobu(null, 10, 0, '', filter)
            .pipe(
              map((res) => ({
                subGroup: subgroup,
                products: res.robaDto!.content.filter(
                  (r) => !!r.slika?.slikeUrl
                ),
              }))
            );
        });

        return requests.length ? forkJoin(requests) : of([]);
      })
    );
  }

  private pickRandomSubgroups(
    all: (SubCategories & { groupCode: string })[],
    allowedGroups: string[],
    maxPerGroup: number
  ): (SubCategories & { groupCode: string })[] {
    const result: (SubCategories & { groupCode: string })[] = [];

    allowedGroups.forEach((groupCode) => {
      const candidates = all.filter((s) => s.groupCode === groupCode);
      const shuffled = candidates.sort(() => Math.random() - 0.5);
      result.push(...shuffled.slice(0, maxPerGroup));
    });

    return result;
  }
}