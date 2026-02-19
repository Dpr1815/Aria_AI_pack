/**
 * Integration tests for Summary flow
 *
 * Tests summary CRUD operations from controller to repository
 */

import { SummaryController } from '@controllers/summary.controller';
import { SummaryService } from '@services/summary.service';
import { SummaryRepository } from '@repositories/summary.repository';
import { SessionRepository } from '@repositories/session.repository';
import { AgentRepository } from '@repositories/agent.repository';
import { AgentStepRepository } from '@repositories/agent-step.repository';
import { AgentAssessmentRepository } from '@repositories/agent-assessment.repository';
import { ConversationService } from '@services/conversation.service';
import { ConversationRepository } from '@repositories/conversation.repository';
import {
  createMockDatabase,
  mockFindOne,
  mockDeleteOne,
  mockFind,
  mockCountDocuments,
} from '@test/mocks/database.mock';
import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';

describe('Summary Flow - Integration', () => {
  let summaryController: SummaryController;
  let summaryService: SummaryService;
  let summaryRepository: SummaryRepository;
  let sessionRepository: SessionRepository;
  let agentRepository: AgentRepository;
  let agentStepRepository: AgentStepRepository;
  let agentAssessmentRepository: AgentAssessmentRepository;
  let conversationService: ConversationService;
  let mockDb: ReturnType<typeof createMockDatabase>;

  const mockUserId = new ObjectId();
  const mockAgentId = new ObjectId();
  const mockSessionId = new ObjectId();
  const mockParticipantId = new ObjectId();
  const mockSummaryId = new ObjectId();
  const mockTenant = { type: 'personal' as const, userId: mockUserId };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup the stack with mocked database
    mockDb = createMockDatabase();
    summaryRepository = new SummaryRepository(mockDb);
    sessionRepository = new SessionRepository(mockDb);
    agentRepository = new AgentRepository(mockDb);
    agentStepRepository = new AgentStepRepository(mockDb);
    agentAssessmentRepository = new AgentAssessmentRepository(mockDb);

    const conversationRepository = new ConversationRepository(mockDb);
    conversationService = new ConversationService(conversationRepository);

    // Mock AI services (not testing OpenAI integration here)
    const mockOpenAIService = {} as any;
    const mockPromptBuilder = {} as any;

    summaryService = new SummaryService(
      summaryRepository,
      sessionRepository,
      agentRepository,
      agentStepRepository,
      agentAssessmentRepository,
      conversationService,
      mockOpenAIService,
      mockPromptBuilder
    );
    summaryController = new SummaryController(summaryService);
  });

  describe('List summaries -> GetById -> GetBySessionId -> Delete flow', () => {
    it('should complete full summary management flow', async () => {
      // ============ STEP 1: LIST SUMMARIES ============
      const mockSummaries = [
        {
          _id: new ObjectId(),
          sessionId: new ObjectId(),
          agentId: mockAgentId,
          participantId: mockParticipantId,
          typeId: 'interview-summary',
          data: {
            experience: 'senior',
            technicalSkills: ['JavaScript', 'TypeScript'],
          },
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: mockSummaryId,
          sessionId: mockSessionId,
          agentId: mockAgentId,
          participantId: mockParticipantId,
          typeId: 'interview-summary',
          data: {
            experience: 'mid',
            technicalSkills: ['Python', 'Java'],
          },
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const summariesCollection = mockDb.getCollection('summaries');

      // Mock find and count for pagination
      mockFind(summariesCollection, mockSummaries);
      mockCountDocuments(summariesCollection, 2);

      const listReq = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        tenantAgentIds: [mockAgentId],
        query: {
          agentId: mockAgentId.toString(),
          page: '1',
          limit: '10',
        },
      } as unknown as Request;

      const listRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await summaryController.list(listReq, listRes, next);

      expect(listRes.status).toHaveBeenCalledWith(200);
      expect(listRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              agentId: mockAgentId.toString(),
              typeId: 'interview-summary',
            }),
          ]),
          meta: expect.objectContaining({
            page: '1',
            limit: '10',
            total: 2,
          }),
        })
      );

      // ============ STEP 2: GET BY ID ============
      jest.clearAllMocks();

      mockFindOne(summariesCollection, mockSummaries[1]);

      const getByIdReq = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { id: mockSummaryId.toString() },
      } as unknown as Request;

      const getByIdRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await summaryController.getById(getByIdReq, getByIdRes, next);

      expect(getByIdRes.status).toHaveBeenCalledWith(200);
      expect(getByIdRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            _id: mockSummaryId.toString(),
            sessionId: mockSessionId.toString(),
            typeId: 'interview-summary',
          }),
        })
      );

      // ============ STEP 3: GET BY SESSION ID ============
      jest.clearAllMocks();

      // Mock summary lookup by sessionId (findBySessionId → findOne)
      mockFindOne(summariesCollection, mockSummaries[1]);

      const getBySessionReq = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { sessionId: mockSessionId.toString() },
      } as unknown as Request;

      const getBySessionRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await summaryController.getBySessionId(getBySessionReq, getBySessionRes, next);

      expect(getBySessionRes.status).toHaveBeenCalledWith(200);
      expect(getBySessionRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            sessionId: mockSessionId.toString(),
            typeId: 'interview-summary',
            data: expect.objectContaining({
              experience: 'mid',
              technicalSkills: ['Python', 'Java'],
            }),
          }),
        })
      );

      // ============ STEP 4: DELETE SUMMARY ============
      jest.clearAllMocks();

      // Mock findByIdOrThrow (used by deleteByIdOrThrow)
      mockFindOne(summariesCollection, mockSummaries[1]);

      mockDeleteOne(summariesCollection, 1);

      const deleteReq = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { id: mockSummaryId.toString() },
      } as unknown as Request;

      const deleteRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await summaryController.delete(deleteReq, deleteRes, next);

      expect(deleteRes.status).toHaveBeenCalledWith(200);
      expect(deleteRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: null,
          message: 'Summary deleted successfully',
        })
      );
    });
  });

  describe('List with different filters', () => {
    it('should filter summaries by participant ID', async () => {
      const mockSummaries = [
        {
          _id: new ObjectId(),
          sessionId: new ObjectId(),
          agentId: mockAgentId,
          participantId: mockParticipantId,
          typeId: 'interview-summary',
          data: { experience: 'senior' },
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const summariesCollection = mockDb.getCollection('summaries');
      mockFind(summariesCollection, mockSummaries);
      mockCountDocuments(summariesCollection, 1);

      const req = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        tenantAgentIds: [mockAgentId],
        query: {
          participantId: mockParticipantId.toString(),
          page: '1',
          limit: '10',
        },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await summaryController.list(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data).toHaveLength(1);
      expect(responseData.data[0].participantId).toBe(mockParticipantId.toString());
    });

    it('should filter summaries by type ID', async () => {
      const mockSummaries = [
        {
          _id: new ObjectId(),
          sessionId: new ObjectId(),
          agentId: mockAgentId,
          participantId: mockParticipantId,
          typeId: 'custom-summary',
          data: { customField: 'value' },
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const summariesCollection = mockDb.getCollection('summaries');
      mockFind(summariesCollection, mockSummaries);
      mockCountDocuments(summariesCollection, 1);

      const req = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        tenantAgentIds: [mockAgentId],
        query: {
          typeId: 'custom-summary',
          page: '1',
          limit: '10',
        },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await summaryController.list(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data[0].typeId).toBe('custom-summary');
    });
  });

  describe('Error handling', () => {
    it('should handle summary not found by ID', async () => {
      const summariesCollection = mockDb.getCollection('summaries');
      mockFindOne(summariesCollection, null);

      const req = {
        user: { _id: mockUserId },
        tenant: mockTenant,
        params: { id: mockSummaryId.toString() },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await summaryController.getById(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Summary'),
        })
      );
    });

    it('should handle summary not found by session ID', async () => {
      // Mock summary lookup returns null (not found)
      const summariesCollection = mockDb.getCollection('summaries');
      mockFindOne(summariesCollection, null);

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

      await summaryController.getBySessionId(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Summary'),
        })
      );
    });
  });
});
