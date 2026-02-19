import { ObjectId } from 'mongodb';
import { BaseRepository } from './base.repository';
import { AgentStepDocument } from '../models/documents/agent-step.document';
import { IDatabase } from '../connectors/database/IDatabase';
import { NotFoundError } from '@utils';

const COLLECTION_NAME = 'agent_steps';

export class AgentStepRepository extends BaseRepository<AgentStepDocument> {
  constructor(db: IDatabase) {
    super(db, COLLECTION_NAME);
  }

  /**
   * Find a single step by agent ID and step key
   */
  async findByAgentAndKey(agentId: ObjectId, key: string): Promise<AgentStepDocument | null> {
    return this.findOne({ agentId, key });
  }

  /**
   * Find a single step by agent ID and step key, throw if not found
   */
  async findByAgentAndKeyOrThrow(agentId: ObjectId, key: string): Promise<AgentStepDocument> {
    const step = await this.findByAgentAndKey(agentId, key);
    if (!step) {
      throw new NotFoundError('AgentStep', `${key} for agent ${agentId}`);
    }
    return step;
  }

  /**
   * Find all steps for an agent, ordered by execution order
   */
  async findByAgentId(agentId: ObjectId): Promise<AgentStepDocument[]> {
    return this.findMany({ agentId }, { sort: { order: 1 } });
  }

  /**
   * Find steps by agent ID as a keyed object (for backwards compatibility)
   */
  async findByAgentIdAsRecord(agentId: ObjectId): Promise<Record<string, AgentStepDocument>> {
    const steps = await this.findByAgentId(agentId);
    return steps.reduce(
      (acc, step) => {
        acc[step.key] = step;
        return acc;
      },
      {} as Record<string, AgentStepDocument>
    );
  }

  /**
   * Create multiple steps for an agent
   */
  async createManyForAgent(
    agentId: ObjectId,
    steps: Omit<AgentStepDocument, '_id' | 'agentId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<AgentStepDocument[]> {
    const stepsWithAgentId = steps.map((step) => ({
      ...step,
      agentId,
    }));
    return this.createMany(stepsWithAgentId as AgentStepDocument[]);
  }

  /**
   * Update a step by agent ID and key
   */
  async updateByAgentAndKey(
    agentId: ObjectId,
    key: string,
    update: Partial<Omit<AgentStepDocument, '_id' | 'agentId' | 'key'>>
  ): Promise<AgentStepDocument | null> {
    const step = await this.findByAgentAndKey(agentId, key);
    if (!step) return null;
    return this.updateById(step._id, update);
  }

  /**
   * Delete all steps for an agent
   */
  async deleteByAgentId(agentId: ObjectId): Promise<number> {
    return this.deleteMany({ agentId });
  }

  /**
   * Delete a single step by agent ID and key
   */
  async deleteByAgentAndKey(agentId: ObjectId, key: string): Promise<boolean> {
    const step = await this.findByAgentAndKey(agentId, key);
    if (!step) return false;
    await this.deleteById(step._id);
    return true;
  }

  /**
   * Count steps for an agent
   */
  async countByAgentId(agentId: ObjectId): Promise<number> {
    return this.count({ agentId });
  }

  /**
   * Create database indexes
   */
  async createIndexes(): Promise<void> {
    const collection = this.getCollection();
    await collection.createIndex({ agentId: 1, key: 1 }, { unique: true });
    await collection.createIndex({ agentId: 1, order: 1 });
  }
}
