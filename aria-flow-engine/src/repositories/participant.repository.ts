import { Filter, ObjectId } from 'mongodb';
import { BaseRepository } from './base.repository';
import { ParticipantDocument, SessionDocument } from '@models';
import { IDatabase } from '../connectors/database/IDatabase';
import { PaginatedResult, DatabaseError } from '@utils';

const COLLECTION_NAME = 'participants';

export class ParticipantRepository extends BaseRepository<ParticipantDocument> {
  constructor(db: IDatabase) {
    super(db, COLLECTION_NAME);
  }

  // ============================================
  // CORE LOOKUPS
  // ============================================

  /**
   * Find participant by email (globally unique)
   */
  async findByEmail(email: string): Promise<ParticipantDocument | null> {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Check if participant exists by email
   */
  async existsByEmail(email: string): Promise<boolean> {
    return this.exists({ email: email.toLowerCase() });
  }
  /**
   * Find participants by owner (via sessions)
   */
  async findByOwnerWithFilters(
    ownerId: ObjectId,
    options: {
      agentId?: ObjectId;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResult<ParticipantDocument>> {
    const { agentId, page = 1, limit = 20 } = options;

    const sessionCollection = this.db.getCollection<SessionDocument>('sessions');

    const sessionFilter: Filter<SessionDocument> = { agentOwnerId: ownerId };
    if (agentId) sessionFilter.agentId = agentId;

    const participantIds = await sessionCollection.distinct('participantId', sessionFilter);

    if (participantIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const filter: Filter<ParticipantDocument> = { _id: { $in: participantIds } };

    return this.findPaginated(filter, page, limit, { updatedAt: -1 });
  }
  /**
   * Find participants by agent IDs (via sessions) — used for tenant-scoped queries
   */
  async findByAgentIdsWithFilters(
    agentIds: ObjectId[],
    options: {
      agentId?: ObjectId;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedResult<ParticipantDocument>> {
    const { agentId, page = 1, limit = 20 } = options;

    if (agentIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const sessionCollection = this.db.getCollection<SessionDocument>('sessions');

    const sessionFilter: Filter<SessionDocument> = {};
    if (agentId) {
      if (!agentIds.some((id) => id.equals(agentId))) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      sessionFilter.agentId = agentId;
    } else {
      sessionFilter.agentId = { $in: agentIds };
    }

    const participantIds = await sessionCollection.distinct('participantId', sessionFilter);

    if (participantIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const filter: Filter<ParticipantDocument> = { _id: { $in: participantIds } };
    return this.findPaginated(filter, page, limit, { updatedAt: -1 });
  }

  // ============================================
  // FIND OR CREATE (Atomic)
  // ============================================

  /**
   * Find existing participant or create new one
   * Uses findOneAndUpdate with upsert for atomicity
   *
   * @returns { participant, created } - created is true if new participant was created
   */
  async findOrCreateByEmail(
    email: string,
    data?: { name?: string; metadata?: Record<string, unknown> }
  ): Promise<{ participant: ParticipantDocument; created: boolean }> {
    const normalizedEmail = email.toLowerCase();
    const now = new Date();

    const result = await this.getCollection().findOneAndUpdate(
      { email: normalizedEmail },
      {
        $setOnInsert: {
          email: normalizedEmail,
          name: data?.name,
          metadata: data?.metadata,
          createdAt: now,
        },
        $set: {
          updatedAt: now,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      }
    );

    if (!result) {
      throw new DatabaseError('Failed to find or create participant');
    }

    // Check if this was a new document by comparing createdAt and updatedAt
    const created = result.createdAt.getTime() === result.updatedAt.getTime();

    return { participant: result, created };
  }

  // ============================================
  // AGGREGATIONS (for agent participant listings)
  // ============================================

  /**
   * Find participants who have sessions with a specific agent
   * Returns participant data with session stats
   */
  async findByAgentWithStats(
    agentId: ObjectId,
    options: {
      status?: 'active' | 'completed' | 'abandoned';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    data: Array<ParticipantDocument & { sessionCount: number; lastSessionAt: Date | null }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    // Build session match stage
    const sessionMatch: Record<string, unknown> = { agentId };
    if (status) {
      sessionMatch.status = status;
    }

    const pipeline = [
      // Start from sessions collection perspective
      {
        $match: sessionMatch,
      },
      // Group by participant to get stats
      {
        $group: {
          _id: '$participantId',
          sessionCount: { $sum: 1 },
          lastSessionAt: { $max: '$lastActivityAt' },
        },
      },
      // Lookup participant details
      {
        $lookup: {
          from: 'participants',
          localField: '_id',
          foreignField: '_id',
          as: 'participant',
        },
      },
      // Unwind participant (1:1)
      {
        $unwind: '$participant',
      },
      // Reshape to flat structure
      {
        $project: {
          _id: '$participant._id',
          email: '$participant.email',
          name: '$participant.name',
          metadata: '$participant.metadata',
          createdAt: '$participant.createdAt',
          updatedAt: '$participant.updatedAt',
          sessionCount: 1,
          lastSessionAt: 1,
        },
      },
      // Sort by last activity
      {
        $sort: { lastSessionAt: -1 as const },
      },
    ];

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.db.getCollection('sessions').aggregate(countPipeline).toArray();
    const total = countResult[0]?.total ?? 0;

    // Get paginated data
    const dataPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];
    const data = await this.db.getCollection('sessions').aggregate(dataPipeline).toArray();

    return {
      data: data as Array<ParticipantDocument & { sessionCount: number; lastSessionAt: Date }>,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Count sessions for a participant
   */
  async countSessions(participantId: ObjectId): Promise<number> {
    return this.db.getCollection('sessions').countDocuments({ participantId });
  }

  /**
   * Get session IDs for a participant, scoped to specific agents
   *
   * Used for tenant-scoped cascade deletion — only returns sessions
   * belonging to the tenant's agents.
   */
  async getSessionIds(participantId: ObjectId, agentIds: ObjectId[]): Promise<ObjectId[]> {
    const sessions = await this.db
      .getCollection('sessions')
      .find(
        { participantId, agentId: { $in: agentIds } },
        { projection: { _id: 1 } }
      )
      .toArray();

    return sessions.map((s) => s._id as ObjectId);
  }

  // ============================================
  // INDEXES
  // ============================================

  async createIndexes(): Promise<void> {
    const collection = this.getCollection();

    // Primary lookup - globally unique email
    await collection.createIndex({ email: 1 }, { unique: true });

    // For participant listings sorted by creation
    await collection.createIndex({ createdAt: -1 });
  }
}
