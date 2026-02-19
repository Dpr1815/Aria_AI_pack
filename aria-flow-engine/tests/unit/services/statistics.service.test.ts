/**
 * Unit tests for StatisticsService
 *
 * Tests the service layer business logic with mocked repositories
 */

import { StatisticsService } from '@services/statistics.service';
import { SessionRepository } from '@repositories/session.repository';
import { createObjectId } from '@test/helpers/test-utils';
import { NotFoundError } from '@utils/errors';

// Mock all repositories
jest.mock('@repositories/session.repository');

describe('StatisticsService', () => {
  let statisticsService: StatisticsService;
  let mockSessionRepository: jest.Mocked<SessionRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repositories
    mockSessionRepository = new SessionRepository(null as any) as jest.Mocked<SessionRepository>;

    // Mock AgentStatisticsRepository (correct repository type)
    const mockAgentStatisticsRepository = {
      findByAgentIdAndType: jest.fn(),
      upsertByAgentId: jest.fn(),
      deleteByAgentId: jest.fn(),
      getStaleStatistics: jest.fn(),
    } as any;

    // Mock SummaryRepository
    const mockSummaryRepository = {
      findByAgentId: jest.fn(),
    } as any;

    // Mock AgentRepository
    const mockAgentRepository = {
      findByIdOrThrow: jest.fn(),
    } as any;

    statisticsService = new StatisticsService(
      mockAgentStatisticsRepository,
      mockSummaryRepository,
      mockSessionRepository,
      mockAgentRepository
    );
  });

  describe('getAgentStatistics', () => {
    it('should return statistics for an agent', async () => {
      const agentId = createObjectId();
      const typeId = 'interview';
      const mockAgent = {
        _id: agentId,
        statisticsTypeId: typeId,
      };
      const mockStatistics = {
        _id: createObjectId(),
        agentId,
        typeId,
        totalSessions: 100,
        completedSessions: 85,
        averageCompletionRate: 85,
        data: {
          completionRate: 0.85,
        },
        lastCalculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (statisticsService as any).agentRepository.findByIdOrThrow = jest
        .fn()
        .mockResolvedValue(mockAgent);
      (statisticsService as any).statisticsRepository.findByAgentIdAndType = jest
        .fn()
        .mockResolvedValue(mockStatistics);

      const result = await statisticsService.getAgentStatistics(agentId.toString());

      expect(result).toEqual(
        expect.objectContaining({
          agentId: agentId.toString(),
          totalSessions: 100,
          completedSessions: 85,
        })
      );
    });

    it('should throw NotFoundError when statistics do not exist', async () => {
      const agentId = createObjectId();
      const typeId = 'interview';
      const mockAgent = {
        _id: agentId,
        statisticsTypeId: typeId,
      };

      (statisticsService as any).agentRepository.findByIdOrThrow = jest
        .fn()
        .mockResolvedValue(mockAgent);
      (statisticsService as any).statisticsRepository.findByAgentIdAndType = jest
        .fn()
        .mockResolvedValue(null);

      await expect(statisticsService.getAgentStatistics(agentId.toString())).rejects.toThrow(
        'AgentStatistics'
      );
    });
  });

  describe('calculateAgentStatistics', () => {
    it('should calculate statistics from session data', async () => {
      const agentId = createObjectId();
      const typeId = 'interview';

      const mockAgent = {
        _id: agentId,
        statisticsTypeId: typeId,
      };

      const newStatistics = {
        _id: createObjectId(),
        agentId,
        typeId,
        totalSessions: 3,
        completedSessions: 2,
        averageCompletionRate: 66.67,
        data: {},
        lastCalculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (statisticsService as any).agentRepository.findByIdOrThrow = jest
        .fn()
        .mockResolvedValue(mockAgent);

      mockSessionRepository.countByAgent = jest.fn().mockResolvedValue(3);
      mockSessionRepository.countCompletedByAgent = jest.fn().mockResolvedValue(2);

      (statisticsService as any).summaryRepository.findByAgentId = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      });

      (statisticsService as any).statisticsRepository.upsertByAgentId = jest
        .fn()
        .mockResolvedValue(newStatistics);

      const result = await statisticsService.calculateAgentStatistics(agentId.toString());

      expect(result).toEqual(
        expect.objectContaining({
          agentId: agentId.toString(),
          totalSessions: 3,
          completedSessions: 2,
        })
      );
    });

    it('should update existing statistics when recalculating', async () => {
      const agentId = createObjectId();
      const typeId = 'interview';

      const mockAgent = {
        _id: agentId,
        statisticsTypeId: typeId,
      };

      const updatedStatistics = {
        _id: createObjectId(),
        agentId,
        typeId,
        totalSessions: 1,
        completedSessions: 1,
        averageCompletionRate: 100,
        data: {},
        lastCalculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (statisticsService as any).agentRepository.findByIdOrThrow = jest
        .fn()
        .mockResolvedValue(mockAgent);

      mockSessionRepository.countByAgent = jest.fn().mockResolvedValue(1);
      mockSessionRepository.countCompletedByAgent = jest.fn().mockResolvedValue(1);

      (statisticsService as any).summaryRepository.findByAgentId = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      });

      (statisticsService as any).statisticsRepository.upsertByAgentId = jest
        .fn()
        .mockResolvedValue(updatedStatistics);

      const result = await statisticsService.calculateAgentStatistics(agentId.toString());

      expect((statisticsService as any).statisticsRepository.upsertByAgentId).toHaveBeenCalled();
    });
  });

  describe('deleteAgentStatistics', () => {
    it('should delete statistics successfully', async () => {
      const agentId = createObjectId();

      (statisticsService as any).statisticsRepository.deleteByAgentId = jest
        .fn()
        .mockResolvedValue(undefined);

      await statisticsService.deleteAgentStatistics(agentId.toString());

      expect((statisticsService as any).statisticsRepository.deleteByAgentId).toHaveBeenCalledWith(
        agentId
      );
    });
  });

  // ============================================
  // getAgentStatistics — no typeId branch
  // ============================================

  describe('getAgentStatistics - no statisticsTypeId', () => {
    it('should throw when agent has no statisticsTypeId', async () => {
      const agentId = createObjectId();
      (statisticsService as any).agentRepository.findByIdOrThrow = jest
        .fn()
        .mockResolvedValue({ _id: agentId, statisticsTypeId: undefined });

      await expect(statisticsService.getAgentStatistics(agentId.toString())).rejects.toThrow(
        'Agent statisticsTypeId'
      );
    });
  });

  describe('calculateAgentStatistics - no statisticsTypeId', () => {
    it('should throw when agent has no statisticsTypeId', async () => {
      const agentId = createObjectId();
      (statisticsService as any).agentRepository.findByIdOrThrow = jest
        .fn()
        .mockResolvedValue({ _id: agentId, statisticsTypeId: undefined });

      await expect(statisticsService.calculateAgentStatistics(agentId.toString())).rejects.toThrow(
        'Agent statisticsTypeId'
      );
    });
  });

  // ============================================
  // recalculateStaleStatistics
  // ============================================

  describe('recalculateStaleStatistics', () => {
    it('should recalculate stale statistics successfully', async () => {
      const agentId = createObjectId();
      const staleStats = [{ agentId, typeId: 'interview' }];

      (statisticsService as any).statisticsRepository.getStaleStatistics = jest
        .fn()
        .mockResolvedValue(staleStats);

      const mockAgent = { _id: agentId, statisticsTypeId: 'interview' };
      (statisticsService as any).agentRepository.findByIdOrThrow = jest
        .fn()
        .mockResolvedValue(mockAgent);
      mockSessionRepository.countByAgent = jest.fn().mockResolvedValue(10);
      mockSessionRepository.countCompletedByAgent = jest.fn().mockResolvedValue(8);
      (statisticsService as any).summaryRepository.findByAgentId = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      });
      (statisticsService as any).statisticsRepository.upsertByAgentId = jest.fn().mockResolvedValue({
        _id: createObjectId(),
        agentId,
        typeId: 'interview',
        totalSessions: 10,
        completedSessions: 8,
        averageCompletionRate: 80,
        data: {},
        lastCalculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const count = await statisticsService.recalculateStaleStatistics(30);
      expect(count).toBe(1);
    });

    it('should handle errors during recalculation and continue', async () => {
      const agentId1 = createObjectId();
      const agentId2 = createObjectId();
      const staleStats = [
        { agentId: agentId1, typeId: 'interview' },
        { agentId: agentId2, typeId: 'interview' },
      ];

      (statisticsService as any).statisticsRepository.getStaleStatistics = jest
        .fn()
        .mockResolvedValue(staleStats);

      (statisticsService as any).agentRepository.findByIdOrThrow = jest.fn()
        .mockRejectedValueOnce(new Error('Agent not found'))
        .mockResolvedValueOnce({ _id: agentId2, statisticsTypeId: 'interview' });

      mockSessionRepository.countByAgent = jest.fn().mockResolvedValue(5);
      mockSessionRepository.countCompletedByAgent = jest.fn().mockResolvedValue(3);
      (statisticsService as any).summaryRepository.findByAgentId = jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 1000,
        totalPages: 0,
      });
      (statisticsService as any).statisticsRepository.upsertByAgentId = jest.fn().mockResolvedValue({
        _id: createObjectId(),
        agentId: agentId2,
        typeId: 'interview',
        totalSessions: 5,
        completedSessions: 3,
        averageCompletionRate: 60,
        data: {},
        lastCalculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const count = await statisticsService.recalculateStaleStatistics();
      expect(count).toBe(1);
    });

    it('should return 0 when no stale statistics', async () => {
      (statisticsService as any).statisticsRepository.getStaleStatistics = jest
        .fn()
        .mockResolvedValue([]);

      const count = await statisticsService.recalculateStaleStatistics();
      expect(count).toBe(0);
    });
  });
});
