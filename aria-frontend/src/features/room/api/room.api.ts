import { api } from "@/lib/api-client";
import type { Agent, SessionAuth, VideoUploadResult } from "../types";

/* ─────────────────────────────────────────────
 * Room REST API
 * ─────────────────────────────────────────────
 * All REST endpoints used by the room feature.
 * Tweak base paths, params, or headers here —
 * components and hooks never know about URLs.
 *
 * Backend routes:
 *   GET  /api/agents/:id/public
 *   POST /api/sessions/join
 *   POST /api/sessions/:id/upload-video
 *   GET  /api/sessions/:id/video-url/:step
 *   GET  /api/sessions/:sessionId/conversation/messages
 *
 * All responses are wrapped: { success: boolean, data: T }
 * ───────────────────────────────────────────── */

/** Standard backend response envelope */
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/* ── Agent ── */

export async function fetchAgent(agentId: string): Promise<Agent> {
  const res = await api.get<ApiResponse<Agent>>(
    `/api/agents/${agentId}/public`,
  );
  return res.data;
}

/** Authenticated agent fetch — returns agent regardless of status. */
export async function fetchAgentAuthenticated(
  agentId: string,
): Promise<Agent> {
  const res = await api.get<ApiResponse<Agent>>(`/api/agents/${agentId}`);
  return res.data;
}

/* ── Session ── */

interface JoinSessionParams {
  agentId: string;
  email: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export async function joinSession(
  params: JoinSessionParams,
): Promise<SessionAuth> {
  const res = await api.post<ApiResponse<SessionAuth>>("/api/sessions/join", {
    body: params,
  });
  return res.data;
}

/** Authenticated test join — allows agent owner/org member to join regardless of status. */
export async function testJoinSession(
  params: JoinSessionParams,
): Promise<SessionAuth> {
  const res = await api.post<ApiResponse<SessionAuth>>("/api/sessions/test", {
    body: params,
  });
  return res.data;
}

/* ── Video ── */

export async function uploadVideo(
  blob: Blob,
  params: {
    sessionId: string;
    stepKey: string;
    accessToken: string;
  },
): Promise<VideoUploadResult> {
  const formData = new FormData();
  formData.append("step", params.stepKey);

  const filename = `${params.sessionId}_${params.stepKey}_${Date.now()}.webm`;
  formData.append("video", blob, filename);

  const res = await api.post<ApiResponse<VideoUploadResult>>(
    `/api/sessions/${params.sessionId}/upload-video`,
    {
      body: formData,
      headers: { Authorization: `Bearer ${params.accessToken}` },
    },
  );

  return res.data;
}

/* ── Conversation Messages ── */

export interface MessageEntry {
  sequence: number;
  stepKey: string;
  role: "user" | "assistant" | "system";
  content: string;
  action?: string;
  createdAt: string;
}

export async function getConversationMessages(
  sessionId: string,
  accessToken: string,
): Promise<MessageEntry[]> {
  const res = await api.get<ApiResponse<MessageEntry[]>>(
    `/api/sessions/${sessionId}/conversation/messages`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  return res.data;
}
