import type { MessageRole } from '@validations';

// ============================================
// RESPONSE DTOs
// ============================================

/**
 * Message entry response
 */
export interface MessageDTO {
  sequence: number;
  stepKey: string;
  role: MessageRole;
  content: string;
  tokenCount?: {
    input: number;
    output: number;
  };
  promptKey?: string;
  modelId?: string;
  latencyMs?: number;
  createdAt: string;
}

/**
 * Base conversation response (metadata only)
 */
export interface ConversationDTO {
  _id: string;
  sessionId: string;
  agentId: string;
  participantId: string;
  messageCount: number;
  stepMessageCounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Full conversation response (with messages)
 */
export interface ConversationWithMessagesDTO extends ConversationDTO {
  messages: MessageDTO[];
}

/**
 * Conversation summary (for listings)
 */
export interface ConversationSummaryDTO {
  _id: string;
  sessionId: string;
  agentId: string;
  participantId: string;
  messageCount: number;
  lastMessageAt?: string;
  createdAt: string;
}
