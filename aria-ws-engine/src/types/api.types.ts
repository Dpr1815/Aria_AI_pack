// ============================================
// API Response Types
// ============================================

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Pagination query parameters (from request)
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

/**
 * Paginated result from service layer
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
/**
 * query options from service layer
 */

export interface QueryOptions {
  skip?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 0 | 1>;
}
/**
 * Successful API response
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

/**
 * Error API response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    errors?: Record<string, string[]>; // Validation errors
    requestId?: string;
    stack?: string;
  };
}

/**
 * Union type for any API response
 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;
