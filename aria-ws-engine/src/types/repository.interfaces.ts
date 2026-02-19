/**
 * Repository Interfaces
 *
 * Contracts for repository implementations used in the WS engine.
 * These match the actual repository classes and use document types directly.
 *
 * Usage:
 *   import type { ISessionRepository, IAgentRepository } from '@types';
 */

import type { ObjectId, WithId } from 'mongodb';
import type {
  SessionDocument,
  SessionStatus,
  AgentDocument,
  ParticipantDocument,
  ConversationDocument,
  MessageEntry,
  AgentPromptDocument,
  AgentAssessmentDocument,
} from '@models';

// ============================================
// Session Repository
// ============================================

export interface ISessionRepository {
  findById(id: string | ObjectId): Promise<WithId<SessionDocument> | null>;
  findByIdOrThrow(id: string | ObjectId, resourceName?: string): Promise<WithId<SessionDocument>>;
  findByAccessTokenHash(hash: string): Promise<SessionDocument | null>;
  findActiveSession(participantId: ObjectId, agentId: ObjectId): Promise<SessionDocument | null>;
  updateStatus(sessionId: ObjectId, status: SessionStatus): Promise<SessionDocument | null>;
  markComplete(sessionId: string): Promise<SessionDocument | null>;
  touchActivity(sessionId: ObjectId): Promise<void>;
  updateCurrentStep(sessionId: ObjectId, stepKey: string): Promise<SessionDocument | null>;
  updateById(id: string | ObjectId, update: object): Promise<WithId<SessionDocument> | null>;
}

// ============================================
// Agent Repository
// ============================================

export interface IAgentRepository {
  findById(id: string | ObjectId): Promise<WithId<AgentDocument> | null>;
  findByIdOrThrow(id: string | ObjectId, resourceName?: string): Promise<WithId<AgentDocument>>;
}

// ============================================
// Participant Repository
// ============================================

export interface IParticipantRepository {
  findById(id: string | ObjectId): Promise<WithId<ParticipantDocument> | null>;
  findByIdOrThrow(
    id: string | ObjectId,
    resourceName?: string
  ): Promise<WithId<ParticipantDocument>>;
  findByEmail(email: string): Promise<ParticipantDocument | null>;
}

// ============================================
// Conversation Repository
// ============================================

export interface IConversationRepository {
  findBySessionId(sessionId: ObjectId): Promise<ConversationDocument | null>;
  findBySessionIdOrThrow(sessionId: ObjectId): Promise<ConversationDocument>;
  addMessage(
    sessionId: ObjectId,
    message: Omit<MessageEntry, 'sequence' | 'createdAt'>
  ): Promise<ConversationDocument | null>;
  addMessages(
    sessionId: ObjectId,
    messages: Omit<MessageEntry, 'sequence' | 'createdAt'>[]
  ): Promise<ConversationDocument | null>;
  getMessagesForStep(sessionId: ObjectId, stepKey: string): Promise<MessageEntry[]>;
  getLastMessages(sessionId: ObjectId, count: number): Promise<MessageEntry[]>;
}

// ============================================
// Agent Prompt Repository
// ============================================

export interface IAgentPromptRepository {
  findByAgentAndKey(agentId: ObjectId, key: string): Promise<AgentPromptDocument | null>;
  findByAgentAndKeyOrThrow(agentId: ObjectId, key: string): Promise<AgentPromptDocument>;
  findByAgentId(agentId: ObjectId): Promise<AgentPromptDocument[]>;
}

// ============================================
// Agent Assessment Repository
// ============================================

export interface IAgentAssessmentRepository {
  findByAgentId(agentId: ObjectId): Promise<AgentAssessmentDocument | null>;
  findByAgentIdOrThrow(agentId: ObjectId): Promise<AgentAssessmentDocument>;
}
