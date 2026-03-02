/**
 * Shared mock factories for room feature tests.
 */
import type {
  Agent,
  Session,
  SessionAuth,
  ChatMessage,
  AssessmentConfig,
} from "../types";

export { en as mockLabels } from "@/i18n/locales/en";

/* ── Agent ── */

export function createMockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    _id: "agent-1",
    label: "Test Agent",
    status: "active",
    voice: { languageCode: "en-US", name: "en-US-Neural2-F", gender: "FEMALE" },
    features: {
      lipSync: false,
      sessionPersistence: false,
      autoSummary: false,
      videoRecording: false,
    },
    render: { mode: "avatar" },
    stepOrder: ["intro", "main", "conclusion"],
    ...overrides,
  };
}

/* ── Session ── */

export function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    _id: "session-1",
    agentId: "agent-1",
    participantId: "participant-1",
    status: "active",
    currentStep: "intro",
    data: {},
    ...overrides,
  };
}

/* ── SessionAuth ── */

export function createMockSessionAuth(
  overrides: Partial<SessionAuth> = {},
): SessionAuth {
  return {
    session: createMockSession(),
    accessToken: "tok-123",
    expiresAt: "2026-12-31T00:00:00Z",
    isResumed: false,
    participant: { _id: "participant-1", email: "test@example.com", name: "Test User" },
    ...overrides,
  };
}

/* ── ChatMessage ── */

export function createMockChatMessage(
  overrides: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    sender: "assistant",
    message: "Hello, welcome to the interview.",
    stepKey: "intro",
    ...overrides,
  };
}

/* ── AssessmentConfig ── */

export function createMockAssessmentConfig(
  overrides: Partial<AssessmentConfig> = {},
): AssessmentConfig {
  return {
    testContent: "# Code Challenge\n\nWrite a function...",
    language: "TypeScript",
    durationSeconds: 1800,
    ...overrides,
  };
}
