/**
 * Unit tests for SummaryController
 *
 * Tests the controller layer in isolation by mocking the service layer
 */

import { Request, Response, NextFunction } from 'express';
import { SummaryController } from '@controllers/summary.controller';
import { SummaryService } from '@services/summary.service';
import { ObjectId } from 'mongodb';
import { createObjectId } from '@test/helpers/test-utils';

// Mock the SummaryService
jest.mock('@services/summary.service');

describe('SummaryController', () => {
  let controller: SummaryController;
  let mockService: jest.Mocked<SummaryService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockUserId = createObjectId();
  const mockAgentId = createObjectId();
  const mockTenant = { type: 'personal' as const, userId: mockUserId };

  beforeEach(() => {
    // Create mock service
    mockService = {
      list: jest.fn(),
      getById: jest.fn(),
      delete: jest.fn(),
      generate: jest.fn(),
      getBySessionId: jest.fn(),
      regenerate: jest.fn(),
    } as any;

    controller = new SummaryController(mockService);

    // Setup mock request/response
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { _id: mockUserId } as any,
      tenant: mockTenant,
      tenantAgentIds: [mockAgentId],
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('list', () => {
    it('should return paginated summaries successfully', async () => {
      const mockResult = {
        data: [
          { _id: createObjectId().toString(), content: 'Summary 1' },
          { _id: createObjectId().toString(), content: 'Summary 2' },
        ],
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      };

      mockService.list.mockResolvedValue(mockResult as any);
      mockReq.query = { page: '1', limit: '10' };

      await controller.list(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.list).toHaveBeenCalledWith([mockAgentId], mockReq.query);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult.data,
          meta: expect.objectContaining({
            page: 1,
            limit: 10,
            total: 2,
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockService.list.mockRejectedValue(error);

      await controller.list(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return summary by id successfully', async () => {
      const summaryId = createObjectId().toString();
      const mockSummary = {
        _id: summaryId,
        content: 'Test Summary',
        sessionId: createObjectId().toString(),
      };

      mockService.getById.mockResolvedValue(mockSummary as any);
      mockReq.params = { id: summaryId };

      await controller.getById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getById).toHaveBeenCalledWith(summaryId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockSummary,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors when summary not found', async () => {
      const error = new Error('Summary not found');
      mockService.getById.mockRejectedValue(error);
      mockReq.params = { id: createObjectId().toString() };

      await controller.getById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete summary successfully', async () => {
      const summaryId = createObjectId().toString();
      mockService.delete.mockResolvedValue(undefined);
      mockReq.params = { id: summaryId };

      await controller.delete(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.delete).toHaveBeenCalledWith(summaryId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Summary deleted successfully',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors during deletion', async () => {
      const error = new Error('Failed to delete');
      mockService.delete.mockRejectedValue(error);
      mockReq.params = { id: createObjectId().toString() };

      await controller.delete(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('generate', () => {
    it('should generate summary for session successfully', async () => {
      const sessionId = createObjectId().toString();
      const mockSummary = {
        _id: createObjectId().toString(),
        sessionId,
        content: 'Generated summary',
      };

      mockService.generate.mockResolvedValue(mockSummary as any);
      mockReq.params = { sessionId };

      await controller.generate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.generate).toHaveBeenCalledWith(sessionId);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockSummary,
          message: 'Summary generated successfully',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors during generation', async () => {
      const error = new Error('Generation failed');
      mockService.generate.mockRejectedValue(error);
      mockReq.params = { sessionId: createObjectId().toString() };

      await controller.generate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getBySessionId', () => {
    it('should return summary by session id successfully', async () => {
      const sessionId = createObjectId().toString();
      const mockSummary = {
        _id: createObjectId().toString(),
        sessionId,
        content: 'Test Summary',
      };

      mockService.getBySessionId.mockResolvedValue(mockSummary as any);
      mockReq.params = { sessionId };

      await controller.getBySessionId(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getBySessionId).toHaveBeenCalledWith(sessionId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockSummary,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('regenerate', () => {
    it('should regenerate summary successfully', async () => {
      const sessionId = createObjectId().toString();
      const input = { forceRegenerate: true };
      const mockSummary = {
        _id: createObjectId().toString(),
        sessionId,
        content: 'Regenerated summary',
      };

      mockService.regenerate.mockResolvedValue(mockSummary as any);
      mockReq.params = { sessionId };
      mockReq.body = input;

      await controller.regenerate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.regenerate).toHaveBeenCalledWith(sessionId, input);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockSummary,
          message: 'Summary regenerated successfully',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors during regeneration', async () => {
      const error = new Error('Regeneration failed');
      mockService.regenerate.mockRejectedValue(error);
      mockReq.params = { sessionId: createObjectId().toString() };
      mockReq.body = {};

      await controller.regenerate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
