/* ─────────────────────────────────────────────────────────
 * useAnalytics — TanStack Query hooks for analytics data
 *
 * Key factory keeps cache consistent with the agent keys
 * pattern established in use-agent.ts.
 * ───────────────────────────────────────────────────────── */

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  analyticsApi,
  type SessionQueryParams,
  type ParticipantQueryParams,
  type SummaryQueryParams,
} from "../api/analytics.api";

/* ── Query key factory ────────────────────────────────────── */

export const analyticsKeys = {
  all: ["analytics"] as const,

  /* Sessions */
  sessions: (agentId: string) =>
    [...analyticsKeys.all, "sessions", agentId] as const,
  sessionList: (agentId: string, params: SessionQueryParams) =>
    [...analyticsKeys.sessions(agentId), params] as const,
  sessionDetail: (sessionId: string) =>
    [...analyticsKeys.all, "session", sessionId] as const,

  /* Participants */
  participants: (agentId: string) =>
    [...analyticsKeys.all, "participants", agentId] as const,
  participantList: (agentId: string, params: ParticipantQueryParams) =>
    [...analyticsKeys.participants(agentId), params] as const,
  participantAll: (agentId: string) =>
    [...analyticsKeys.participants(agentId), "all"] as const,

  /* Summaries */
  summaries: (agentId: string) =>
    [...analyticsKeys.all, "summaries", agentId] as const,
  summaryList: (agentId: string, params: SummaryQueryParams) =>
    [...analyticsKeys.summaries(agentId), params] as const,
  summaryDetail: (id: string) => [...analyticsKeys.all, "summary", id] as const,
  summaryBySession: (sessionId: string) =>
    [...analyticsKeys.all, "summary-session", sessionId] as const,

  /* Statistics */
  statistics: (agentId: string) =>
    [...analyticsKeys.all, "statistics", agentId] as const,

  /* Conversations */
  conversation: (sessionId: string) =>
    [...analyticsKeys.all, "conversation", sessionId] as const,
  conversationMessages: (sessionId: string) =>
    [...analyticsKeys.all, "messages", sessionId] as const,

  /* Video URLs */
  videoUrls: (sessionId: string) =>
    [...analyticsKeys.all, "video-urls", sessionId] as const,
};

/* ── Sessions ─────────────────────────────────────────────── */

export function useSessions(
  agentId: string,
  params: Omit<SessionQueryParams, "agentId"> = {},
) {
  const queryParams: SessionQueryParams = { ...params, agentId };
  return useQuery({
    queryKey: analyticsKeys.sessionList(agentId, queryParams),
    queryFn: () => analyticsApi.listSessions(queryParams),
    enabled: !!agentId,
    staleTime: 15_000,
  });
}

export function useSessionDetail(sessionId: string | null) {
  return useQuery({
    queryKey: analyticsKeys.sessionDetail(sessionId!),
    queryFn: () => analyticsApi.getSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

export function useDeleteSession(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => analyticsApi.deleteSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: analyticsKeys.sessions(agentId) });
      qc.invalidateQueries({ queryKey: analyticsKeys.statistics(agentId) });
    },
  });
}

/* ── Participants ─────────────────────────────────────────── */

export function useParticipants(
  agentId: string,
  params: Omit<ParticipantQueryParams, "agentId"> = {},
) {
  const queryParams: ParticipantQueryParams = { ...params, agentId };
  return useQuery({
    queryKey: analyticsKeys.participantList(agentId, queryParams),
    queryFn: () => analyticsApi.listParticipants(queryParams),
    enabled: !!agentId,
    staleTime: 15_000,
  });
}

/**
 * Fetches ALL participants for an agent (up to 100) and returns
 * a Map<participantId, { name, email }> for fast lookup.
 * Used by sessions & summaries tabs to display participant info.
 */
export function useParticipantMap(agentId: string) {
  const { data, isLoading } = useQuery({
    queryKey: analyticsKeys.participantAll(agentId),
    queryFn: () => analyticsApi.listParticipants({ agentId, limit: 100 }),
    enabled: !!agentId,
    staleTime: 60_000,
  });

  const map = useMemo(() => {
    const m = new Map<string, { name?: string; email: string }>();
    if (data?.data) {
      for (const p of data.data) {
        m.set(p._id, { name: p.name, email: p.email });
      }
    }
    return m;
  }, [data]);

  return { participantMap: map, isLoading };
}

/* ── Summaries ────────────────────────────────────────────── */

export function useSummaries(
  agentId: string,
  params: Omit<SummaryQueryParams, "agentId"> = {},
) {
  const queryParams: SummaryQueryParams = { ...params, agentId };
  return useQuery({
    queryKey: analyticsKeys.summaryList(agentId, queryParams),
    queryFn: () => analyticsApi.listSummaries(queryParams),
    enabled: !!agentId,
    staleTime: 15_000,
  });
}

export function useSummaryBySession(sessionId: string | null) {
  return useQuery({
    queryKey: analyticsKeys.summaryBySession(sessionId!),
    queryFn: () => analyticsApi.getSummaryBySession(sessionId!),
    enabled: !!sessionId,
    staleTime: 60_000,
  });
}

/* ── Statistics ───────────────────────────────────────────── */

export function useStatistics(agentId: string) {
  return useQuery({
    queryKey: analyticsKeys.statistics(agentId),
    queryFn: () => analyticsApi.getStatistics(agentId),
    enabled: !!agentId,
    staleTime: 60_000,
  });
}

export function useCalculateStatistics(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => analyticsApi.calculateStatistics(agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: analyticsKeys.statistics(agentId) });
    },
  });
}

/* ── Conversations ────────────────────────────────────────── */

export function useConversation(sessionId: string | null) {
  return useQuery({
    queryKey: analyticsKeys.conversation(sessionId!),
    queryFn: () => analyticsApi.getConversation(sessionId!),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

/* ── Video URLs ──────────────────────────────────────────── */

export function useSessionVideoUrls(sessionId: string | null) {
  return useQuery({
    queryKey: analyticsKeys.videoUrls(sessionId!),
    queryFn: () => analyticsApi.getVideoUrls(sessionId!),
    enabled: !!sessionId,
    staleTime: 300_000, // 5 minutes — signed URLs last 7 days
  });
}
