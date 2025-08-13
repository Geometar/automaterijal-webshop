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