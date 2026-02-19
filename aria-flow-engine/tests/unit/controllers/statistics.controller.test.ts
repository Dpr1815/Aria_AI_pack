/**
 * Unit tests for StatisticsController
 *
 * Tests the controller layer in isolation by mocking the service layer
 */

import { Request, Response, NextFunction } from 'express';
import { StatisticsController } from '@controllers/statistics.controller';
import { StatisticsService } from '@services/statistics.service';
import { createObjectId } from '@test/helpers/test-utils';

// Mock the StatisticsService
jest.mock('@services/statistics.service');

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let mockService: jest.Mocked<StatisticsService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Create mock service
    mockService = {
      getAgentStatistics: jest.fn(),
      calculateAgentStatistics: jest.fn(),
      deleteAgentStatistics: jest.fn(),
    } as any;

    controller = new StatisticsController(mockService);

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

  describe('getAgentStatistics', () => {
    it('should return agent statistics successfully', async () => {
      const agentId = createObjectId().toString();
      const mockStatistics = {
        agentId,
        totalSessions: 100,
        completedSessions: 80,
        averageCompletionTime: 45.5,
        participantCount: 50,
        metrics: {
          satisfaction: 4.5,
          completionRate: 0.8,
        },
      };

      mockService.getAgentStatistics.mockResolvedValue(mockStatistics as any);
      mockReq.params = { agentId };

      await controller.getAgentStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getAgentStatistics).toHaveBeenCalledWith(agentId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockStatistics,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors when statistics not found', async () => {
      const error = new Error('Statistics not found');
      mockService.getAgentStatistics.mockRejectedValue(error);
      mockReq.params = { agentId: createObjectId().toString() };

      await controller.getAgentStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockService.getAgentStatistics.mockRejectedValue(error);
      mockReq.params = { agentId: createObjectId().toString() };

      await controller.getAgentStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('calculateAgentStatistics', () => {
    it('should calculate agent statistics successfully', async () => {
      const agentId = createObjectId().toString();
      const mockCalculatedStatistics = {
        agentId,
        totalSessions: 100,
        completedSessions: 85,
        averageCompletionTime: 42.3,
        participantCount: 55,
        metrics: {
          satisfaction: 4.7,
          completionRate: 0.85,
        },
        calculatedAt: new Date(),
      };

      mockService.calculateAgentStatistics.mockResolvedValue(mockCalculatedStatistics as any);
      mockReq.params = { agentId };

      await controller.calculateAgentStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.calculateAgentStatistics).toHaveBeenCalledWith(agentId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockCalculatedStatistics,
          message: 'Statistics calculated successfully',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors during calculation', async () => {
      const error = new Error('Calculation failed');
      mockService.calculateAgentStatistics.mockRejectedValue(error);
      mockReq.params = { agentId: createObjectId().toString() };

      await controller.calculateAgentStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle insufficient data error', async () => {
      const error = new Error('Insufficient session data to calculate statistics');
      mockService.calculateAgentStatistics.mockRejectedValue(error);
      mockReq.params = { agentId: createObjectId().toString() };

      await controller.calculateAgentStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteAgentStatistics', () => {
    it('should delete agent statistics successfully', async () => {
      const agentId = createObjectId().toString();
      mockService.deleteAgentStatistics.mockResolvedValue(undefined);
      mockReq.params = { agentId };

      await controller.deleteAgentStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.deleteAgentStatistics).toHaveBeenCalledWith(agentId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Agent statistics deleted successfully',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors during deletion', async () => {
      const error = new Error('Failed to delete statistics');
      mockService.deleteAgentStatistics.mockRejectedValue(error);
      mockReq.params = { agentId: createObjectId().toString() };

      await controller.deleteAgentStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle not found error gracefully', async () => {
      const error = new Error('Statistics not found');
      mockService.deleteAgentStatistics.mockRejectedValue(error);
      mockReq.params = { agentId: createObjectId().toString() };

      await controller.deleteAgentStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
