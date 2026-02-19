/* ─────────────────────────────────────────────────────────
 * Agent API — maps to BE /api/agents routes
 *
 * Auth headers are injected automatically by api-client.ts.
 * All responses unwrap the BE ApiEnvelope<T>.
 * ───────────────────────────────────────────────────────── */

import { api } from "@/lib/api-client";
import type { ApiEnvelope, PaginatedEnvelope } from "@/features/auth/types";
import type {
  Agent,
  StepDTO,
  PromptDTO,
  AssessmentDTO,
  UpdateAgentPayload,
  UpdateStepPayload,
  AddStepPayload,
  UpdatePromptPayload,
  UpdateAssessmentPayload,
  GenerateAgentPayload,
} from "../types";
import type {
  StatisticsTypeDTO,
  StepConfig,
  StepType,
  SummaryTypeDTO,
} from "../types/agent.types";

const BASE = "/api/agents" as const;

/** Sparse fieldset expansions for GET /agents/:id */
type IncludeField = "steps" | "prompts" | "assessment" | "all";

interface GetByIdOptions {
  include?: IncludeField[];
  collapse?: boolean;
}

export const agentApi = {
  generate: (payload: GenerateAgentPayload) =>
    api
      .post<ApiEnvelope<Agent>>(`${BASE}/generate`, { body: payload })
      .then((r) => r.data),

  list: (params?: { page?: number; limit?: number }) => {
    const qp: Record<string, string> = {};
    if (params?.page) qp.page = String(params.page);
    if (params?.limit) qp.limit = String(params.limit);
    return api
      .get<PaginatedEnvelope<Agent>>(BASE, { params: qp })
      .then((r) => ({ data: r.data, meta: r.meta }));
  },

  getById: (id: string, options?: GetByIdOptions) => {
    const params: Record<string, string> = {};
    if (options?.include?.length) params.include = options.include.join(",");
    if (options?.collapse) params.collapse = "true";
    return api
      .get<ApiEnvelope<Agent>>(`${BASE}/${id}`, { params })
      .then((r) => r.data);
  },
  update: (id: string, payload: UpdateAgentPayload) =>
    api
      .patch<ApiEnvelope<Agent>>(`${BASE}/${id}`, { body: payload })
      .then((r) => r.data),

  activate: (id: string) =>
    api.put<ApiEnvelope<Agent>>(`${BASE}/${id}/activate`).then((r) => r.data),

  deactivate: (id: string) =>
    api.put<ApiEnvelope<Agent>>(`${BASE}/${id}/deactivate`).then((r) => r.data),

  /* ── Steps ──────────────────────────────────────────────── */

  listSteps: (agentId: string) =>
    api
      .get<ApiEnvelope<Record<string, StepDTO>>>(`${BASE}/${agentId}/steps`)
      .then((r) => r.data),

  getStep: (agentId: string, key: string) =>
    api
      .get<ApiEnvelope<StepDTO>>(`${BASE}/${agentId}/steps/${key}`)
      .then((r) => r.data),

  updateStep: (agentId: string, key: string, payload: UpdateStepPayload) =>
    api
      .patch<ApiEnvelope<StepDTO>>(`${BASE}/${agentId}/steps/${key}`, {
        body: payload,
      })
      .then((r) => r.data),

  getStepTypes: (categoryId: string) =>
    api
      .get<ApiEnvelope<StepType[]>>(`/api/categories/${categoryId}/step-types`)
      .then((r) => r.data),

  addStep: (agentId: string, payload: AddStepPayload) =>
    api
      .post<ApiEnvelope<StepConfig>>(`${BASE}/${agentId}/steps`, {
        body: payload,
      })
      .then((r) => r.data),

  removeStep: (agentId: string, key: string) =>
    api.delete<ApiEnvelope<null>>(`${BASE}/${agentId}/steps/${key}`),

  /* ── Prompts ────────────────────────────────────────────── */

  listPrompts: (agentId: string) =>
    api
      .get<ApiEnvelope<Record<string, PromptDTO>>>(`${BASE}/${agentId}/prompts`)
      .then((r) => r.data),

  updatePrompt: (agentId: string, key: string, payload: UpdatePromptPayload) =>
    api
      .patch<ApiEnvelope<PromptDTO>>(`${BASE}/${agentId}/prompts/${key}`, {
        body: payload,
      })
      .then((r) => r.data),

  /* ── Assessment ─────────────────────────────────────────── */

  getAssessment: (agentId: string) =>
    api
      .get<ApiEnvelope<AssessmentDTO | null>>(`${BASE}/${agentId}/assessment`)
      .then((r) => r.data),

  updateAssessment: (agentId: string, payload: UpdateAssessmentPayload) =>
    api
      .patch<ApiEnvelope<AssessmentDTO>>(`${BASE}/${agentId}/assessment`, {
        body: payload,
      })
      .then((r) => r.data),

  /* ── Catalog ───────────────────────────────────────────── */

  getConversationTypes: () =>
    api
      .get<ApiEnvelope<string[]>>("/api/categories/conversation-types")
      .then((r) => r.data),

  getSummaryTypes: () =>
    api
      .get<ApiEnvelope<SummaryTypeDTO[]>>("/api/categories/summary-types")
      .then((r) => r.data),

  getSummaryTypesByConversationType: (conversationTypeId: string) =>
    api
      .get<
        ApiEnvelope<SummaryTypeDTO[]>
      >(`/api/categories/summary-types/${conversationTypeId}`)
      .then((r) => r.data),

  getStatisticsTypes: (summaryTypeId: string) =>
    api
      .get<
        ApiEnvelope<StatisticsTypeDTO[]>
      >(`/api/categories/statistics-types/${summaryTypeId}`)
      .then((r) => r.data),

  getLanguages: (conversationTypeId: string) =>
    api
      .get<
        ApiEnvelope<string[]>
      >(`/api/categories/languages/${conversationTypeId}`)
      .then((r) => r.data),

  getVoices: (languageCode: string) =>
    api
      .get<
        ApiEnvelope<VoiceDTO[]>
      >("/api/categories/voices", { params: { languageCode } })
      .then((r) => r.data),
} as const;

/* ── Voice catalog DTOs ─────────────────────────────────── */

export interface VoiceDTO {
  name: string;
  languageCode: string;
  gender: "MALE" | "FEMALE" | "NEUTRAL" | "SSML_VOICE_GENDER_UNSPECIFIED";
  naturalSampleRateHertz: number;
}
