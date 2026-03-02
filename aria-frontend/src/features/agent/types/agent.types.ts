/* ─────────────────────────────────────────────────────────
 * Agent Types — mirrors BE DTOs + editor state
 * ───────────────────────────────────────────────────────── */

/* ── Shared configs (from @/types) ─────────────────────── */

import type {
  AgentStatus,
  VoiceConfig,
  AgentFeatures,
  PresentationConfig,
  RenderConfig,
  AssessmentConfig,
} from "@/types";

export type {
  AgentStatus,
  VoiceConfig,
  AgentFeatures,
  PresentationConfig,
  RenderConfig,
  AssessmentConfig,
};

export interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/* ── DTOs (mirror BE response shapes) ────────────────────── */

export interface StepConfig {
  label: string;
  description?: string;
  order: number;
  inputs?: Record<string, unknown>;
  nextStep: string | null;
}

export interface PromptConfig {
  system: string;
  model: string;
  temperature: number;
  maxTokens: number;
  reasoningEffort?: string;
  messages?: PromptMessage[];
}

export interface Agent {
  _id: string;
  label: string;
  ownerId: string;
  organizationId?: string;
  voice: VoiceConfig;
  features: AgentFeatures;
  render: RenderConfig;
  conversationTypeId?: string;
  stepOrder: string[];
  summaryTypeId?: string;
  statisticsTypeId?: string;
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
  /** Sparse fieldsets — only present when requested via `?include=` */
  steps?: Record<string, StepConfig>;
  prompts?: Record<string, PromptConfig>;
  assessment?: AssessmentConfig;
}

export interface StepDTO {
  _id: string;
  agentId: string;
  key: string;
  label: string;
  order: number;
  nextStep: string | null;
  inputs: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PromptDTO {
  _id: string;
  agentId: string;
  key: string;
  system: string;
  model: string;
  temperature: number;
  maxTokens: number;
  messages?: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentDTO {
  _id: string;
  agentId: string;
  testContent: string;
  language: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
}

/* ── Request payloads ────────────────────────────────────── */

export interface UpdateAgentPayload {
  label?: string;
  voice?: VoiceConfig;
  features?: Partial<AgentFeatures>;
  render?: RenderConfig;
  conversationTypeId?: string;
  stepOrder?: string[];
  summaryTypeId?: string;
  statisticsTypeId?: string;
}

export interface UpdateStepPayload {
  label?: string;
  inputs?: Record<string, unknown>;
}

export interface AddStepPayload {
  key: string;
  order: number;
  draft: true;
}
export interface StepType {
  id: string;
  labels: Record<string, string>;
  position: "first" | "flexible" | "last";
  inputSkeleton: Record<string, unknown>;
  expandsTo?: string[];
  additionalData?: { required: string[]; optional?: string[] };
}
export interface UpdatePromptPayload {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface UpdateAssessmentPayload {
  testContent?: string;
  language?: string;
  durationSeconds?: number;
}
export interface ConversationTypeDTO {
  id: string;
  name: string;
}

export interface SummaryTypeDTO {
  id: string;
  name: string;
  description: string;
  compatibleConversationTypes: string[];
}

export interface StatisticsTypeDTO {
  id: string;
  name: string;
  description: string;
  requiredSummaryTypeId: string;
}

/* ── Generate agent payload ─────────────────────────────── */

export interface GenerateAgentPayload {
  summary: string;
  label: string;
  steps: string[];
  render: RenderConfig;
  voice: VoiceConfig;
  features?: Partial<AgentFeatures>;
  conversationTypeId?: string;
  summaryTypeId: string;
  statisticsTypeId: string;
  additionalData?: {
    assessment_type?: "coding" | "written";
    time_minutes?: number;
    language_coding?: string;
    target_language?: string;
  };
}

/* ── Editor panel selection ──────────────────────────────── */

export type PanelView =
  | { kind: "settings" }
  | { kind: "step"; stepKey: string }
  | { kind: "assessment" };
