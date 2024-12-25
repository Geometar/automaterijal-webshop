interface Sort {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
}

interface Pageable {
  offset: number;
  paged: boolean;
  pageNumber: number;
  pageSize: number;
  sort: Sort;
  unpaged: boolean;
}

export interface PaginatedResponse<T> {
  content: T[]; // This represents the list of actual data
  empty: boolean;
  first: boolean;
  last: boolean;
  number: number;
  numberOfElements: number;
  pageable: Pageable;
  size: number;
  sort: Sort;
  totalElements: number;
  totalPages: number;
}

export function isPaginatedResponse<T>(obj: any): obj is PaginatedResponse<T> {
  return (
    obj &&
    typeof obj.pageable === "object" &&
    typeof obj.totalElements === "number" &&
    typeof obj.totalPages === "number" &&
    typeof obj.content === "object"
  );
}