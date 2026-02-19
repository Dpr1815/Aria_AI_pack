/**
 * Unit tests for SessionController
 *
 * Tests the controller layer in isolation by mocking the service layer
 */

import { Request, Response, NextFunction } from 'express';
import { SessionController } from '@controllers/session.controller';
import { SessionService } from '@services/session.service';
import { ObjectId } from 'mongodb';
import { createObjectId } from '@test/helpers/test-utils';

// Mock the SessionService
jest.mock('@services/session.service');

describe('SessionController', () => {
  let controller: SessionController;
  let mockService: jest.Mocked<SessionService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockUserId = createObjectId();
  const mockAgentId = createObjectId();
  const mockTenant = { type: 'personal' as const, userId: mockUserId };

  beforeEach(() => {
    // Create mock service
    mockService = {
      joinSession: jest.fn(),
      getDetailById: jest.fn(),
      list: jest.fn(),
      listByAgent: jest.fn(),
      completeSession: jest.fn(),
      abandonSession: jest.fn(),
      delete: jest.fn(),
      refreshAccessToken: jest.fn(),
      getAgentStats: jest.fn(),
    } as any;

    const mockVideoService = {} as any;
    controller = new SessionController(mockService, mockVideoService);

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

  describe('join', () => {
    it('should create a new session successfully', async () => {
      const joinInput = {
        agentId: createObjectId().toString(),
        participantEmail: 'test@example.com',
      };
      const mockResult = {
        session: { _id: createObjectId().toString() },
        participant: { _id: createObjectId().toString() },
        isResumed: false,
      };

      mockService.joinSession.mockResolvedValue(mockResult as any);
      mockReq.body = joinInput;

      await controller.join(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.joinSession).toHaveBeenCalledWith(joinInput);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult,
          message: 'Session created successfully',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should resume an existing session', async () => {
      const joinInput = {
        agentId: createObjectId().toString(),
        participantEmail: 'test@example.com',
      };
      const mockResult = {
        session: { _id: createObjectId().toString() },
        participant: { _id: createObjectId().toString() },
        isResumed: true,
      };

      mockService.joinSession.mockResolvedValue(mockResult as any);
      mockReq.body = joinInput;

      await controller.join(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.joinSession).toHaveBeenCalledWith(joinInput);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult,
          message: 'Session resumed successfully',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors during join', async () => {
      const error = new Error('Failed to join session');
      mockService.joinSession.mockRejectedValue(error);
      mockReq.body = { agentId: createObjectId().toString() };

      await controller.join(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('should return session details by id successfully', async () => {
      const sessionId = createObjectId().toString();
      const mockDetail = {
        _id: sessionId,
        agentId: createObjectId().toString(),
        participantId: createObjectId().toString(),
        status: 'active',
      };

      mockService.getDetailById.mockResolvedValue(mockDetail as any);
      mockReq.params = { id: sessionId };

      await controller.getById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getDetailById).toHaveBeenCalledWith(sessionId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockDetail,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors when session not found', async () => {
      const error = new Error('Session not found');
      mockService.getDetailById.mockRejectedValue(error);
      mockReq.params = { id: createObjectId().toString() };

      await controller.getById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('list', () => {
    it('should return paginated sessions successfully', async () => {
      const mockResult = {
        data: [
          { _id: createObjectId().toString(), status: 'active' },
          { _id: createObjectId().toString(), status: 'completed' },
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
  });

  describe('listByAgent', () => {
    it('should return sessions for specific agent', async () => {
      const agentId = createObjectId().toString();
      const mockResult = {
        data: [{ _id: createObjectId().toString(), agentId }],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      };

      mockService.listByAgent.mockResolvedValue(mockResult as any);
      mockReq.params = { agentId };
      mockReq.query = { page: '1', limit: '10' };

      await controller.listByAgent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.listByAgent).toHaveBeenCalledWith(agentId, mockReq.query);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult.data,
        })
      );
    });
  });

  describe('complete', () => {
    it('should complete session successfully', async () => {
      const sessionId = createObjectId().toString();
      const mockCompleted = {
        _id: sessionId,
        status: 'completed',
      };

      mockService.completeSession.mockResolvedValue(mockCompleted as any);
      mockReq.params = { id: sessionId };

      await controller.complete(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.completeSession).toHaveBeenCalledWith(sessionId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockCompleted,
          message: 'Session completed successfully',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors during completion', async () => {
      const error = new Error('Failed to complete session');
      mockService.completeSession.mockRejectedValue(error);
      mockReq.params = { id: createObjectId().toString() };

      await controller.complete(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('abandon', () => {
    it('should abandon session successfully', async () => {
      const sessionId = createObjectId().toString();
      const mockAbandoned = {
        _id: sessionId,
        status: 'abandoned',
      };

      mockService.abandonSession.mockResolvedValue(mockAbandoned as any);
      mockReq.params = { id: sessionId };

      await controller.abandon(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.abandonSession).toHaveBeenCalledWith(sessionId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockAbandoned,
          message: 'Session abandoned successfully',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete session successfully', async () => {
      const sessionId = createObjectId().toString();
      mockService.delete.mockResolvedValue(undefined);
      mockReq.params = { id: sessionId };

      await controller.delete(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.delete).toHaveBeenCalledWith(sessionId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Session deleted successfully',
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

  describe('refreshToken', () => {
    it('should refresh access token successfully', async () => {
      const sessionId = createObjectId().toString();
      const mockResult = {
        accessToken: 'new-access-token',
        expiresAt: new Date(),
      };

      mockService.refreshAccessToken.mockResolvedValue(mockResult as any);
      mockReq.params = { id: sessionId };

      await controller.refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.refreshAccessToken).toHaveBeenCalledWith(sessionId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult,
          message: 'Token refreshed successfully',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors during token refresh', async () => {
      const error = new Error('Failed to refresh token');
      mockService.refreshAccessToken.mockRejectedValue(error);
      mockReq.params = { id: createObjectId().toString() };

      await controller.refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getStats', () => {
    it('should return agent session statistics successfully', async () => {
      const agentId = createObjectId().toString();
      const mockStats = {
        total: 100,
        byStatus: {
          active: 10,
          completed: 80,
          abandoned: 10,
        },
      };

      mockService.getAgentStats.mockResolvedValue(mockStats);
      mockReq.params = { agentId };

      await controller.getStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getAgentStats).toHaveBeenCalledWith(agentId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockStats,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors when getting stats', async () => {
      const error = new Error('Failed to get stats');
      mockService.getAgentStats.mockRejectedValue(error);
      mockReq.params = { agentId: createObjectId().toString() };

      await controller.getStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
