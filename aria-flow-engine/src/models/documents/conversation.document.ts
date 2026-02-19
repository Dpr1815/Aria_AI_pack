import { ObjectId } from 'mongodb';
import type { MessageEntry } from '@validations';

/**
 * Conversation - Message history for a session
 *
 * One-to-one relationship with Session.
 * Contains all messages as an embedded array for atomic operations
 * and efficient full-conversation loading.
 *
 * @index { sessionId: 1 } unique (1:1 with session)
 * @index { agentId: 1, createdAt: -1 } agent analytics
 * @index { participantId: 1, createdAt: -1 } participant history
 */
export interface ConversationDocument {
  _id: ObjectId;

  /** 1:1 relationship with session */
  sessionId: ObjectId;

  /** Denormalized for direct queries without session join */
  agentId: ObjectId;
  participantId: ObjectId;

  /** Embedded message history */
  messages: MessageEntry[];

  /** Total message count (for monitoring document growth) */
  messageCount: number;

  /** Message count per step (for quick step-level stats) */
  stepMessageCounts: Record<string, number>;

  createdAt: Date;
  updatedAt: Date;
}
