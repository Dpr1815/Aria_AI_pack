import { ObjectId } from 'mongodb';
import type { LLMMessageRole } from '../../types/conversation.types';

export type TokenCount = {
  input: number;
  output: number;
};

export type MessageEntry = {
  sequence: number;
  stepKey: string;
  role: LLMMessageRole;
  content: string;
  action?: string;
  tokenCount?: TokenCount;
  promptKey?: string;
  latencyMs?: number;
  createdAt: Date;
};

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
  sessionId: ObjectId;
  agentId: ObjectId;
  participantId: ObjectId;
  messages: MessageEntry[];
  messageCount: number;
  stepMessageCounts: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}
