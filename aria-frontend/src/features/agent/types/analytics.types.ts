/* ─────────────────────────────────────────────────────────
 * Analytics Types — mirrors BE DTOs for sessions,
 *                   participants, summaries, statistics,
 *                   and conversations
 * ───────────────────────────────────────────────────────── */

/* ── Sessions ─────────────────────────────────────────────── */

export type SessionStatus = "active" | "completed" | "abandoned";

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

export interface SessionWithParticipantDTO extends SessionDTO {
  participant: {
    _id: string;
    email: string;
    name?: string;
  };
}

export interface SessionDetailDTO extends SessionDTO {
  data: Record<string, unknown>;
  videoLinks?: Record<string, string>;
}

/* ── Participants ─────────────────────────────────────────── */

export interface ParticipantDTO {
  _id: string;
  email: string;
  name?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantWithStatsDTO extends ParticipantDTO {
  sessionCount: number;
  lastSessionAt?: string;
}

/* ── Summaries ────────────────────────────────────────────── */

export interface SummaryDTO {
  _id: string;
  sessionId: string;
  agentId: string;
  participantId: string;
  typeId: string;
  data: Record<string, unknown>;
  generatedAt: string;
}

export interface SummaryWithContextDTO extends SummaryDTO {
  session?: {
    _id: string;
    status: string;
    completedAt?: string;
  };
  participant?: {
    _id: string;
    email: string;
    name?: string;
  };
}

/* ── Statistics ───────────────────────────────────────────── */

export interface AgentStatisticsDTO {
  _id: string;
  agentId: string;
  typeId: string;
  totalSessions: number;
  completedSessions: number;
  averageCompletionRate: number;
  data: Record<string, unknown>;
  lastCalculatedAt: string;
  createdAt: string;
  updatedAt: string;
}

/* ── Conversations ────────────────────────────────────────── */

export type MessageRole = "user" | "assistant" | "system";

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

export interface ConversationWithMessagesDTO extends ConversationDTO {
  messages: MessageDTO[];
}

/* ── Pagination meta (mirrors BE ApiResponseBuilder) ──────── */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/* ── Analytics tab navigation ─────────────────────────────── */

export type AnalyticsTab = "sessions" | "participants" | "summaries";
