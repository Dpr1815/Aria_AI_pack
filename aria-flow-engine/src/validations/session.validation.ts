import { z } from 'zod';

// ============================================
// CONSTANTS
// ============================================

export const SessionStatusEnum = z.enum(['active', 'completed', 'abandoned']);

// ============================================
// PARAM SCHEMAS
// ============================================

export const SessionIdParamSchema = z.object({
  id: z.string().min(1, 'Session ID is required'),
});

export const SessionByAgentParamSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
});

// ============================================
// BODY SCHEMAS
// ============================================

/**
 * Join session - public endpoint for participants
 * Handles both new session creation and session resumption
 */
export const JoinSessionSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  email: z.string().email('Invalid email format'),
  name: z.string().min(1).max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================
// QUERY SCHEMAS
// ============================================

/**
 * Query sessions for an agent (owner dashboard)
 */
export const SessionQuerySchema = z.object({
  agentId: z.string().optional(),
  participantId: z.string().optional(),
  status: z.enum(['active', 'completed', 'abandoned']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * Query sessions by participant
 */
export const SessionByParticipantQuerySchema = z.object({
  agentId: z.string().optional(),
  status: SessionStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================
// INFERRED TYPES
// ============================================

export type SessionStatus = z.infer<typeof SessionStatusEnum>;
export type JoinSessionInput = z.infer<typeof JoinSessionSchema>;
export type SessionQueryInput = z.infer<typeof SessionQuerySchema>;
export type SessionByParticipantQueryInput = z.infer<typeof SessionByParticipantQuerySchema>;
