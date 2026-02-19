import { ApiResponse, PaginationMeta } from './types';

/**
 * Utility class for building consistent API responses
 */
export class ApiResponseBuilder {
  /**
   * Build a success response
   */
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      ...(message && { message }),
    };
  }

  /**
   * Build a paginated response
   */
  static paginated<T>(items: T[], page: number, limit: number, total: number): ApiResponse<T[]> {
    const totalPages = Math.ceil(total / limit);

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return {
      success: true,
      data: items,
      meta,
    };
  }

  /**
   * Build a created response (typically for POST)
   */
  static created<T>(data: T, message: string = 'Resource created successfully'): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  /**
   * Build a deleted response (typically for DELETE)
   */
  static deleted(message: string = 'Resource deleted successfully'): ApiResponse<null> {
    return {
      success: true,
      data: null,
      message,
    };
  }
}
