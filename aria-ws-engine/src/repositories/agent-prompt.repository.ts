import { ObjectId } from 'mongodb';
import { BaseRepository } from './base.repository';
import { AgentPromptDocument } from '@models';
import { IDatabase } from '../connectors/database/IDatabase';

const COLLECTION_NAME = 'agent_prompts';

export class AgentPromptRepository extends BaseRepository<AgentPromptDocument> {
  constructor(db: IDatabase) {
    super(db, COLLECTION_NAME);
  }

  /**
   * Find a single prompt by agent ID and prompt key
   */
  async findByAgentAndKey(agentId: ObjectId, key: string): Promise<AgentPromptDocument | null> {
    return this.findOne({ agentId, key });
  }

  /**
   * Find a single prompt by agent ID and prompt key, throw if not found
   */
  async findByAgentAndKeyOrThrow(agentId: ObjectId, key: string): Promise<AgentPromptDocument> {
    const prompt = await this.findByAgentAndKey(agentId, key);
    if (!prompt) {
      throw new Error(`Prompt not found: ${key} for agent ${agentId}`);
    }
    return prompt;
  }

  /**
   * Find all prompts for an agent
   */
  async findByAgentId(agentId: ObjectId): Promise<AgentPromptDocument[]> {
    return this.findMany({ agentId });
  }

  /**
   * Find prompts by agent ID as a keyed object (for backwards compatibility)
   */
  async findByAgentIdAsRecord(agentId: ObjectId): Promise<Record<string, AgentPromptDocument>> {
    const prompts = await this.findByAgentId(agentId);
    return prompts.reduce(
      (acc, prompt) => {
        acc[prompt.key] = prompt;
        return acc;
      },
      {} as Record<string, AgentPromptDocument>
    );
  }

  /**
   * Create multiple prompts for an agent
   */
  async createManyForAgent(
    agentId: ObjectId,
    prompts: Omit<AgentPromptDocument, '_id' | 'agentId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<AgentPromptDocument[]> {
    const promptsWithAgentId = prompts.map((prompt) => ({
      ...prompt,
      agentId,
    }));
    return this.createMany(promptsWithAgentId as AgentPromptDocument[]);
  }

  /**
   * Update a prompt by agent ID and key
   */
  async updateByAgentAndKey(
    agentId: ObjectId,
    key: string,
    update: Partial<Omit<AgentPromptDocument, '_id' | 'agentId' | 'key'>>
  ): Promise<AgentPromptDocument | null> {
    const prompt = await this.findByAgentAndKey(agentId, key);
    if (!prompt) return null;
    return this.updateById(prompt._id, update);
  }

  /**
   * Delete all prompts for an agent
   */
  async deleteByAgentId(agentId: ObjectId): Promise<number> {
    return this.deleteMany({ agentId });
  }

  /**
   * Delete a single prompt by agent ID and key
   */
  async deleteByAgentAndKey(agentId: ObjectId, key: string): Promise<boolean> {
    const prompt = await this.findByAgentAndKey(agentId, key);
    if (!prompt) return false;
    await this.deleteById(prompt._id);
    return true;
  }

  /**
   * Count prompts for an agent
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
    await collection.createIndex({ agentId: 1 });
  }
}
