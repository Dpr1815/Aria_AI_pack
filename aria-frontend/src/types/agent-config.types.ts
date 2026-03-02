/* ─────────────────────────────────────────────────────────
 * Shared Agent Config Types
 *
 * Canonical definitions consumed by both the "agent" and
 * "room" features. Keep in sync with BE DTOs.
 * ───────────────────────────────────────────────────────── */

export type AgentStatus = "active" | "inactive";

export interface VoiceConfig {
  languageCode: string;
  name: string;
  gender: "MALE" | "FEMALE" | "NEUTRAL";
}

export interface AgentFeatures {
  lipSync: boolean;
  sessionPersistence: boolean;
  autoSummary: boolean;
  videoRecording: boolean;
}

export interface PresentationConfig {
  link: string;
  slides?: Record<string, number>;
}

export interface RenderConfig {
  mode: "avatar" | "presentation";
  presentation?: PresentationConfig;
}

export interface AssessmentConfig {
  testContent: string;
  language: string;
  durationSeconds: number;
}
