/**
 * Unit tests for CategoryController
 *
 * Tests the controller layer for catalog endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { CategoryController } from '@controllers/category.controller';
import { GoogleTTSConnector } from '@connectors';
import * as modules from '@modules';

// Mock the modules
jest.mock('@modules', () => ({
  getStepCategories: jest.fn(),
  getStepTypesByCategory: jest.fn(),
  getAvailableLanguages: jest.fn(),
  getStatisticsTypes: jest.fn(),
  getSummaryTypes: jest.fn(),
  getStatisticsTypesBySummaryId: jest.fn(),
}));

const mockTts = {
  listVoices: jest.fn().mockResolvedValue([]),
  listLanguages: jest.fn().mockResolvedValue([]),
  clearCache: jest.fn(),
} as unknown as GoogleTTSConnector;

describe('CategoryController', () => {
  let controller: CategoryController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    controller = new CategoryController(mockTts);

    // Setup mock request/response
    mockReq = {
      params: {},
      query: {},
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listCategories', () => {
    it('should return available step categories successfully', async () => {
      const mockCategories = [
        { id: 'information', label: 'Information Collection' },
        { id: 'assessment', label: 'Assessment' },
        { id: 'feedback', label: 'Feedback' },
      ];

      (modules.getStepCategories as jest.Mock).mockReturnValue(mockCategories);

      await controller.listCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(modules.getStepCategories).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockCategories,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Failed to get categories');
      (modules.getStepCategories as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await controller.listCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('listStepTypes', () => {
    it('should return step types for a valid category successfully', async () => {
      const categoryId = 'information';
      const mockStepTypes = [
        { id: 'text-input', label: 'Text Input' },
        { id: 'email-input', label: 'Email Input' },
      ];

      (modules.getStepTypesByCategory as jest.Mock).mockReturnValue(mockStepTypes);
      mockReq.params = { categoryId };

      await controller.listStepTypes(mockReq as Request, mockRes as Response, mockNext);

      expect(modules.getStepTypesByCategory).toHaveBeenCalledWith(categoryId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockStepTypes,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle not found category', async () => {
      const categoryId = 'nonexistent';
      (modules.getStepTypesByCategory as jest.Mock).mockReturnValue(null);
      mockReq.params = { categoryId };

      await controller.listStepTypes(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Step category'),
        })
      );
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle errors during step type retrieval', async () => {
      const error = new Error('Failed to get step types');
      (modules.getStepTypesByCategory as jest.Mock).mockImplementation(() => {
        throw error;
      });
      mockReq.params = { categoryId: 'information' };

      await controller.listStepTypes(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listStatistics', () => {
    it('should return all registered statistics types successfully', async () => {
      const mockStatisticsTypes = [
        { id: 'completion-rate', label: 'Completion Rate' },
        { id: 'average-time', label: 'Average Time' },
        { id: 'satisfaction-score', label: 'Satisfaction Score' },
      ];

      (modules.getStatisticsTypes as jest.Mock).mockReturnValue(mockStatisticsTypes);

      await controller.listStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(modules.getStatisticsTypes).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockStatisticsTypes,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors when getting statistics types', async () => {
      const error = new Error('Failed to get statistics types');
      (modules.getStatisticsTypes as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await controller.listStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listBySummaryType', () => {
    it('should return statistics types for a summary type successfully', async () => {
      const summaryTypeId = 'session-summary';
      const mockStatisticsTypes = [
        { id: 'completion-metrics', label: 'Completion Metrics' },
        { id: 'engagement-metrics', label: 'Engagement Metrics' },
      ];

      (modules.getStatisticsTypesBySummaryId as jest.Mock).mockReturnValue(mockStatisticsTypes);
      mockReq.params = { summaryTypeId };

      await controller.listBySummaryType(mockReq as Request, mockRes as Response, mockNext);

      expect(modules.getStatisticsTypesBySummaryId).toHaveBeenCalledWith(summaryTypeId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockStatisticsTypes,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return empty array for unknown summary type', async () => {
      const summaryTypeId = 'unknown';
      (modules.getStatisticsTypesBySummaryId as jest.Mock).mockReturnValue([]);
      mockReq.params = { summaryTypeId };

      await controller.listBySummaryType(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
        })
      );
    });

    it('should handle errors when getting statistics by summary type', async () => {
      const error = new Error('Failed to get statistics by summary type');
      (modules.getStatisticsTypesBySummaryId as jest.Mock).mockImplementation(() => {
        throw error;
      });
      mockReq.params = { summaryTypeId: 'test' };

      await controller.listBySummaryType(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listSummaries', () => {
    it('should return all registered summary types successfully', async () => {
      const mockSummaryTypes = [
        { id: 'session-summary', label: 'Session Summary' },
        { id: 'conversation-summary', label: 'Conversation Summary' },
        { id: 'agent-summary', label: 'Agent Summary' },
      ];

      (modules.getSummaryTypes as jest.Mock).mockReturnValue(mockSummaryTypes);

      await controller.listSummaries(mockReq as Request, mockRes as Response, mockNext);

      expect(modules.getSummaryTypes).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockSummaryTypes,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors when getting summary types', async () => {
      const error = new Error('Failed to get summary types');
      (modules.getSummaryTypes as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await controller.listSummaries(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should return empty array when no summary types registered', async () => {
      (modules.getSummaryTypes as jest.Mock).mockReturnValue([]);

      await controller.listSummaries(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
        })
      );
    });
  });

  describe('listLanguages', () => {
    it('should return available languages for a conversation type', async () => {
      const mockLanguages = ['en-US', 'en-GB', 'it-IT'];
      (modules.getAvailableLanguages as jest.Mock).mockReturnValue(mockLanguages);
      mockReq.params = { conversationTypeId: 'interview' };

      await controller.listLanguages(mockReq as Request, mockRes as Response, mockNext);

      expect(modules.getAvailableLanguages).toHaveBeenCalledWith('interview');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockLanguages,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return empty array for unknown conversation type', async () => {
      (modules.getAvailableLanguages as jest.Mock).mockReturnValue([]);
      mockReq.params = { conversationTypeId: 'nonexistent' };

      await controller.listLanguages(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
        })
      );
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Failed to get languages');
      (modules.getAvailableLanguages as jest.Mock).mockImplementation(() => {
        throw error;
      });
      mockReq.params = { conversationTypeId: 'interview' };

      await controller.listLanguages(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
