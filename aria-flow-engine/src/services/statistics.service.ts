import {
  AgentStatisticsRepository,
  SummaryRepository,
  SessionRepository,
  AgentRepository,
} from '@repositories';
import { AgentStatisticsDocument, AgentStatisticsDTO } from '@models';
import { aggregateStatistics, getStatisticsTypeOrThrow } from '@modules';
import { createLogger, NotFoundError, toObjectId } from '@utils';

const logger = createLogger('StatisticsService');

export class StatisticsService {
  constructor(
    private readonly statisticsRepository: AgentStatisticsRepository,
    private readonly summaryRepository: SummaryRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  // ============================================
  // READ
  // ============================================

  /**
   * Get existing statistics for an agent.
   * Pure read — never calculates. Throws if not found.
   */
  async getAgentStatistics(agentId: string): Promise<AgentStatisticsDTO> {
    const agent = await this.agentRepository.findByIdOrThrow(agentId, 'Agent');

    const typeId = agent.statisticsTypeId;
    if (!typeId) {
      throw new NotFoundError('Agent statisticsTypeId', agentId);
    }

    const existing = await this.statisticsRepository.findByAgentIdAndType(
      toObjectId(agentId),
      typeId
    );
    if (!existing) {
      throw new NotFoundError('AgentStatistics', agentId);
    }

    return this.toResponse(existing);
  }

  // ============================================
  // CALCULATE (called after summary generation)
  // ============================================

  /**
   * Calculate and upsert statistics for an agent.
   * Creates if first time, updates if exists.
   * Call this after every summary generation.
   */
  async calculateAgentStatistics(agentId: string): Promise<AgentStatisticsDTO> {
    const agent = await this.agentRepository.findByIdOrThrow(agentId, 'Agent');

    const typeId = agent.statisticsTypeId;
    if (!typeId) {
      throw new NotFoundError('Agent statisticsTypeId', agentId);
    }

    getStatisticsTypeOrThrow(typeId);

    logger.info('Calculating statistics', { agentId, typeId });

    const [sessionStats, summaries] = await Promise.all([
      this.getSessionStats(agentId),
      this.getSummaries(agentId),
    ]);

    const aggregatedData = aggregateStatistics(typeId, { summaries });

    const statistics = await this.statisticsRepository.upsertByAgentId(
      toObjectId(agentId),
      typeId,
      {
        totalSessions: sessionStats.total,
        completedSessions: sessionStats.completed,
        averageCompletionRate: sessionStats.completionRate,
        data: aggregatedData,
      }
    );

    logger.info('Statistics calculated and saved', {
      agentId,
      totalSessions: sessionStats.total,
      completedSessions: sessionStats.completed,
    });

    return this.toResponse(statistics);
  }

  // ============================================
  // BATCH RECALCULATION (cron/safety net)
  // ============================================

  /**
   * Recalculate statistics that haven't been updated recently.
   * Safety net for failed calculations after summary generation.
   */
  async recalculateStaleStatistics(olderThanMinutes: number = 60): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    const stale = await this.statisticsRepository.getStaleStatistics(cutoff);

    let recalculated = 0;

    for (const stats of stale) {
      try {
        await this.calculateAgentStatistics(stats.agentId.toString());
        recalculated++;
      } catch (error) {
        logger.error('Failed to recalculate statistics', error as Error, {
          agentId: stats.agentId.toString(),
        });
      }
    }

    logger.info('Stale statistics recalculated', { total: stale.length, recalculated });
    return recalculated;
  }

  // ============================================
  // DELETE
  // ============================================

  async deleteAgentStatistics(agentId: string): Promise<void> {
    await this.statisticsRepository.deleteByAgentId(toObjectId(agentId));
    logger.info('Agent statistics deleted', { agentId });
  }

  // ============================================
  // DTO
  // ============================================

  toResponse(doc: AgentStatisticsDocument): AgentStatisticsDTO {
    return {
      _id: doc._id.toString(),
      agentId: doc.agentId.toString(),
      typeId: doc.typeId,
      totalSessions: doc.totalSessions,
      completedSessions: doc.completedSessions,
      averageCompletionRate: doc.averageCompletionRate,
      data: doc.data,
      lastCalculatedAt: doc.lastCalculatedAt.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  // ============================================
  // PRIVATE
  // ============================================

  private async getSessionStats(
    agentId: string
  ): Promise<{ total: number; completed: number; completionRate: number }> {
    const [total, completed] = await Promise.all([
      this.sessionRepository.countByAgent(toObjectId(agentId)),
      this.sessionRepository.countCompletedByAgent(toObjectId(agentId)),
    ]);

    const completionRate = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;
    return { total, completed, completionRate };
  }

  private async getSummaries(agentId: string): Promise<{ data: Record<string, unknown> }[]> {
    const result = await this.summaryRepository.findByAgentId(toObjectId(agentId), {
      page: 1,
      limit: 1000,
    });
    return result.data;
  }
}
