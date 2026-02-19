import { ObjectId, Filter } from 'mongodb';
import { BaseRepository } from './base.repository';
import { SessionDocument } from '../models/documents/session.document';
import { SessionStatus } from '../validations/session.validation';
import { IDatabase } from '../connectors/database/IDatabase';
import { PaginatedResult } from '@utils';
const COLLECTION_NAME = 'sessions';

export class SessionRepository extends BaseRepository<SessionDocument> {
  constructor(db: IDatabase) {
    super(db, COLLECTION_NAME);
  }

  // ============================================
  // CORE LOOKUPS
  // ============================================

  /**
   * Find active/non-completed session for participant + agent
   * Used for session persistence logic
   */
  async findActiveSession(
    participantId: ObjectId,
    agentId: ObjectId
  ): Promise<SessionDocument | null> {
    return this.findOne({
      participantId,
      agentId,
      status: { $ne: 'completed' },
    });
  }

  /**
   * Find session by access token hash
   * Used for WebSocket authentication
   */
  async findByAccessTokenHash(hash: string): Promise<SessionDocument | null> {
    return this.findOne({
      accessTokenHash: hash,
      accessTokenExpiresAt: { $gt: new Date() },
    });
  }

  // ============================================
  // AGENT-SCOPED QUERIES
  // ============================================

  /**
   * Find sessions for an agent with optional filters
   */
  async findByAgent(
    agentId: ObjectId,
    options: {
      participantId?: ObjectId;
      status?: SessionStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<SessionDocument>> {
    const { participantId, status, page = 1, limit = 20 } = options;

    const filter: Filter<SessionDocument> = { agentId };

    if (participantId) {
      filter.participantId = participantId;
    }
    if (status) {
      filter.status = status;
    }

    return this.findPaginated(filter, page, limit, { lastActivityAt: -1 });
  }

  /**
   * Find sessions for an agent with participant details (aggregation)
   */
  async findByAgentWithParticipant(
    agentId: ObjectId,
    options: {
      participantId?: ObjectId;
      status?: SessionStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    data: Array<SessionDocument & { participant: { _id: ObjectId; email: string; name?: string } }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { participantId, status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    // Build match filter
    const matchFilter: Record<string, unknown> = { agentId };
    if (participantId) {
      matchFilter.participantId = participantId;
    }
    if (status) {
      matchFilter.status = status;
    }

    const pipeline = [
      { $match: matchFilter },
      { $sort: { lastActivityAt: -1 as const } },
      {
        $lookup: {
          from: 'participants',
          localField: 'participantId',
          foreignField: '_id',
          as: 'participantDoc',
        },
      },
      { $unwind: '$participantDoc' },
      {
        $addFields: {
          participant: {
            _id: '$participantDoc._id',
            email: '$participantDoc.email',
            name: '$participantDoc.name',
          },
        },
      },
      { $project: { participantDoc: 0 } },
    ];

    // Get total count
    const countPipeline = [{ $match: matchFilter }, { $count: 'total' }];
    const countResult = await this.getCollection().aggregate(countPipeline).toArray();
    const total = countResult[0]?.total ?? 0;

    // Get paginated data
    const dataPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];
    const data = await this.getCollection().aggregate(dataPipeline).toArray();

    return {
      data: data as Array<
        SessionDocument & { participant: { _id: ObjectId; email: string; name?: string } }
      >,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================
  // OWNER-SCOPED QUERIES
  // ============================================

  /**
   * Find sessions for all agents owned by a user
   */
  async findByOwner(
    ownerId: ObjectId,
    options: {
      agentId?: ObjectId;
      status?: SessionStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<SessionDocument>> {
    const { agentId, status, page = 1, limit = 20 } = options;

    const filter: Filter<SessionDocument> = { agentOwnerId: ownerId };

    if (agentId) {
      filter.agentId = agentId;
    }
    if (status) {
      filter.status = status;
    }

    return this.findPaginated(filter, page, limit, { lastActivityAt: -1 });
  }

  // ============================================
  // PARTICIPANT-SCOPED QUERIES
  // ============================================

  /**
   * Find sessions for a participant
   */
  async findByParticipant(
    participantId: ObjectId,
    options: {
      agentId?: ObjectId;
      status?: SessionStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResult<SessionDocument>> {
    const { agentId, status, page = 1, limit = 20 } = options;

    const filter: Filter<SessionDocument> = { participantId };

    if (agentId) {
      filter.agentId = agentId;
    }
    if (status) {
      filter.status = status;
    }

    return this.findPaginated(filter, page, limit, { lastActivityAt: -1 });
  }
  /**
   * Find sessions by owner with filters
   */
  async findByOwnerWithFilters(
    ownerId: ObjectId,
    options: {
      agentId?: ObjectId;
      participantId?: ObjectId;
      status?: SessionStatus; // ← Change from string to SessionStatus
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResult<SessionDocument>> {
    const { agentId, participantId, status, page = 1, limit = 20 } = options;

    const filter: Filter<SessionDocument> = { agentOwnerId: ownerId };
    if (agentId) filter.agentId = agentId;
    if (participantId) filter.participantId = participantId;
    if (status) filter.status = status;

    return this.findPaginated(filter, page, limit, { lastActivityAt: -1 });
  }
  /**
   * Find sessions for agents matching a set of IDs (used for tenant-scoped queries)
   */
  async findByAgentIdsWithFilters(
    agentIds: ObjectId[],
    options: {
      agentId?: ObjectId;
      participantId?: ObjectId;
      status?: SessionStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResult<SessionDocument>> {
    const { agentId, participantId, status, page = 1, limit = 20 } = options;

    if (agentIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const filter: Filter<SessionDocument> = {};

    if (agentId) {
      if (!agentIds.some((id) => id.equals(agentId))) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      filter.agentId = agentId;
    } else {
      filter.agentId = { $in: agentIds };
    }

    if (participantId) filter.participantId = participantId;
    if (status) filter.status = status;

    return this.findPaginated(filter, page, limit, { lastActivityAt: -1 });
  }

  // ============================================
  // STATUS UPDATES
  // ============================================

  /**
   * Update session status
   */
  async updateStatus(sessionId: ObjectId, status: SessionStatus): Promise<SessionDocument | null> {
    const update: Partial<SessionDocument> = {
      status,
      lastActivityAt: new Date(),
    };

    if (status === 'completed') {
      update.completedAt = new Date();
    }

    return this.updateById(sessionId, update);
  }

  /**
   * Update last activity timestamp
   */
  async touchActivity(sessionId: ObjectId): Promise<void> {
    await this.updateById(sessionId, { lastActivityAt: new Date() });
  }

  /**
   * Update current step
   */
  async updateCurrentStep(sessionId: ObjectId, stepKey: string): Promise<SessionDocument | null> {
    return this.updateById(sessionId, {
      currentStep: stepKey,
      lastActivityAt: new Date(),
    });
  }

  // ============================================
  // ACCESS TOKEN
  // ============================================

  /**
   * Update access token hash and expiry
   */
  async updateAccessToken(
    sessionId: ObjectId,
    hash: string,
    expiresAt: Date
  ): Promise<SessionDocument | null> {
    return this.updateById(sessionId, {
      accessTokenHash: hash,
      accessTokenExpiresAt: expiresAt,
    });
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Mark stale sessions as abandoned
   * Sessions with no activity for specified hours
   */
  async markStaleAsAbandoned(staleHours: number = 24): Promise<number> {
    const cutoff = new Date(Date.now() - staleHours * 60 * 60 * 1000);

    return this.updateMany(
      {
        status: 'active',
        lastActivityAt: { $lt: cutoff },
      },
      {
        $set: { status: 'abandoned' },
      }
    );
  }

  /**
   * Delete sessions by participant ID
   */
  async deleteByParticipant(participantId: ObjectId): Promise<number> {
    return this.deleteMany({ participantId });
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Count sessions by status for an agent
   */
  async countByStatus(agentId: ObjectId): Promise<Record<SessionStatus, number>> {
    const pipeline = [{ $match: { agentId } }, { $group: { _id: '$status', count: { $sum: 1 } } }];

    const results = await this.getCollection().aggregate(pipeline).toArray();

    const counts: Record<SessionStatus, number> = {
      active: 0,
      completed: 0,
      abandoned: 0,
    };

    for (const result of results) {
      counts[result._id as SessionStatus] = result.count;
    }

    return counts;
  }

  async countByAgent(agentId: ObjectId): Promise<number> {
    return this.count({ agentId });
  }

  async countCompletedByAgent(agentId: ObjectId): Promise<number> {
    return this.count({ agentId, status: 'completed' });
  }

  // ============================================
  // INDEXES
  // ============================================

  async createIndexes(): Promise<void> {
    const collection = this.getCollection();

    // Session persistence lookup
    await collection.createIndex(
      { participantId: 1, agentId: 1, status: 1 },
      { name: 'session_persistence_lookup' }
    );

    // Agent session listings
    await collection.createIndex(
      { agentId: 1, status: 1, lastActivityAt: -1 },
      { name: 'agent_sessions' }
    );

    // Owner dashboards
    await collection.createIndex({ agentOwnerId: 1, createdAt: -1 }, { name: 'owner_sessions' });

    // Token validation
    await collection.createIndex({ accessTokenHash: 1 }, { name: 'token_lookup' });

    // Stale session cleanup
    await collection.createIndex({ status: 1, lastActivityAt: 1 }, { name: 'stale_cleanup' });
  }
}
