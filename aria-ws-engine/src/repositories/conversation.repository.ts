import { ObjectId } from 'mongodb';
import { BaseRepository } from './base.repository';
import { ConversationDocument, MessageEntry } from '@models';
import { IDatabase } from '../connectors/database/IDatabase';
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
      throw new Error(`Conversation not found for session ${sessionId.toString()}`);
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
   * Sequence assignment is fully atomic: we use findOneAndUpdate with
   * returnDocument:'before' so the returned messageCount (pre-increment)
   * becomes the new message's 0-based sequence number. No separate read needed.
   */
  async addMessage(
    sessionId: ObjectId,
    message: Omit<MessageEntry, 'sequence' | 'createdAt'>
  ): Promise<ConversationDocument | null> {
    const stepKey = message.stepKey;

    // Atomically claim a sequence number via $inc (returned doc has pre-increment value)
    const before = await this.getCollection().findOneAndUpdate(
      { sessionId },
      {
        $inc: {
          messageCount: 1,
          [`stepMessageCounts.${stepKey}`]: 1,
        },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'before' }
    );

    if (!before) return null;

    const sequence = before.messageCount;
    const fullMessage: MessageEntry = {
      ...message,
      sequence,
      createdAt: new Date(),
    };

    // Push the message with the claimed sequence number
    const result = await this.getCollection().findOneAndUpdate(
      { sessionId },
      {
        $push: { messages: fullMessage },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  /**
   * Add multiple messages atomically.
   *
   * Claims a contiguous block of sequence numbers via atomic $inc,
   * then pushes all messages with their assigned sequences in one update.
   */
  async addMessages(
    sessionId: ObjectId,
    messages: Omit<MessageEntry, 'sequence' | 'createdAt'>[]
  ): Promise<ConversationDocument | null> {
    if (messages.length === 0) return this.findBySessionId(sessionId);

    // Build step count increments
    const stepIncrements: Record<string, number> = {};
    for (const msg of messages) {
      stepIncrements[`stepMessageCounts.${msg.stepKey}`] =
        (stepIncrements[`stepMessageCounts.${msg.stepKey}`] || 0) + 1;
    }

    // Atomically claim a contiguous block of sequence numbers
    const before = await this.getCollection().findOneAndUpdate(
      { sessionId },
      {
        $inc: {
          messageCount: messages.length,
          ...stepIncrements,
        },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'before' }
    );

    if (!before) return null;

    let sequence = before.messageCount;
    const now = new Date();

    const fullMessages: MessageEntry[] = messages.map((msg) => ({
      ...msg,
      sequence: sequence++,
      createdAt: now,
    }));

    // Push all messages with their claimed sequences
    const result = await this.getCollection().findOneAndUpdate(
      { sessionId },
      {
        $push: { messages: { $each: fullMessages } },
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
