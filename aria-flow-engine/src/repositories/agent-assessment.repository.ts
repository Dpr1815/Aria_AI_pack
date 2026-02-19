import { ObjectId } from 'mongodb';
import { BaseRepository } from './base.repository';
import { AgentAssessmentDocument } from '../models/documents/agent-assessment.document';
import { IDatabase } from '../connectors/database/IDatabase';
import { NotFoundError } from '@utils';

const COLLECTION_NAME = 'agent_assessments';

export class AgentAssessmentRepository extends BaseRepository<AgentAssessmentDocument> {
  constructor(db: IDatabase) {
    super(db, COLLECTION_NAME);
  }

  /**
   * Find assessment by agent ID
   */
  async findByAgentId(agentId: ObjectId): Promise<AgentAssessmentDocument | null> {
    return this.findOne({ agentId });
  }

  /**
   * Find assessment by agent ID, throw if not found
   */
  async findByAgentIdOrThrow(agentId: ObjectId): Promise<AgentAssessmentDocument> {
    const assessment = await this.findByAgentId(agentId);
    if (!assessment) {
      throw new NotFoundError('AgentAssessment', agentId.toString());
    }
    return assessment;
  }

  /**
   * Create assessment for an agent
   */
  async createForAgent(
    agentId: ObjectId,
    assessment: Omit<AgentAssessmentDocument, '_id' | 'agentId' | 'createdAt' | 'updatedAt'>
  ): Promise<AgentAssessmentDocument> {
    return this.create({
      ...assessment,
      agentId,
    } as AgentAssessmentDocument);
  }

  /**
   * Update assessment by agent ID
   */
  async updateByAgentId(
    agentId: ObjectId,
    update: Partial<Omit<AgentAssessmentDocument, '_id' | 'agentId'>>
  ): Promise<AgentAssessmentDocument | null> {
    const assessment = await this.findByAgentId(agentId);
    if (!assessment) return null;
    return this.updateById(assessment._id, update);
  }

  /**
   * Delete assessment by agent ID
   */
  async deleteByAgentId(agentId: ObjectId): Promise<boolean> {
    const assessment = await this.findByAgentId(agentId);
    if (!assessment) return false;
    return this.deleteById(assessment._id);
  }

  /**
   * Check if agent has assessment
   */
  async existsForAgent(agentId: ObjectId): Promise<boolean> {
    return this.exists({ agentId });
  }

  /**
   * Create database indexes
   */
  async createIndexes(): Promise<void> {
    const collection = this.getCollection();
    await collection.createIndex({ agentId: 1 }, { unique: true });
  }
}
