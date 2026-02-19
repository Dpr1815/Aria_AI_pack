/**
 * Integration tests for Statistics flow
 *
 * Tests statistics calculation, retrieval, and deletion
 */

import { StatisticsController } from '@controllers/statistics.controller';
import { StatisticsService } from '@services/statistics.service';
import { AgentStatisticsRepository } from '@repositories/agent-statistics.repository';
import { SummaryRepository } from '@repositories/summary.repository';
import { SessionRepository } from '@repositories/session.repository';
import { AgentRepository } from '@repositories/agent.repository';
import {
  createMockDatabase,
  mockFindOne,
  mockFindOneAndUpdate,
  mockDeleteMany,
  mockCountDocuments,
  mockAggregate,
} from '@test/mocks/database.mock';
import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';

describe('Statistics Flow - Integration', () => {
  let statisticsController: StatisticsController;
  let statisticsService: StatisticsService;
  let statisticsRepository: AgentStatisticsRepository;
  let summaryRepository: SummaryRepository;
  let sessionRepository: SessionRepository;
  let agentRepository: AgentRepository;
  let mockDb: ReturnType<typeof createMockDatabase>;

  const mockUserId = new ObjectId();
  const mockAgentId = new ObjectId();
  const mockStatisticsId = new ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup the stack with mocked database
    mockDb = createMockDatabase();
    statisticsRepository = new AgentStatisticsRepository(mockDb);
    summaryRepository = new SummaryRepository(mockDb);
    sessionRepository = new SessionRepository(mockDb);
    agentRepository = new AgentRepository(mockDb);

    statisticsService = new StatisticsService(
      statisticsRepository,
      summaryRepository,
      sessionRepository,
      agentRepository
    );
    statisticsController = new StatisticsController(statisticsService);
  });

  describe('Calculate -> Get -> Delete flow', () => {
    it('should complete full statistics lifecycle', async () => {
      // ============ STEP 1: CALCULATE STATISTICS ============
      const mockAgent = {
        _id: mockAgentId,
        ownerId: mockUserId,
        label: 'Test Agent',
        statisticsTypeId: 'interview',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const agentsCollection = mockDb.getCollection('agents');
      mockFindOne(agentsCollection, mockAgent);

      // Mock session stats
      const sessionsCollection = mockDb.getCollection('sessions');
      mockCountDocuments(sessionsCollection, 100); // total sessions
      mockCountDocuments(sessionsCollection, 85); // completed sessions

      // Mock summaries for aggregation
      const summariesCollection = mockDb.getCollection('summaries');
      const mockSummaries = [
        {
          _id: new ObjectId(),
          sessionId: new ObjectId(),
          agentId: mockAgentId,
          participantId: new ObjectId(),
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
          _id: new ObjectId(),
          sessionId: new ObjectId(),
          agentId: mockAgentId,
          participantId: new ObjectId(),
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

      mockAggregate(summariesCollection, [
        ...mockSummaries,
        { total: 2 }, // Count result for pagination
      ]);

      // Mock statistics upsert
      const statisticsCollection = mockDb.getCollection('agent_statistics');
      const calculatedStatistics = {
        _id: mockStatisticsId,
        agentId: mockAgentId,
        typeId: 'interview',
        totalSessions: 100,
        completedSessions: 85,
        averageCompletionRate: 85,
        data: {
          totalCandidates: 2,
          experienceLevels: {
            senior: 1,
            mid: 1,
          },
          topSkills: ['JavaScript', 'TypeScript', 'Python', 'Java'],
        },
        lastCalculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindOneAndUpdate(statisticsCollection, calculatedStatistics);

      const calculateReq = {
        user: { _id: mockUserId },
        params: { agentId: mockAgentId.toString() },
      } as unknown as Request;

      const calculateRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await statisticsController.calculateAgentStatistics(calculateReq, calculateRes, next);

      expect(calculateRes.status).toHaveBeenCalledWith(200);
      expect(calculateRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            _id: mockStatisticsId.toString(),
            agentId: mockAgentId.toString(),
            typeId: 'interview',
            totalSessions: 100,
            completedSessions: 85,
            averageCompletionRate: 85,
          }),
          message: 'Statistics calculated successfully',
        })
      );

      // ============ STEP 2: GET STATISTICS ============
      jest.clearAllMocks();

      mockFindOne(agentsCollection, mockAgent);
      mockFindOne(statisticsCollection, calculatedStatistics);

      const getReq = {
        user: { _id: mockUserId },
        params: { agentId: mockAgentId.toString() },
      } as unknown as Request;

      const getRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await statisticsController.getAgentStatistics(getReq, getRes, next);

      expect(getRes.status).toHaveBeenCalledWith(200);
      expect(getRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            _id: mockStatisticsId.toString(),
            agentId: mockAgentId.toString(),
            typeId: 'interview',
            totalSessions: 100,
            completedSessions: 85,
          }),
        })
      );

      // ============ STEP 3: DELETE STATISTICS ============
      jest.clearAllMocks();

      mockDeleteMany(statisticsCollection, 1);

      const deleteReq = {
        user: { _id: mockUserId },
        params: { agentId: mockAgentId.toString() },
      } as unknown as Request;

      const deleteRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await statisticsController.deleteAgentStatistics(deleteReq, deleteRes, next);

      expect(deleteRes.status).toHaveBeenCalledWith(200);
      expect(deleteRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: null,
          message: 'Agent statistics deleted successfully',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle agent not found when calculating', async () => {
      const agentsCollection = mockDb.getCollection('agents');
      mockFindOne(agentsCollection, null);

      const req = {
        user: { _id: mockUserId },
        params: { agentId: mockAgentId.toString() },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await statisticsController.calculateAgentStatistics(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Agent'),
        })
      );
    });

    it('should handle missing statisticsTypeId', async () => {
      const mockAgentWithoutTypeId = {
        _id: mockAgentId,
        ownerId: mockUserId,
        label: 'Test Agent',
        statisticsTypeId: undefined,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const agentsCollection = mockDb.getCollection('agents');
      mockFindOne(agentsCollection, mockAgentWithoutTypeId);

      const req = {
        user: { _id: mockUserId },
        params: { agentId: mockAgentId.toString() },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await statisticsController.getAgentStatistics(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('statisticsTypeId'),
        })
      );
    });

    it('should handle statistics not found', async () => {
      const mockAgent = {
        _id: mockAgentId,
        ownerId: mockUserId,
        label: 'Test Agent',
        statisticsTypeId: 'interview',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const agentsCollection = mockDb.getCollection('agents');
      mockFindOne(agentsCollection, mockAgent);

      const statisticsCollection = mockDb.getCollection('agent_statistics');
      mockFindOne(statisticsCollection, null);

      const req = {
        user: { _id: mockUserId },
        params: { agentId: mockAgentId.toString() },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await statisticsController.getAgentStatistics(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('AgentStatistics'),
        })
      );
    });
  });
});
