import { z } from 'zod';

// ============================================
// PARAM SCHEMAS
// ============================================

export const ParticipantIdParamSchema = z.object({
  id: z.string().min(1, 'Participant ID is required'),
});

export const ParticipantEmailParamSchema = z.object({
  email: z.string().email('Invalid email format'),
});

// ============================================
// BODY SCHEMAS
// ============================================

/**
 * Update participant - only name and metadata are mutable
 * Email is immutable (it's the identity)
 */
export const UpdateParticipantSchema = z.object({
  name: z.string().min(1).max(200, 'Name too long').optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================
// QUERY SCHEMAS
// ============================================

/**
 * Query participants for an agent (used in GET /agents/:agentId/participants)
 */
export const AgentParticipantsQuerySchema = z.object({
  status: z.enum(['active', 'completed', 'abandoned']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================
// INTERNAL SCHEMAS (used by SessionService)
// ============================================

/**
 * Create participant - internal use only (via session join)
 */
export const CreateParticipantInternalSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1).max(200, 'Name too long').optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
/**
 * Get participant
 */
export const ParticipantQuerySchema = z.object({
  agentId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================
// INFERRED TYPES
// ============================================

export type ParticipantQueryInput = z.infer<typeof ParticipantQuerySchema>;
export type UpdateParticipantInput = z.infer<typeof UpdateParticipantSchema>;
export type AgentParticipantsQueryInput = z.infer<typeof AgentParticipantsQuerySchema>;
export type CreateParticipantInternalInput = z.infer<typeof CreateParticipantInternalSchema>;
