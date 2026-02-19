import { ObjectId } from 'mongodb';

export type SessionStatus = 'active' | 'completed' | 'abandoned';

/**
 * Session - Conversation instance with access control
 *
 * Represents a single conversation between a participant and an agent.
 * Handles access control via hashed JWT tokens and tracks conversation state.
 *
 * @index { participantId: 1, agentId: 1, status: 1 } session lookup (persistence)
 * @index { agentId: 1, status: 1 } agent session listings
 * @index { agentOwnerId: 1, createdAt: -1 } owner dashboards
 * @index { accessTokenHash: 1 } token validation
 */
export interface SessionDocument {
  _id: ObjectId;

  // ===== Relationships =====
  agentId: ObjectId;
  participantId: ObjectId;

  /** Denormalized for efficient owner queries (avoids agent join) */
  agentOwnerId: ObjectId;

  // ===== Access Control =====
  /** SHA-256 hash of JWT token */
  accessTokenHash: string;
  accessTokenExpiresAt: Date;

  // ===== State =====
  status: SessionStatus;

  /** Current step key in the conversation flow */
  currentStep: string;

  /** Step-collected data: form inputs, assessment answers, etc. */
  data: Record<string, unknown>;

  // ===== Optional Features =====
  /** Video recording links if feature enabled */
  videoLinks?: Record<string, string>;

  // ===== Timestamps =====
  lastActivityAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
