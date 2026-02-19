import { ObjectId, Filter } from 'mongodb';
import { BaseRepository } from './base.repository';
import { AgentDocument, AgentStatus } from '@models';
import { IDatabase } from '@connectors';

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

  async updateStatus(agentId: ObjectId, status: typeof AgentStatus): Promise<AgentDocument | null> {
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

  async createIndexes(): Promise<void> {
    const collection = this.getCollection();
    await collection.createIndex({ ownerId: 1 });
    await collection.createIndex({ organizationId: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ ownerId: 1, organizationId: 1, status: 1 });
  }
}
