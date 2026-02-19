import { ObjectId, Filter } from 'mongodb';
import { BaseRepository } from './base.repository';
import { AgentDocument } from '@models';
import { IDatabase } from '@connectors';
import { AgentStatus } from '../constants';
import { PaginatedResult } from '@utils';
const COLLECTION_NAME = 'agents';

export class AgentRepository extends BaseRepository<AgentDocument> {
  constructor(db: IDatabase) {
    super(db, COLLECTION_NAME);
  }

  /**
   * Filter for personal agents (no organization)
   */
  private personalFilter(ownerId: ObjectId): Filter<AgentDocument> {
    return {
      ownerId,
      $or: [{ organizationId: { $exists: false } }, { organizationId: null }],
    } as Filter<AgentDocument>;
  }

  async findByOwnerId(ownerId: ObjectId, status?: AgentStatus): Promise<AgentDocument[]> {
    const filter: Filter<AgentDocument> = this.personalFilter(ownerId);
    if (status) {
      filter.status = status;
    }
    return this.findMany(filter, { sort: { createdAt: -1 } });
  }

  async findPersonalAgents(
    userId: ObjectId,
    options: { status?: AgentStatus; page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<AgentDocument>> {
    const { status, page = 1, limit = 20 } = options;

    const filter: Filter<AgentDocument> = this.personalFilter(userId);
    if (status) {
      filter.status = status;
    }

    return this.findPaginated(filter, page, limit, { createdAt: -1 });
  }

  async findOrganizationAgents(
    organizationId: ObjectId,
    options: { status?: AgentStatus; page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<AgentDocument>> {
    const { status, page = 1, limit = 20 } = options;

    const filter: Filter<AgentDocument> = { organizationId };
    if (status) {
      filter.status = status;
    }

    return this.findPaginated(filter, page, limit, { createdAt: -1 });
  }

  async findAccessibleByUser(
    userId: ObjectId,
    organizationId: ObjectId | undefined,
    options: { status?: AgentStatus; page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<AgentDocument>> {
    const { status, page = 1, limit = 20 } = options;

    const orConditions: Filter<AgentDocument>[] = [this.personalFilter(userId)];

    if (organizationId) {
      orConditions.push({ organizationId });
    }

    const filter: Filter<AgentDocument> = { $or: orConditions };
    if (status) {
      filter.status = status;
    }

    return this.findPaginated(filter, page, limit, { createdAt: -1 });
  }

  async countActiveByOwner(ownerId: ObjectId): Promise<number> {
    const filter: Filter<AgentDocument> = {
      ...this.personalFilter(ownerId),
      status: AgentStatus.ACTIVE,
    };
    return this.count(filter);
  }

  async countActiveByOrganization(organizationId: ObjectId): Promise<number> {
    return this.count({
      organizationId,
      status: AgentStatus.ACTIVE,
    });
  }

  async updateStatus(agentId: ObjectId, status: AgentStatus): Promise<AgentDocument | null> {
    return this.updateById(agentId, { status });
  }

  async isOwnedByUser(agentId: ObjectId, userId: ObjectId): Promise<boolean> {
    const filter: Filter<AgentDocument> = {
      _id: agentId,
      ...this.personalFilter(userId),
    };
    return this.exists(filter);
  }

  async belongsToOrganization(agentId: ObjectId, organizationId: ObjectId): Promise<boolean> {
    return this.exists({ _id: agentId, organizationId });
  }

  /**
   * Get IDs of all agents belonging to an organization (lightweight projection)
   */
  async findIdsByOrganization(organizationId: ObjectId): Promise<ObjectId[]> {
    const results = await this.getCollection()
      .find({ organizationId } as Filter<AgentDocument>, { projection: { _id: 1 } })
      .toArray();
    return results.map((r) => r._id);
  }

  /**
   * Get IDs of all personal agents for a user (lightweight projection)
   */
  async findPersonalAgentIds(userId: ObjectId): Promise<ObjectId[]> {
    const results = await this.getCollection()
      .find(this.personalFilter(userId), { projection: { _id: 1 } })
      .toArray();
    return results.map((r) => r._id);
  }

  async createIndexes(): Promise<void> {
    const collection = this.getCollection();
    await collection.createIndex({ ownerId: 1 });
    await collection.createIndex({ organizationId: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ ownerId: 1, organizationId: 1, status: 1 });
  }
}
