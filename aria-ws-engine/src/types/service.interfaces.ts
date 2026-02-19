/**
 * Service Interfaces
 *
 * Contracts for service implementations used in the WS engine.
 * Uses document types directly — no wrapper types.
 *
 * Usage:
 *   import type { IAuthService, IConversationService } from '@types';
 */

import type { ObjectId } from 'mongodb';
import type { STTConfig, VoiceConfig, SynthesisChunk } from './audio.types';
import type { SessionDocument } from '@models';
import type { InitializeResult, ProcessResult, ProcessDataResult } from './conversation.types';
import type { STTStream } from '@connectors';

// ============================================
// Auth Service
// ============================================

export interface AuthResult {
  valid: boolean;
  session?: SessionDocument;
  error?: string;
}

export interface IAuthService {
  validateAccessToken(accessToken: string): Promise<AuthResult>;
}

// ============================================
// Transcription Service
// ============================================

export interface TranscriptionSession {
  id: string;
  stream: STTStream;
  transcript: string;
  isActive: boolean;
  startedAt: Date;
}

export interface TranscriptionServiceConfig {
  defaultLanguage?: string;
  defaultEncoding?: string;
  defaultSampleRate?: number;
}

export interface ITranscriptionService {
  createSession(sessionId: string, sttConfig?: Partial<STTConfig>): TranscriptionSession;
  getSession(sessionId: string): TranscriptionSession | null;
  hasSession(sessionId: string): boolean;
  destroySession(sessionId: string): void;
  destroyAllSessions(): void;
  writeAudio(sessionId: string, chunk: Buffer): void;
  endSession(sessionId: string): Promise<string>;
  getActiveSessionCount(): number;
  getActiveSessionIds(): string[];
}

// ============================================
// Synthesis Service
// ============================================

export interface SynthesisServiceConfig {
  enableLipSync?: boolean;
  minChunkLength?: number;
  maxChunkLength?: number;
}

export interface SynthesisResult {
  chunks: SynthesisChunk[];
  totalDuration: number;
  text: string;
}

export interface ISynthesisService {
  synthesize(
    text: string,
    voiceConfig: VoiceConfig,
    lipSyncEnabled?: boolean
  ): AsyncGenerator<SynthesisChunk>;
  synthesizeAll(
    text: string,
    voiceConfig: VoiceConfig,
    lipSyncEnabled?: boolean
  ): Promise<SynthesisResult>;
  synthesizeSingle(
    text: string,
    voiceConfig: VoiceConfig,
    lipSyncEnabled?: boolean
  ): Promise<SynthesisChunk>;
  synthesizeAudioOnly(text: string, voiceConfig: VoiceConfig): Promise<Buffer>;
  estimateDuration(text: string): number;
  getChunkCount(text: string): number;
  isLipSyncAvailable(): boolean;
}

// ============================================
// Conversation Service
// ============================================

export interface IConversationService {
  initialize(sessionId: ObjectId): Promise<InitializeResult>;
  processUserInput(
    sessionId: ObjectId,
    transcript: string,
    latencyMs?: number
  ): Promise<ProcessResult>;
  processDataSubmission(
    sessionId: ObjectId,
    dataType: string,
    payload: unknown,
    latencyMs?: number
  ): Promise<ProcessDataResult>;
  getSessionStatus(sessionId: ObjectId): Promise<{
    exists: boolean;
    isComplete: boolean;
    currentStep: string | null;
  }>;
}
