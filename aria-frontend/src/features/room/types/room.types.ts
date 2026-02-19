/* ─────────────────────────────────────────────
 * Room Feature — Type Definitions
 * ───────────────────────────────────────────── */

import type { ServerAction } from "../actions";

/** Locale code from agent voice config (e.g. "en-US", "it-IT", "fr-FR") */
export type Locale = string;

/** Agent status from backend */
export type AgentStatus = "active" | "inactive";

/** Session status from backend */
export type SessionStatus = "active" | "completed" | "abandoned";

/* ── Agent ── */

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

export interface Agent {
  _id: string;
  label: string;
  status: AgentStatus;
  voice: VoiceConfig;
  features: AgentFeatures;
  render: RenderConfig;
  stepOrder: string[];
  assessment?: AssessmentConfig;
}

/* ── Participant ── */

export interface Participant {
  _id: string;
  email: string;
  name?: string;
}

/* ── Session ── */

export interface Session {
  _id: string;
  agentId: string;
  participantId: string;
  status: SessionStatus;
  currentStep: string;
  data: Record<string, unknown>;
  videoLinks?: Record<string, string>;
}

export interface SessionAuth {
  session: Session;
  accessToken: string;
  expiresAt: string;
  isResumed: boolean;
  participant: Participant;
}

/* ── Conversation / Chat ── */

export interface ChatMessage {
  sender: "assistant" | "user" | "system";
  message: string;
  stepKey?: string;
}

/* ── WebSocket — Client → Server ── */

export type WsClientMessageType =
  | "init"
  | "startRecording"
  | "audio"
  | "stopRecording"
  | "submitData"
  | "action";

export interface WsAction {
  type: string;
  [key: string]: unknown;
}

export type WsOutboundMessage =
  | { type: "init"; accessToken: string }
  | { type: "startRecording" }
  | { type: "audio"; data: string }
  | { type: "stopRecording"; latency?: number }
  | { type: "submitData"; dataType: string; payload: unknown; latency?: number }
  | { type: "action"; action: WsAction };

/* ── WebSocket — Server → Client ── */

export interface VisemeCue {
  start: number;
  end: number;
  value: string;
}

export type WsInboundMessage =
  | {
      type: "sessionReady";
      sessionId: string;
      currentStep: string;
      isNewSession: boolean;
      agentConfig: {
        voice: VoiceConfig;
        features: AgentFeatures;
        render: RenderConfig;
        stepCount: number;
      };
    }
  | {
      type: "response";
      content: string;
      currentStep: string;
      isComplete: boolean;
      /**
       * Server-triggered action.
       *
       * Accepts two forms for backward compatibility:
       *  - string:  `"openAssessment"` (signal-only, no payload)
       *  - object:  `{ type: "openAssessment", payload: { … } }`
       *
       * Dispatched via the action registry — no switch statements needed.
       */
      action?: ServerAction;
    }
  | {
      type: "audio";
      data: string;
      chunkIndex: number;
      totalChunks: number;
      isFirstChunk: boolean;
      isLastChunk: boolean;
      sampleRate: number;
      duration: number;
      text?: string;
    }
  | {
      type: "lipSync";
      cues: VisemeCue[];
      duration: number;
      text: string;
      chunkIndex: number;
      totalChunks: number;
      isFirst: boolean;
      isLast: boolean;
    }
  | { type: "transcript"; transcript: string }
  | { type: "stepChanged"; from: string; to: string; progress: number }
  | { type: "conversationComplete" }
  | { type: "processingStart"; stage: "stt" | "llm" | "tts" | "lipsync" }
  | { type: "processingEnd"; stage: "stt" | "llm" | "tts" | "lipsync" }
  | { type: "error"; error: string; code?: string; recoverable?: boolean };

/* ── Video Recorder ── */

export interface VideoUploadResult {
  success: boolean;
  url?: string;
}

/* ── Component Props ── */

export interface JoinModalProps {
  agent: Agent;
  roomId: string;
  onJoinSuccess: (auth: SessionAuth) => void;
}

export interface PresentationViewerProps {
  presentationId: string;
  currentSlide: number;
  isMobile?: boolean;
}

export interface SpeechControlsProps {
  isRecording: boolean;
  isProcessing: boolean;
  isLoading: boolean;
  isAiPlaying: boolean;
  disabled: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
}
