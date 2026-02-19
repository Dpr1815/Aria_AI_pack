import { ObjectId } from 'mongodb';

/**
 * Participant - Global identity across all agents
 *
 * Represents a person who participates in conversations.
 * One participant can have multiple sessions with different agents.
 *
 * @index { email: 1 } unique
 */
export interface ParticipantDocument {
  _id: ObjectId;

  /** Globally unique email - primary identifier */
  email: string;

  /** Display name (not used for identity) */
  name?: string;

  /** Optional enrichment: source, UTM params, integrations, etc. */
  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}
