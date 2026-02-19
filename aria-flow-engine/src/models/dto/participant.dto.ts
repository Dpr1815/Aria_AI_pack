/**
 * Participant DTOs
 *
 * Response types for participant API endpoints.
 * These are the shapes returned to clients.
 */

// ============================================
// RESPONSE DTOs
// ============================================

/**
 * Base participant response
 */
export interface ParticipantDTO {
  _id: string;
  email: string;
  name?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Participant with session statistics
 * Used in GET /agents/:agentId/participants
 */
export interface ParticipantWithStatsDTO extends ParticipantDTO {
  sessionCount: number;
  lastSessionAt?: string;
}

// ============================================
// INPUT DTOs (for internal use / type safety)
// ============================================

/**
 * Create participant input (internal - used by SessionService)
 */
export interface CreateParticipantInput {
  email: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Update participant input
 */
export interface UpdateParticipantInput {
  name?: string;
  metadata?: Record<string, unknown>;
}
