import { ObjectId, Filter } from 'mongodb';
import { BaseRepository } from './base.repository';
import { SummaryDocument } from '@models';
import { IDatabase } from '@connectors';
import { PaginatedResult } from '@utils';
const COLLECTION_NAME = 'summaries';

export class SummaryRepository extends BaseRepository<SummaryDocument> {
  constructor(db: IDatabase) {
    super(db, COLLECTION_NAME);
  }

  async findBySessionId(sessionId: ObjectId): Promise<SummaryDocument | null> {
    return this.findOne({ sessionId });
  }

  async findByAgentId(
    agentId: ObjectId,
    options: { typeId?: string; page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<SummaryDocument>> {
    const { typeId, page = 1, limit = 20 } = options;

    const filter: Filter<SummaryDocument> = { agentId };
    if (typeId) {
      filter.typeId = typeId;
    }

    return this.findPaginated(filter, page, limit, { generatedAt: -1 });
  }

  async findByParticipantId(
    participantId: ObjectId,
    options: { typeId?: string; page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<SummaryDocument>> {
    const { typeId, page = 1, limit = 20 } = options;

    const filter: Filter<SummaryDocument> = { participantId };
    if (typeId) {
      filter.typeId = typeId;
    }

    return this.findPaginated(filter, page, limit, { generatedAt: -1 });
  }

  async findWithFilters(
    filters: {
      agentId?: ObjectId;
      participantId?: ObjectId;
      typeId?: string;
    },
    options: { page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<SummaryDocument>> {
    const { page = 1, limit = 20 } = options;

    const filter: Filter<SummaryDocument> = {};
    if (filters.agentId) filter.agentId = filters.agentId;
    if (filters.participantId) filter.participantId = filters.participantId;
    if (filters.typeId) filter.typeId = filters.typeId;

    return this.findPaginated(filter, page, limit, { generatedAt: -1 });
  }

  /**
   * Find summaries scoped to a set of agent IDs (used for tenant-scoped queries)
   */
  async findByAgentIdsWithFilters(
    agentIds: ObjectId[],
    filters: {
      agentId?: ObjectId;
      participantId?: ObjectId;
      typeId?: string;
    },
    options: { page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<SummaryDocument>> {
    const { page = 1, limit = 20 } = options;

    if (agentIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const filter: Filter<SummaryDocument> = {};

    if (filters.agentId) {
      if (!agentIds.some((id) => id.equals(filters.agentId!))) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      filter.agentId = filters.agentId;
    } else {
      filter.agentId = { $in: agentIds };
    }

    if (filters.participantId) filter.participantId = filters.participantId;
    if (filters.typeId) filter.typeId = filters.typeId;

    return this.findPaginated(filter, page, limit, { generatedAt: -1 });
  }

  async existsForSession(sessionId: ObjectId): Promise<boolean> {
    return this.exists({ sessionId });
  }

  async deleteBySessionId(sessionId: ObjectId): Promise<boolean> {
    const result = await this.deleteMany({ sessionId });
    return result > 0;
  }

  async deleteByAgentId(agentId: ObjectId): Promise<number> {
    return this.deleteMany({ agentId });
  }

  async deleteByParticipantId(participantId: ObjectId): Promise<number> {
    return this.deleteMany({ participantId });
  }

  async countByAgent(agentId: ObjectId): Promise<number> {
    return this.count({ agentId });
  }

  async countByTypeId(typeId: string): Promise<number> {
    return this.count({ typeId });
  }

  async getLatestByAgent(agentId: ObjectId, limit: number = 10): Promise<SummaryDocument[]> {
    return this.findMany({ agentId }, { sort: { generatedAt: -1 }, limit });
  }

  async createIndexes(): Promise<void> {
    const collection = this.getCollection();
    await collection.createIndex({ sessionId: 1 }, { unique: true });
    await collection.createIndex({ agentId: 1 });
    await collection.createIndex({ participantId: 1 });
    await collection.createIndex({ typeId: 1 });
    await collection.createIndex({ generatedAt: -1 });
    await collection.createIndex({ agentId: 1, typeId: 1 });
  }
}
