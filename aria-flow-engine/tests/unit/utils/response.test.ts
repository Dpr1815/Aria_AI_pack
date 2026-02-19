import { ApiResponseBuilder } from '../../../src/utils/response';

describe('ApiResponseBuilder', () => {
  // ============================================
  // success
  // ============================================

  describe('success', () => {
    it('should build a success response with data', () => {
      const result = ApiResponseBuilder.success({ id: '1', name: 'Test' });

      expect(result).toEqual({
        success: true,
        data: { id: '1', name: 'Test' },
      });
    });

    it('should include message when provided', () => {
      const result = ApiResponseBuilder.success({ id: '1' }, 'Operation completed');

      expect(result).toEqual({
        success: true,
        data: { id: '1' },
        message: 'Operation completed',
      });
    });

    it('should omit message when not provided', () => {
      const result = ApiResponseBuilder.success('data');

      expect(result).not.toHaveProperty('message');
    });

    it('should handle null data', () => {
      const result = ApiResponseBuilder.success(null);

      expect(result).toEqual({ success: true, data: null });
    });

    it('should handle array data', () => {
      const result = ApiResponseBuilder.success([1, 2, 3]);

      expect(result).toEqual({ success: true, data: [1, 2, 3] });
    });
  });

  // ============================================
  // paginated
  // ============================================

  describe('paginated', () => {
    it('should build a paginated response with correct meta', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const result = ApiResponseBuilder.paginated(items, 1, 20, 42);

      expect(result).toEqual({
        success: true,
        data: items,
        meta: {
          page: 1,
          limit: 20,
          total: 42,
          totalPages: 3,
          hasNextPage: true,
          hasPrevPage: false,
        },
      });
    });

    it('should indicate no next page on the last page', () => {
      const result = ApiResponseBuilder.paginated([], 3, 20, 42);

      expect(result.meta!.hasNextPage).toBe(false);
      expect(result.meta!.hasPrevPage).toBe(true);
    });

    it('should handle single page', () => {
      const result = ApiResponseBuilder.paginated([{ id: '1' }], 1, 20, 1);

      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('should handle empty results', () => {
      const result = ApiResponseBuilder.paginated([], 1, 20, 0);

      expect(result.data).toEqual([]);
      expect(result.meta!.total).toBe(0);
      expect(result.meta!.totalPages).toBe(0);
    });
  });

  // ============================================
  // created
  // ============================================

  describe('created', () => {
    it('should build a created response with default message', () => {
      const result = ApiResponseBuilder.created({ id: '1' });

      expect(result).toEqual({
        success: true,
        data: { id: '1' },
        message: 'Resource created successfully',
      });
    });

    it('should use custom message when provided', () => {
      const result = ApiResponseBuilder.created({ id: '1' }, 'Agent created');

      expect(result.message).toBe('Agent created');
    });
  });

  // ============================================
  // deleted
  // ============================================

  describe('deleted', () => {
    it('should build a deleted response with default message', () => {
      const result = ApiResponseBuilder.deleted();

      expect(result).toEqual({
        success: true,
        data: null,
        message: 'Resource deleted successfully',
      });
    });

    it('should use custom message when provided', () => {
      const result = ApiResponseBuilder.deleted('Agent removed');

      expect(result.message).toBe('Agent removed');
      expect(result.data).toBeNull();
    });
  });
});
