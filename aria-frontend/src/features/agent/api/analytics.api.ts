/* ─────────────────────────────────────────────────────────
 * Analytics API — sessions, participants, summaries,
 *                 statistics & conversations
 *
 * Auth headers are injected automatically by api-client.ts.
 * All responses unwrap the BE ApiEnvelope<T>.
 * ───────────────────────────────────────────────────────── */

import { api } from "@/lib/api-client";
import type { ApiEnvelope } from "@/features/auth/types";
import type {
  SessionWithParticipantDTO,
  SessionDetailDTO,
  ParticipantWithStatsDTO,
  SummaryWithContextDTO,
  AgentStatisticsDTO,
  ConversationWithMessagesDTO,
  MessageDTO,
  PaginationMeta,
  ParticipantDTO,
  SummaryDTO,
} from "../types/analytics.types";

/** BE paginated envelope shape */
type PaginatedEnvelope<T> = ApiEnvelope<T[]> & { meta: PaginationMeta };

/* ── Sessions ─────────────────────────────────────────────── */

export interface SessionQueryParams {
  agentId?: string;
  participantId?: string;
  status?: "active" | "completed" | "abandoned";
  page?: number;
  limit?: number;
}

/* ── Participants ─────────────────────────────────────────── */

export interface ParticipantQueryParams {
  agentId?: string;
  page?: number;
  limit?: number;
}

/* ── Summaries ────────────────────────────────────────────── */

export interface SummaryQueryParams {
  agentId?: string;
  participantId?: string;
  typeId?: string;
  page?: number;
  limit?: number;
}

/* ── Helpers ──────────────────────────────────────────────── */

function toStringParams(
  obj: Record<string, string | number | boolean | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = String(v);
  }
  return out;
}

/* ── API ──────────────────────────────────────────────────── */

export const analyticsApi = {
  /* ── Sessions ── */

  listSessions: (params: SessionQueryParams = {}) =>
    api
      .get<
        PaginatedEnvelope<SessionWithParticipantDTO>
      >("/api/sessions", { params: toStringParams(params as Record<string, string | number | boolean | undefined>) })
      .then((r) => ({ data: r.data, meta: r.meta! })),

  getSession: (id: string) =>
    api
      .get<ApiEnvelope<SessionDetailDTO>>(`/api/sessions/${id}`)
      .then((r) => r.data),

  deleteSession: (id: string) =>
    api.delete<ApiEnvelope<null>>(`/api/sessions/${id}`),

  /* ── Participants ── */

  listParticipants: (params: ParticipantQueryParams = {}) =>
    api
      .get<
        PaginatedEnvelope<ParticipantWithStatsDTO>
      >("/api/participants", { params: toStringParams(params as Record<string, string | number | boolean | undefined>) })
      .then((r) => ({ data: r.data, meta: r.meta! })),

  getParticipant: (id: string) =>
    api
      .get<ApiEnvelope<ParticipantDTO>>(`/api/participants/${id}`)
      .then((r) => r.data),

  /* ── Summaries ── */

  listSummaries: (params: SummaryQueryParams = {}) =>
    api
      .get<
        PaginatedEnvelope<SummaryWithContextDTO>
      >("/api/summaries", { params: toStringParams(params as Record<string, string | number | boolean | undefined>) })
      .then((r) => ({ data: r.data, meta: r.meta! })),

  getSummary: (id: string) =>
    api
      .get<ApiEnvelope<SummaryDTO>>(`/api/summaries/${id}`)
      .then((r) => r.data),

  getSummaryBySession: (sessionId: string) =>
    api
      .get<
        ApiEnvelope<SummaryWithContextDTO>
      >(`/api/summaries/session/${sessionId}`)
      .then((r) => r.data),

  /* ── Statistics ── */

  getStatistics: (agentId: string) =>
    api
      .get<ApiEnvelope<AgentStatisticsDTO>>(`/api/statistics/agent/${agentId}`)
      .then((r) => r.data),

  calculateStatistics: (agentId: string) =>
    api
      .post<
        ApiEnvelope<AgentStatisticsDTO>
      >(`/api/statistics/agent/${agentId}/calculate`)
      .then((r) => r.data),

  /* ── Conversations ── */

  getConversation: (sessionId: string) =>
    api
      .get<
        ApiEnvelope<ConversationWithMessagesDTO>
      >(`/api/sessions/${sessionId}/conversation?includeRoles=user&includeRoles=assistant`)
      .then((r) => r.data),

  getConversationMessages: (sessionId: string) =>
    api
      .get<
        ApiEnvelope<MessageDTO[]>
      >(`/api/sessions/${sessionId}/conversation/messages`)
      .then((r) => r.data),

  getStepMessages: (sessionId: string, stepKey: string) =>
    api
      .get<
        ApiEnvelope<MessageDTO[]>
      >(`/api/sessions/${sessionId}/conversation/steps/${stepKey}/messages`)
      .then((r) => r.data),

  /* ── Video URLs ── */

  getVideoUrls: (sessionId: string) =>
    api
      .get<
        ApiEnvelope<Record<string, string>>
      >(`/api/sessions/${sessionId}/video-urls`)
      .then((r) => r.data),
} as const;
