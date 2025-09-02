
export type ParentKey = 'PRIORITETNE' | 'MAZIVA' | 'FILTERI' | 'AUTODELOVI';

export class ArticleCategories {
  articleSubGroups: SubCategories[] = [];
  groupId?: string;
  name?: string;
}

export class SubCategories {
  groupId?: string;
  name?: string;
  subGroupId?: number;
}

export interface CategoryPick {
  kind: 'group' | 'subgroup'; // da znaš da li je kliknuta grupa ili podgrupa
  groupId: string;
  groupName: string;
  subGroupId?: number;
  subGroupName?: string;
}

export interface CategoriesConfig {
  version: number;
  defaults: { fallbackParent: ParentKey };
  parents: Array<{
    key: ParentKey;
    label: string;
    order: number;
    icon?: string;
    include: '*' | string[];
    exclude?: string[];
    show?: boolean;
  }>;
  overrides?: Record<string, { label?: string; slug?: string; icon?: string }>;
}

export interface BucketGroup {
  code: string;
  name: string;
  subgroups: Array<{ id: number; name: string }>;
  slug?: string;
  icon?: string;
}

export interface Bucket {
  key: ParentKey;
  label: string;
  order: number;
  icon?: string;
  groups: BucketGroup[];
}