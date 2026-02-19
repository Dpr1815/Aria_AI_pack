/**
 * WebSocket Types
 *
 * Type definitions for WebSocket communication between client and server.
 * Uses document types directly — no wrapper types.
 *
 * Client message types are derived from Zod schemas in @validations/websocket.validation
 * (single source of truth). Server message types are defined here (outbound, no validation).
 */

import type { WebSocket } from 'ws';
import type { ObjectId } from 'mongodb';
import type { AgentDocument, SessionDocument } from '@models';
import type { VisemeCue } from './audio.types';
import type {
  IAuthService,
  ITranscriptionService,
  ISynthesisService,
  IConversationService,
} from './service.interfaces';
import type {
  ISessionRepository,
  IAgentRepository,
  IParticipantRepository,
  IConversationRepository,
  IAgentPromptRepository,
  IAgentAssessmentRepository,
} from './repository.interfaces';

// ============================================
// Client → Server Messages (from Zod schemas)
// ============================================

import type {
  ClientMessage as _ClientMessage,
  ClientMessageType as _ClientMessageType,
} from '../validations/websocket.validation';

export type {
  InitMessage,
  StartRecordingMessage,
  AudioMessage,
  StopRecordingMessage,
  SubmitDataMessage,
  ClientMessage,
  ClientMessageType,
} from '../validations/websocket.validation';

// ============================================
// Server → Client Messages
// ============================================

export type ServerMessageType =
  | 'response'
  | 'audio'
  | 'lipSync'
  | 'transcript'
  | 'error'
  | 'sessionReady'
  | 'stepChanged'
  | 'conversationComplete'
  | 'processingStart'
  | 'processingEnd';

export interface BaseServerMessage {
  type: ServerMessageType;
}

export interface ResponseMessage extends BaseServerMessage {
  type: 'response';
  content: string;
  currentStep: string;
  isComplete: boolean;
  action?: string;
}

export interface AudioResponseMessage extends BaseServerMessage {
  type: 'audio';
  data: string;
  chunkIndex: number;
  totalChunks: number;
  isFirstChunk: boolean;
  isLastChunk: boolean;
  sampleRate: number;
  duration: number;
  text?: string;
}

export interface LipSyncMessage extends BaseServerMessage {
  type: 'lipSync';
  cues: VisemeCue[];
  duration: number;
  text: string;
  chunkIndex: number;
  totalChunks: number;
  isFirst: boolean;
  isLast: boolean;
}

export interface TranscriptMessage extends BaseServerMessage {
  type: 'transcript';
  transcript: string;
}

export interface ErrorMessage extends BaseServerMessage {
  type: 'error';
  error: string;
  code?: string;
  recoverable?: boolean;
}

export interface SessionReadyMessage extends BaseServerMessage {
  type: 'sessionReady';
  sessionId: string;
  currentStep: string;
  isNewSession: boolean;
  agentConfig: {
    voice: AgentDocument['voice'];
    features: AgentDocument['features'];
    render: AgentDocument['render'];
    stepCount: number;
  };
}

export interface StepChangedMessage extends BaseServerMessage {
  type: 'stepChanged';
  from: string;
  to: string;
}

export interface ConversationCompleteMessage extends BaseServerMessage {
  type: 'conversationComplete';
}

export interface ProcessingStartMessage extends BaseServerMessage {
  type: 'processingStart';
  stage: 'stt' | 'llm' | 'tts' | 'lipsync';
}

export interface ProcessingEndMessage extends BaseServerMessage {
  type: 'processingEnd';
  stage: 'stt' | 'llm' | 'tts' | 'lipsync';
}

export type ServerMessage =
  | ResponseMessage
  | AudioResponseMessage
  | LipSyncMessage
  | TranscriptMessage
  | ErrorMessage
  | SessionReadyMessage
  | StepChangedMessage
  | ConversationCompleteMessage
  | ProcessingStartMessage
  | ProcessingEndMessage;

// ============================================
// Handler Context
// ============================================

export interface HandlerContext {
  services: HandlerServices;
  repositories: HandlerRepositories;
  connectionState: ConnectionState;
}

export interface HandlerServices {
  auth: IAuthService;
  conversation: IConversationService;
  transcription: ITranscriptionService;
  synthesis: ISynthesisService;
}

export interface HandlerRepositories {
  session: ISessionRepository;
  agent: IAgentRepository;
  participant: IParticipantRepository;
  conversation: IConversationRepository;
  prompt: IAgentPromptRepository;
  assessment: IAgentAssessmentRepository;
}

// ============================================
// Connection State
// ============================================

export interface ConnectionState {
  sessionId: ObjectId | null;
  session: SessionDocument | null;
  agent: AgentDocument | null;
  isAuthenticated: boolean;
  transcriptionSessionId: string | null;
  ip: string;
  connectedAt: Date;
  lastActivityAt: Date;
}

// ============================================
// Handler Types
// ============================================

export type HandlerExecutor = (
  ws: WebSocket,
  data: _ClientMessage,
  context: HandlerContext
) => Promise<void>;

export interface HandlerConfig {
  execute: HandlerExecutor;
  requiresAuth?: boolean;
}

export type HandlerRegistry = Record<_ClientMessageType, HandlerConfig>;

// ============================================
// WebSocket Controller Config
// ============================================

export interface WebSocketControllerConfig {
  pingIntervalMs: number;
  pongTimeoutMs: number;
  maxMessageSize?: number;
}

export interface SendMessageOptions {
  skipIfClosed?: boolean;
}

// ============================================
// Error Codes
// ============================================

export enum ErrorCode {
  // Authentication
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_FAILED = 'AUTH_FAILED',

  // Session
  NO_SESSION = 'NO_SESSION',

  // Message handling
  MESSAGE_ERROR = 'MESSAGE_ERROR',
  UNKNOWN_TYPE = 'UNKNOWN_TYPE',

  // Audio / Recording
  INVALID_AUDIO = 'INVALID_AUDIO',
  START_RECORDING_ERROR = 'START_RECORDING_ERROR',
  STOP_RECORDING_ERROR = 'STOP_RECORDING_ERROR',
  EMPTY_TRANSCRIPT = 'EMPTY_TRANSCRIPT',

  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',

  // Handlers
  INIT_ERROR = 'INIT_ERROR',
  SUBMIT_DATA_ERROR = 'SUBMIT_DATA_ERROR',
}

// ============================================
// Errors
// ============================================

export class WebSocketError extends Error {
  code: string;
  recoverable: boolean;

  constructor(message: string, code: string, recoverable = true) {
    super(message);
    this.name = 'WebSocketError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

export class AuthenticationError extends WebSocketError {
  constructor(message: string) {
    super(message, ErrorCode.AUTH_FAILED, false);
    this.name = 'AuthenticationError';
  }
}

export class SessionError extends WebSocketError {
  constructor(message: string) {
    super(message, ErrorCode.NO_SESSION, true);
    this.name = 'SessionError';
  }
}

export class ProcessingError extends WebSocketError {
  constructor(message: string, stage: string) {
    super(message, `PROCESSING_ERROR_${stage.toUpperCase()}`, true);
    this.name = 'ProcessingError';
  }
}
