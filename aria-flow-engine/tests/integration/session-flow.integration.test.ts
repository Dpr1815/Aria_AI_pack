/**
 * Integration tests for Session flow
 *
 * Tests session lifecycle from creation to completion/abandonment
 */

import { SessionController } from '@controllers/session.controller';
import { SessionService } from '@services/session.service';
import { SessionRepository } from '@repositories/session.repository';
import {
  createMockDatabase,
  mockFindOne,
  mockInsertOne,
  mockFindOneAndUpdate,
  mockDeleteOne,
  mockDeleteMany,
  mockAggregate,
  mockFind,
  mockCountDocuments,
} from '@test/mocks/database.mock';
import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';

describe('Session Flow - Integration', () => {
  let sessionController: SessionController;
  let sessionService: SessionService;
  let sessionRepository: SessionRepository;
  let mockDb: ReturnType<typeof createMockDatabase>;

  const mockUserId = new ObjectId();
  const mockAgentId = new ObjectId();
  const mockParticipantId = new ObjectId();
  const mockSessionId = new ObjectId();
  const mockTenant = { type: 'personal' as const, userId: mockUserId };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup the stack with mocked database
    mockDb = createMockDatabase();
    sessionRepository = new SessionRepository(mockDb);

    // Mock service dependencies
    const mockParticipantService = {
      findOrCreateByEmail: jest.fn().mockResolvedValue({
        participant: {
          _id: mockParticipantId,
          email: 'participant@example.com',
          name: 'Test Participant',
        },
        created: false,
      }),
    } as any;

    const mockConversationService = {
      createForSession: jest.fn().mockResolvedValue({
        _id: new ObjectId(),
        sessionId: mockSessionId,
      }),
      deleteBySession: jest.fn(),
    } as any;

    const mockAgentService = {
      getAgent: jest.fn().mockResolvedValue({
        _id: mockAgentId,
        ownerId: mockUserId,
        label: 'Test Agent',
        status: 'active',
      }),
    } as any;

    sessionService = new SessionService(
      sessionRepository,
      mockParticipantService,
      mockConversationService,
      mockAgentService,
      { jwtSecret: 'test-session-secret' }
    );
    sessionController = new SessionController(sessionService, {} as any);
  });

  describe('List sessions -> Complete -> Delete flow', () => {
    it('should complete full session management flow', async () => {
      // ============ STEP 1: LIST SESSIONS ============
      const mockSessions = [
        {
          _id: new ObjectId(),
          agentId: mockAgentId,
          participantId: mockParticipantId,
          agentOwnerId: mockUserId,
          status: 'active' as const,
          currentStep: 'welcome',
          lastActivityAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          agentId: mockAgentId,
          participantId: mockParticipantId,
          agentOwnerId: mockUserId,
          status: 'completed' as const,
          currentStep: 'end',
          lastActivityAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
        },
      ];

      const sessionsCollection = mockDb.getCollection('sessions');
      mockFind(sessionsCollection, mockSessions);
      mockCountDocuments(sessionsCollection, 2);

      const listReq = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        tenantAgentIds: [mockAgentId],
        query: { page: '1', limit: '10' },
      } as unknown as Request;

      const listRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await sessionController.list(listReq, listRes, next);

      expect(listRes.status).toHaveBeenCalledWith(200);
      expect(listRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              status: 'active',
            }),
            expect.objectContaining({
              status: 'completed',
            }),
          ]),
          meta: expect.objectContaining({
            page: '1',
            limit: '10',
            total: 2,
          }),
        })
      );

      // ============ STEP 2: COMPLETE SESSION ============
      jest.clearAllMocks();

      const activeSessionId = mockSessions[0]._id;
      const completedSession = {
        ...mockSessions[0],
        status: 'completed' as const,
        completedAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindOne(sessionsCollection, mockSessions[0]);
      mockFindOneAndUpdate(sessionsCollection, completedSession);

      const completeReq = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { sessionId: activeSessionId.toString() },
      } as unknown as Request;

      const completeRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await sessionController.complete(completeReq, completeRes, next);

      expect(completeRes.status).toHaveBeenCalledWith(200);
      expect(completeRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'completed',
          }),
        })
      );

      // ============ STEP 3: DELETE SESSION ============
      jest.clearAllMocks();

      // Mock findByIdOrThrow (used by deleteByIdOrThrow)
      mockFindOne(sessionsCollection, mockSessions[0]);

      // Mock conversation deletion (called by SessionService.delete)
      const conversationsCollection = mockDb.getCollection('conversations');
      mockDeleteMany(conversationsCollection, 1);

      mockDeleteOne(sessionsCollection, 1);

      const deleteReq = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { id: activeSessionId.toString() },
      } as unknown as Request;

      const deleteRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await sessionController.delete(deleteReq, deleteRes, next);

      expect(deleteRes.status).toHaveBeenCalledWith(200);
      expect(deleteRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: null,
          message: expect.stringContaining('deleted'),
        })
      );
    });
  });

  describe('Abandon session flow', () => {
    it('should abandon an active session', async () => {
      const activeSession = {
        _id: mockSessionId,
        agentId: mockAgentId,
        participantId: mockParticipantId,
        agentOwnerId: mockUserId,
        status: 'active' as const,
        currentStep: 'middle',
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const abandonedSession = {
        ...activeSession,
        status: 'abandoned' as const,
        updatedAt: new Date(),
      };

      const sessionsCollection = mockDb.getCollection('sessions');
      mockFindOne(sessionsCollection, activeSession);
      mockFindOneAndUpdate(sessionsCollection, abandonedSession);

      const req = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { sessionId: mockSessionId.toString() },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await sessionController.abandon(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'abandoned',
          }),
        })
      );
    });
  });

  describe('Get session stats flow', () => {
    it('should retrieve session statistics for an agent', async () => {
      const sessionsCollection = mockDb.getCollection('sessions');

      // Mock countByStatus aggregation - returns groups by status
      mockAggregate(sessionsCollection, [
        { _id: 'active', count: 10 },
        { _id: 'completed', count: 35 },
        { _id: 'abandoned', count: 5 },
      ]);

      const req = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { agentId: mockAgentId.toString() },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await sessionController.getStats(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            total: 50,
            byStatus: expect.objectContaining({
              active: 10,
              completed: 35,
              abandoned: 5,
            }),
          }),
        })
      );
    });
  });

  describe('Get session by ID flow', () => {
    it('should retrieve session details by ID', async () => {
      const mockSession = {
        _id: mockSessionId,
        agentId: mockAgentId,
        participantId: mockParticipantId,
        agentOwnerId: mockUserId,
        status: 'active' as const,
        currentStep: 'information',
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const sessionsCollection = mockDb.getCollection('sessions');
      mockFindOne(sessionsCollection, mockSession);

      const req = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { sessionId: mockSessionId.toString() },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await sessionController.getById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            _id: mockSessionId.toString(),
            status: 'active',
            currentStep: 'information',
          }),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle session not found', async () => {
      const sessionsCollection = mockDb.getCollection('sessions');
      mockFindOne(sessionsCollection, null);

      const req = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { sessionId: mockSessionId.toString() },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await sessionController.complete(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Session'),
        })
      );
    });
  });
});
