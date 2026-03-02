import { ObjectId, Filter } from 'mongodb';
import { BaseRepository } from './base.repository';
import { ConversationDocument } from '../models/documents/conversation.document';
import { MessageEntry } from '../validations/conversation.validation';
import { IDatabase } from '../connectors/database/IDatabase';
import { PaginatedResult, NotFoundError } from '@utils';
const COLLECTION_NAME = 'conversations';

export class ConversationRepository extends BaseRepository<ConversationDocument> {
  constructor(db: IDatabase) {
    super(db, COLLECTION_NAME);
  }

  // ============================================
  // CORE LOOKUPS
  // ============================================

  /**
   * Find conversation by session ID (1:1 relationship)
   */
  async findBySessionId(sessionId: ObjectId): Promise<ConversationDocument | null> {
    return this.findOne({ sessionId });
  }

  /**
   * Find conversation by session ID or throw
   */
  async findBySessionIdOrThrow(sessionId: ObjectId): Promise<ConversationDocument> {
    const conversation = await this.findBySessionId(sessionId);
    if (!conversation) {
      throw new NotFoundError('Conversation', sessionId.toString());
    }
    return conversation;
  }

  // ============================================
  // CREATION
  // ============================================

  /**
   * Create empty conversation for a session
   */
  async createForSession(
    sessionId: ObjectId,
    agentId: ObjectId,
    participantId: ObjectId
  ): Promise<ConversationDocument> {
    return this.create({
      sessionId,
      agentId,
      participantId,
      messages: [],
      messageCount: 0,
      stepMessageCounts: {},
    } as Omit<ConversationDocument, '_id' | 'createdAt' | 'updatedAt'>);
  }

  // ============================================
  // MESSAGE OPERATIONS (used by WS engine)
  // ============================================

  /**
   * Add a message to conversation.
   *
   * NOTE: Sequence assignment is not atomic (read-then-write).
   * Callers must serialize concurrent calls for the same session
   * (e.g. via KeyedMutex in ConversationService).
   */
  async addMessage(
    sessionId: ObjectId,
    message: Omit<MessageEntry, 'sequence' | 'createdAt'>
  ): Promise<ConversationDocument | null> {
    const conversation = await this.findBySessionId(sessionId);
    if (!conversation) return null;

    const sequence = conversation.messageCount;
    const fullMessage: MessageEntry = {
      ...message,
      sequence,
      createdAt: new Date(),
    };

    const stepKey = message.stepKey;

    const result = await this.getCollection().findOneAndUpdate(
      { sessionId },
      {
        $push: { messages: fullMessage },
        $inc: {
          messageCount: 1,
          [`stepMessageCounts.${stepKey}`]: 1,
        },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Add multiple messages atomically
   */
  async addMessages(
    sessionId: ObjectId,
    messages: Omit<MessageEntry, 'sequence' | 'createdAt'>[]
  ): Promise<ConversationDocument | null> {
    const conversation = await this.findBySessionId(sessionId);
    if (!conversation) return null;

    let sequence = conversation.messageCount;
    const now = new Date();

    const fullMessages: MessageEntry[] = messages.map((msg) => ({
      ...msg,
      sequence: sequence++,
      createdAt: now,
    }));

    // Build step count increments
    const stepIncrements: Record<string, number> = {};
    for (const msg of messages) {
      stepIncrements[`stepMessageCounts.${msg.stepKey}`] =
        (stepIncrements[`stepMessageCounts.${msg.stepKey}`] || 0) + 1;
    }

    const result = await this.getCollection().findOneAndUpdate(
      { sessionId },
      {
        $push: { messages: { $each: fullMessages } },
        $inc: {
          messageCount: messages.length,
          ...stepIncrements,
        },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Find conversations for an agent
   */
  async findByAgent(
    agentId: ObjectId,
    options: { page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<ConversationDocument>> {
    const { page = 1, limit = 20 } = options;
    return this.findPaginated({ agentId }, page, limit, { createdAt: -1 });
  }

  /**
   * Find conversations for a participant
   */
  async findByParticipant(
    participantId: ObjectId,
    options: { agentId?: ObjectId; page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<ConversationDocument>> {
    const { agentId, page = 1, limit = 20 } = options;

    const filter: Filter<ConversationDocument> = { participantId };
    if (agentId) {
      filter.agentId = agentId;
    }

    return this.findPaginated(filter, page, limit, { createdAt: -1 });
  }

  /**
   * Get messages for a specific step
   */
  async getMessagesForStep(sessionId: ObjectId, stepKey: string): Promise<MessageEntry[]> {
    const conversation = await this.findBySessionId(sessionId);
    if (!conversation) return [];

    return conversation.messages.filter((m) => m.stepKey === stepKey);
  }

  /**
   * Get last N messages
   */
  async getLastMessages(sessionId: ObjectId, count: number): Promise<MessageEntry[]> {
    const conversation = await this.findBySessionId(sessionId);
    if (!conversation) return [];

    return conversation.messages.slice(-count);
  }

  // ============================================
  // DELETE OPERATIONS
  // ============================================

  /**
   * Delete conversation by session ID
   */
  async deleteBySessionId(sessionId: ObjectId): Promise<boolean> {
    const result = await this.getCollection().deleteOne({ sessionId });
    return result.deletedCount === 1;
  }

  /**
   * Delete conversations by participant
   */
  async deleteByParticipant(participantId: ObjectId): Promise<number> {
    return this.deleteMany({ participantId });
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get total message count for an agent
   */
  async getTotalMessageCount(agentId: ObjectId): Promise<number> {
    const pipeline = [
      { $match: { agentId } },
      { $group: { _id: null, total: { $sum: '$messageCount' } } },
    ];

    const result = await this.getCollection().aggregate(pipeline).toArray();
    return result[0]?.total ?? 0;
  }

  /**
   * Get average messages per conversation for an agent
   */
  async getAverageMessageCount(agentId: ObjectId): Promise<number> {
    const pipeline = [
      { $match: { agentId } },
      { $group: { _id: null, avg: { $avg: '$messageCount' } } },
    ];

    const result = await this.getCollection().aggregate(pipeline).toArray();
    return result[0]?.avg ?? 0;
  }

  // ============================================
  // INDEXES
  // ============================================

  async createIndexes(): Promise<void> {
    const collection = this.getCollection();

    // Primary lookup - 1:1 with session
    await collection.createIndex({ sessionId: 1 }, { unique: true, name: 'session_lookup' });

    // Agent analytics
    await collection.createIndex({ agentId: 1, createdAt: -1 }, { name: 'agent_conversations' });

    // Participant history
    await collection.createIndex(
      { participantId: 1, createdAt: -1 },
      { name: 'participant_conversations' }
    );
  }
}
