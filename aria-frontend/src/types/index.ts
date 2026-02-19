/**
 * Global type definitions shared across the application.
 * Feature-specific types should live in their respective feature folder.
 */

/** Generic API response wrapper */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

/** Paginated API response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Generic async state for UI */
export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/** Utility: make specific keys optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Utility: make specific keys required */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;
