import { SessionStatus } from '@validations';

// ============================================
// RESPONSE DTOs
// ============================================

/**
 * Base session response
 */
export interface SessionDTO {
  _id: string;
  agentId: string;
  participantId: string;
  status: SessionStatus;
  currentStep: string;
  lastActivityAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Session with participant details (for listings)
 */
export interface SessionWithParticipantDTO extends SessionDTO {
  participant: {
    _id: string;
    email: string;
    name?: string;
  };
}

/**
 * Full session response (for detailed view)
 */
export interface SessionDetailDTO extends SessionDTO {
  data: Record<string, unknown>;
  videoLinks?: Record<string, string>;
}

/**
 * Latency record for time analysis
 */
export interface LatencyRecordDTO {
  timestamp: string;
  latencyMs: number;
  step: string;
}

// ============================================
// JOIN SESSION RESPONSE
// ============================================

/**
 * Response for POST /sessions/join
 */
export interface JoinSessionResponseDTO {
  session: SessionDTO;
  accessToken: string;
  expiresAt: string;
  isResumed: boolean;
  participant: {
    _id: string;
    email: string;
    name?: string;
  };
}
