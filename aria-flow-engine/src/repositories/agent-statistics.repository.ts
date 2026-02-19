import { Filter, ObjectId } from 'mongodb';
import { BaseRepository } from './base.repository';
import { AgentStatisticsDocument } from '@models';
import { IDatabase } from '../connectors/database/IDatabase';

const COLLECTION_NAME = 'agent_statistics';

export class AgentStatisticsRepository extends BaseRepository<AgentStatisticsDocument> {
  constructor(db: IDatabase) {
    super(db, COLLECTION_NAME);
  }

  async findByAgentId(agentId: ObjectId): Promise<AgentStatisticsDocument | null> {
    return this.findOne({ agentId } as Filter<AgentStatisticsDocument>);
  }

  async findByAgentIdAndType(
    agentId: ObjectId,
    typeId: string
  ): Promise<AgentStatisticsDocument | null> {
    return this.findOne({ agentId, typeId } as Filter<AgentStatisticsDocument>);
  }

  async upsertByAgentId(
    agentId: ObjectId,
    typeId: string,
    data: Pick<
      AgentStatisticsDocument,
      'totalSessions' | 'completedSessions' | 'averageCompletionRate' | 'data'
    >
  ): Promise<AgentStatisticsDocument> {
    return this.upsert(
      { agentId, typeId } as Filter<AgentStatisticsDocument>,
      {
        agentId,
        typeId,
        ...data,
        lastCalculatedAt: new Date(),
      } as AgentStatisticsDocument
    );
  }

  async deleteByAgentId(agentId: ObjectId): Promise<number> {
    return this.deleteMany({ agentId } as Filter<AgentStatisticsDocument>);
  }

  async getStaleStatistics(olderThan: Date): Promise<AgentStatisticsDocument[]> {
    return this.findMany({
      lastCalculatedAt: { $lt: olderThan },
    } as Filter<AgentStatisticsDocument>);
  }

  async createIndexes(): Promise<void> {
    const collection = this.getCollection();
    await collection.createIndex({ agentId: 1, typeId: 1 }, { unique: true });
    await collection.createIndex({ lastCalculatedAt: 1 });
  }
}
