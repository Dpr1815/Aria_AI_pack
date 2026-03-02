/**
 * Unit tests for SessionService
 *
 * Tests the service layer business logic with mocked repositories
 */

import { SessionService } from '@services/session.service';
import { SessionRepository } from '@repositories/session.repository';
import { ParticipantRepository } from '@repositories/participant.repository';
import { createObjectId } from '@test/helpers/test-utils';
import { NotFoundError, ValidationError, ForbiddenError } from '@utils/errors';
import jwt from 'jsonwebtoken';

// Mock all repositories
jest.mock('@repositories/session.repository');
jest.mock('@repositories/participant.repository');

describe('SessionService', () => {
  let sessionService: SessionService;
  let mockSessionRepository: jest.Mocked<SessionRepository>;
  let mockParticipantService: any;
  let mockConversationService: any;
  let mockAgentService: any;

  const mockUserId = createObjectId();
  const mockAgentId = createObjectId();

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repository
    mockSessionRepository = new SessionRepository(null as any) as jest.Mocked<SessionRepository>;

    // Mock services (minimal)
    mockParticipantService = {
      findOrCreateByEmail: jest.fn(),
      getById: jest.fn(),
    };

    mockConversationService = {
      createForSession: jest.fn(),
      deleteBySession: jest.fn(),
    };

    mockAgentService = {
      getAgent: jest.fn(),
    };

    sessionService = new SessionService(
      mockSessionRepository,
      mockParticipantService,
      mockConversationService,
      mockAgentService,
      { jwtSecret: 'test-session-secret' }
    );
  });

  describe('list', () => {
    it('should return paginated sessions', async () => {
      const mockSessions = [
        {
          _id: createObjectId(),
          agentId: createObjectId(),
          participantId: createObjectId(),
          agentOwnerId: mockUserId,
          status: 'active' as const,
          currentStep: 'welcome',
          lastActivityAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: createObjectId(),
          agentId: createObjectId(),
          participantId: createObjectId(),
          agentOwnerId: mockUserId,
          status: 'completed' as const,
          currentStep: 'end',
          lastActivityAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockSessionRepository.findByAgentIdsWithFilters = jest.fn().mockResolvedValue({
        data: mockSessions,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await sessionService.list([mockAgentId], { page: 1, limit: 10 });

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            status: 'active',
          }),
          expect.objectContaining({
            status: 'completed',
          }),
        ]),
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(mockSessionRepository.findByAgentIdsWithFilters).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockSessionRepository.findByAgentIdsWithFilters = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await sessionService.list([mockAgentId], { status: 'active', page: 1, limit: 10 });

      expect(mockSessionRepository.findByAgentIdsWithFilters).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return session by id', async () => {
      const sessionId = createObjectId();
      const mockSession = {
        _id: sessionId,
        agentId: createObjectId(),
        participantId: createObjectId(),
        agentOwnerId: mockUserId,
        status: 'active' as const,
        currentStep: 'welcome',
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSessionRepository.findByIdOrThrow = jest.fn().mockResolvedValue(mockSession);

      const result = await sessionService.getById(sessionId.toString());

      expect(result).toEqual(mockSession);
      expect(mockSessionRepository.findByIdOrThrow).toHaveBeenCalledWith(
        sessionId.toString(),
        'Session'
      );
    });

    it('should throw NotFoundError when session does not exist', async () => {
      const sessionId = createObjectId();
      const error = new NotFoundError('Session', sessionId.toString());
      mockSessionRepository.findByIdOrThrow = jest.fn().mockRejectedValue(error);

      await expect(sessionService.getById(sessionId.toString())).rejects.toThrow(error);
    });
  });

  describe('completeSession', () => {
    it('should complete an active session', async () => {
      const sessionId = createObjectId();
      const activeSession = {
        _id: sessionId,
        agentId: createObjectId(),
        participantId: createObjectId(),
        agentOwnerId: mockUserId,
        status: 'active' as const,
        currentStep: 'final',
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const completedSession = { ...activeSession, status: 'completed' as const };

      mockSessionRepository.findByIdOrThrow = jest.fn().mockResolvedValue(activeSession);
      mockSessionRepository.updateStatus = jest.fn().mockResolvedValue(completedSession);

      const result = await sessionService.completeSession(sessionId.toString());

      expect(result).toEqual(
        expect.objectContaining({
          status: 'completed',
        })
      );
      expect(mockSessionRepository.updateStatus).toHaveBeenCalledWith(sessionId, 'completed');
    });

    it('should throw NotFoundError when session does not exist', async () => {
      const sessionId = createObjectId();
      const error = new NotFoundError('Session', sessionId.toString());
      mockSessionRepository.findByIdOrThrow = jest.fn().mockRejectedValue(error);

      await expect(sessionService.completeSession(sessionId.toString())).rejects.toThrow('Session');
    });
  });

  describe('abandonSession', () => {
    it('should abandon an active session', async () => {
      const sessionId = createObjectId();
      const activeSession = {
        _id: sessionId,
        agentId: createObjectId(),
        participantId: createObjectId(),
        agentOwnerId: mockUserId,
        status: 'active' as const,
        currentStep: 'middle',
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const abandonedSession = { ...activeSession, status: 'abandoned' as const };

      mockSessionRepository.findByIdOrThrow = jest.fn().mockResolvedValue(activeSession);
      mockSessionRepository.updateStatus = jest.fn().mockResolvedValue(abandonedSession);

      const result = await sessionService.abandonSession(sessionId.toString());

      expect(result).toEqual(
        expect.objectContaining({
          status: 'abandoned',
        })
      );
      expect(mockSessionRepository.updateStatus).toHaveBeenCalledWith(sessionId, 'abandoned');
    });
  });

  describe('delete', () => {
    it('should delete session successfully', async () => {
      const sessionId = createObjectId();

      mockConversationService.deleteBySession = jest.fn().mockResolvedValue(undefined);
      mockSessionRepository.deleteByIdOrThrow = jest.fn().mockResolvedValue(undefined);

      await sessionService.delete(sessionId.toString());

      expect(mockSessionRepository.deleteByIdOrThrow).toHaveBeenCalledWith(
        sessionId,
        'Session'
      );
    });
  });

  describe('getAgentStats', () => {
    it('should return session statistics for an agent', async () => {
      const agentId = createObjectId();

      mockSessionRepository.countByAgent = jest.fn().mockResolvedValue(50);
      mockSessionRepository.countByStatus = jest.fn().mockResolvedValue({
        active: 10,
        completed: 35,
        abandoned: 5,
      });

      const result = await sessionService.getAgentStats(agentId.toString());

      expect(result).toEqual({
        total: 50,
        byStatus: {
          active: 10,
          completed: 35,
          abandoned: 5,
        },
      });
    });

    it('should handle agent with no sessions', async () => {
      const agentId = createObjectId();

      mockSessionRepository.countByAgent = jest.fn().mockResolvedValue(0);
      mockSessionRepository.countByStatus = jest.fn().mockResolvedValue({
        active: 0,
        completed: 0,
        abandoned: 0,
      });

      const result = await sessionService.getAgentStats(agentId.toString());

      expect(result).toEqual({
        total: 0,
        byStatus: {
          active: 0,
          completed: 0,
          abandoned: 0,
        },
      });
    });
  });

  // ============================================
  // joinSession
  // ============================================

  describe('joinSession', () => {
    const participantId = createObjectId();
    const sessionId = createObjectId();

    const mockAgent = {
      _id: mockAgentId.toString(),
      ownerId: mockUserId.toString(),
      status: 'active',
      stepOrder: ['intro', 'work', 'conclusion'],
      features: { sessionPersistence: false },
    };

    const mockParticipant = {
      _id: participantId,
      email: 'test@example.com',
      name: 'Test User',
    };

    const mockSession = {
      _id: sessionId,
      agentId: mockAgentId,
      participantId,
      agentOwnerId: mockUserId,
      status: 'active' as const,
      currentStep: 'intro',
      lastActivityAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a new session for active agent', async () => {
      mockAgentService.getAgent.mockResolvedValue(mockAgent);
      mockParticipantService.findOrCreateByEmail.mockResolvedValue({
        participant: mockParticipant,
        created: true,
      });
      mockSessionRepository.create = jest.fn().mockResolvedValue(mockSession);
      mockSessionRepository.updateAccessToken = jest.fn().mockResolvedValue(undefined);
      mockConversationService.createForSession.mockResolvedValue(undefined);

      const result = await sessionService.joinSession({
        agentId: mockAgentId.toString(),
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(result.session).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.isResumed).toBe(false);
      expect(result.participant.email).toBe('test@example.com');
    });

    it('should throw ValidationError when agent is not active', async () => {
      mockAgentService.getAgent.mockResolvedValue({ ...mockAgent, status: 'draft' });

      await expect(
        sessionService.joinSession({
          agentId: mockAgentId.toString(),
          email: 'test@example.com',
        })
      ).rejects.toThrow('not active');
    });

    it('should resume existing session when sessionPersistence is enabled', async () => {
      mockAgentService.getAgent.mockResolvedValue({
        ...mockAgent,
        features: { sessionPersistence: true },
      });
      mockParticipantService.findOrCreateByEmail.mockResolvedValue({
        participant: mockParticipant,
        created: false,
      });
      mockSessionRepository.findActiveSession = jest.fn().mockResolvedValue(mockSession);
      mockSessionRepository.updateAccessToken = jest.fn().mockResolvedValue(undefined);
      mockSessionRepository.findByIdOrThrow = jest.fn().mockResolvedValue(mockSession);

      const result = await sessionService.joinSession({
        agentId: mockAgentId.toString(),
        email: 'test@example.com',
      });

      expect(result.isResumed).toBe(true);
    });

    it('should create new session when no existing session with persistence', async () => {
      mockAgentService.getAgent.mockResolvedValue({
        ...mockAgent,
        features: { sessionPersistence: true },
      });
      mockParticipantService.findOrCreateByEmail.mockResolvedValue({
        participant: mockParticipant,
        created: false,
      });
      mockSessionRepository.findActiveSession = jest.fn().mockResolvedValue(null);
      mockSessionRepository.create = jest.fn().mockResolvedValue(mockSession);
      mockSessionRepository.updateAccessToken = jest.fn().mockResolvedValue(undefined);
      mockConversationService.createForSession.mockResolvedValue(undefined);

      const result = await sessionService.joinSession({
        agentId: mockAgentId.toString(),
        email: 'test@example.com',
      });

      expect(result.isResumed).toBe(false);
    });
  });

  // ============================================
  // testJoinSession
  // ============================================

  describe('testJoinSession', () => {
    const participantId = createObjectId();
    const sessionId = createObjectId();

    const mockAgent = {
      _id: mockAgentId.toString(),
      ownerId: mockUserId.toString(),
      status: 'draft',
      stepOrder: ['intro'],
      features: {},
    };

    const mockSession = {
      _id: sessionId,
      agentId: mockAgentId,
      participantId,
      agentOwnerId: mockUserId,
      status: 'active' as const,
      currentStep: 'intro',
      lastActivityAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should allow owner to test join regardless of agent status', async () => {
      mockAgentService.getAgent.mockResolvedValue(mockAgent);
      mockParticipantService.findOrCreateByEmail.mockResolvedValue({
        participant: { _id: participantId, email: 'owner@test.com' },
        created: true,
      });
      mockSessionRepository.create = jest.fn().mockResolvedValue(mockSession);
      mockSessionRepository.updateAccessToken = jest.fn().mockResolvedValue(undefined);
      mockConversationService.createForSession.mockResolvedValue(undefined);

      const result = await sessionService.testJoinSession(
        { agentId: mockAgentId.toString(), email: 'owner@test.com' },
        { type: 'personal', userId: mockUserId }
      );

      expect(result.session).toBeDefined();
    });

    it('should throw ForbiddenError for personal tenant with different owner', async () => {
      mockAgentService.getAgent.mockResolvedValue(mockAgent);

      await expect(
        sessionService.testJoinSession(
          { agentId: mockAgentId.toString(), email: 'other@test.com' },
          { type: 'personal', userId: createObjectId() }
        )
      ).rejects.toThrow('Access denied');
    });

    it('should allow org member to test join', async () => {
      const orgId = createObjectId();
      mockAgentService.getAgent.mockResolvedValue({
        ...mockAgent,
        organizationId: orgId.toString(),
      });
      mockParticipantService.findOrCreateByEmail.mockResolvedValue({
        participant: { _id: participantId, email: 'member@test.com' },
        created: true,
      });
      mockSessionRepository.create = jest.fn().mockResolvedValue(mockSession);
      mockSessionRepository.updateAccessToken = jest.fn().mockResolvedValue(undefined);
      mockConversationService.createForSession.mockResolvedValue(undefined);

      const result = await sessionService.testJoinSession(
        { agentId: mockAgentId.toString(), email: 'member@test.com' },
        { type: 'organization', userId: createObjectId(), organizationId: orgId, role: 'role_admin' as any, organization: {} as any }
      );

      expect(result.session).toBeDefined();
    });

    it('should throw ForbiddenError for org member from different org', async () => {
      mockAgentService.getAgent.mockResolvedValue({
        ...mockAgent,
        organizationId: createObjectId().toString(),
      });

      await expect(
        sessionService.testJoinSession(
          { agentId: mockAgentId.toString(), email: 'other@test.com' },
          { type: 'organization', userId: createObjectId(), organizationId: createObjectId(), role: 'role_read' as any, organization: {} as any }
        )
      ).rejects.toThrow('Access denied');
    });
  });

  // ============================================
  // getDetailById
  // ============================================

  describe('getDetailById', () => {
    it('should return session detail DTO', async () => {
      const sessionId = createObjectId();
      const mockSession = {
        _id: sessionId,
        agentId: createObjectId(),
        participantId: createObjectId(),
        status: 'active' as const,
        currentStep: 'intro',
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        data: { key: 'value' },
        videoLinks: ['https://example.com/video'],
      };

      mockSessionRepository.findByIdOrThrow = jest.fn().mockResolvedValue(mockSession);

      const result = await sessionService.getDetailById(sessionId.toString());

      expect(result.data).toEqual({ key: 'value' });
      expect(result.videoLinks).toEqual(['https://example.com/video']);
    });
  });

  // ============================================
  // listByAgent
  // ============================================

  describe('listByAgent', () => {
    it('should return sessions with participant info', async () => {
      const participantId = createObjectId();
      const mockSessions = [{
        _id: createObjectId(),
        agentId: mockAgentId,
        participantId,
        status: 'active' as const,
        currentStep: 'intro',
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        participant: { _id: participantId, email: 'test@example.com', name: 'Test' },
      }];

      mockSessionRepository.findByAgentWithParticipant = jest.fn().mockResolvedValue({
        data: mockSessions,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await sessionService.listByAgent(mockAgentId.toString(), { page: 1, limit: 10 });

      expect(result.data[0].participant.email).toBe('test@example.com');
    });

    it('should pass participantId filter when provided', async () => {
      const participantId = createObjectId();
      mockSessionRepository.findByAgentWithParticipant = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await sessionService.listByAgent(mockAgentId.toString(), {
        page: 1,
        limit: 10,
        participantId: participantId.toString(),
      });

      expect(mockSessionRepository.findByAgentWithParticipant).toHaveBeenCalledWith(
        mockAgentId,
        expect.objectContaining({ participantId })
      );
    });
  });

  // ============================================
  // refreshAccessToken
  // ============================================

  describe('refreshAccessToken', () => {
    it('should refresh token for active session', async () => {
      const sessionId = createObjectId();
      const mockSession = {
        _id: sessionId,
        agentId: mockAgentId,
        participantId: createObjectId(),
        status: 'active' as const,
        currentStep: 'intro',
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSessionRepository.findByIdOrThrow = jest.fn().mockResolvedValue(mockSession);
      mockSessionRepository.updateAccessToken = jest.fn().mockResolvedValue(undefined);

      const result = await sessionService.refreshAccessToken(sessionId.toString());

      expect(result.accessToken).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should throw when session is not active', async () => {
      const sessionId = createObjectId();
      mockSessionRepository.findByIdOrThrow = jest.fn().mockResolvedValue({
        _id: sessionId,
        status: 'completed',
      });

      await expect(
        sessionService.refreshAccessToken(sessionId.toString())
      ).rejects.toThrow('non-active session');
    });
  });

  // ============================================
  // validateAccessToken
  // ============================================

  describe('validateAccessToken', () => {
    it('should validate a valid token', async () => {
      const sessionId = createObjectId();
      const mockSession = {
        _id: sessionId,
        status: 'active' as const,
        participantId: createObjectId(),
        agentId: mockAgentId,
      };

      // Generate a real JWT for testing
      const payload = {
        sub: sessionId.toString(),
        sid: sessionId.toString(),
        pid: mockSession.participantId.toString(),
        aid: mockAgentId.toString(),
        type: 'session_access',
      };
      const token = jwt.sign(payload, 'test-session-secret', { expiresIn: 7200 });

      mockSessionRepository.findByAccessTokenHash = jest.fn().mockResolvedValue(mockSession);

      const result = await sessionService.validateAccessToken(token);

      expect(result.valid).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.payload).toBeDefined();
    });

    it('should reject token with wrong type', async () => {
      const payload = {
        sub: 'test',
        type: 'wrong_type',
      };
      const token = jwt.sign(payload, 'test-session-secret', { expiresIn: 7200 });

      const result = await sessionService.validateAccessToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token type');
    });

    it('should reject when session not found', async () => {
      const payload = {
        sub: 'test',
        sid: 'test',
        pid: 'test',
        aid: 'test',
        type: 'session_access',
      };
      const token = jwt.sign(payload, 'test-session-secret', { expiresIn: 7200 });

      mockSessionRepository.findByAccessTokenHash = jest.fn().mockResolvedValue(null);

      const result = await sessionService.validateAccessToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject when session is completed', async () => {
      const payload = {
        sub: 'test',
        sid: 'test',
        pid: 'test',
        aid: 'test',
        type: 'session_access',
      };
      const token = jwt.sign(payload, 'test-session-secret', { expiresIn: 7200 });

      mockSessionRepository.findByAccessTokenHash = jest.fn().mockResolvedValue({
        _id: createObjectId(),
        status: 'completed',
      });

      const result = await sessionService.validateAccessToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session is completed');
    });

    it('should reject expired token', async () => {
      const payload = {
        sub: 'test',
        type: 'session_access',
      };
      const token = jwt.sign(payload, 'test-session-secret', { expiresIn: -1 });

      const result = await sessionService.validateAccessToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });

    it('should reject invalid token', async () => {
      const result = await sessionService.validateAccessToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });
  });

  // ============================================
  // listByOwner
  // ============================================

  describe('listByOwner', () => {
    it('should return sessions for owner', async () => {
      mockSessionRepository.findByOwner = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const result = await sessionService.listByOwner(mockUserId, { page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(mockSessionRepository.findByOwner).toHaveBeenCalled();
    });

    it('should pass agentId filter when provided', async () => {
      mockSessionRepository.findByOwner = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await sessionService.listByOwner(mockUserId, {
        page: 1,
        limit: 10,
        agentId: mockAgentId.toString(),
      });

      expect(mockSessionRepository.findByOwner).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ agentId: mockAgentId })
      );
    });
  });

  // ============================================
  // abandonSession (not found case)
  // ============================================

  describe('abandonSession edge cases', () => {
    it('should throw NotFoundError when session does not exist', async () => {
      const sessionId = createObjectId();
      const error = new NotFoundError('Session', sessionId.toString());
      mockSessionRepository.findByIdOrThrow = jest.fn().mockRejectedValue(error);

      await expect(sessionService.abandonSession(sessionId.toString())).rejects.toThrow('Session');
    });
  });

  // ============================================
  // list with filter params
  // ============================================

  describe('list with filter params', () => {
    it('should pass agentId and participantId filters', async () => {
      const participantId = createObjectId();
      mockSessionRepository.findByAgentIdsWithFilters = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await sessionService.list([mockAgentId], {
        page: 1,
        limit: 10,
        agentId: mockAgentId.toString(),
        participantId: participantId.toString(),
      });

      expect(mockSessionRepository.findByAgentIdsWithFilters).toHaveBeenCalledWith(
        [mockAgentId],
        expect.objectContaining({
          agentId: expect.any(Object),
          participantId: expect.any(Object),
        })
      );
    });
  });
});
