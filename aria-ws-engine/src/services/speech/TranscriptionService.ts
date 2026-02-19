/**
 * Transcription Service
 *
 * Wrapper around STT connector for managing transcription sessions.
 * Handles streaming audio and provides final transcripts.
 */

import { EventEmitter } from 'events';
import type { ISTTConnector, STTStream } from '../../connectors/stt/ISTTConnector';
import type { STTConfig, STTResult } from '../../types/audio.types';
import type { TranscriptionSession, TranscriptionServiceConfig } from '@types';
import { createLogger } from '@utils';

const logger = createLogger('TranscriptionService');

export type TranscriptionEventType = 'interim' | 'final' | 'error' | 'complete';

// ============================================
// Transcription Service Class
// ============================================

export class TranscriptionService extends EventEmitter {
  private sessions: Map<string, TranscriptionSession> = new Map();
  private readonly config: Required<TranscriptionServiceConfig>;

  constructor(
    private sttConnector: ISTTConnector,
    config?: TranscriptionServiceConfig
  ) {
    super();

    // Prevent unhandled 'error' events from crashing the process.
    // Callers can still attach their own 'error' listeners.
    this.on('error', (evt: { sessionId: string; error: Error }) => {
      logger.error('Transcription error', evt.error, { sessionId: evt.sessionId });
    });

    this.config = {
      defaultLanguage: config?.defaultLanguage ?? 'en-US',
      defaultEncoding: config?.defaultEncoding ?? 'WEBM_OPUS',
      defaultSampleRate: config?.defaultSampleRate ?? 48000,
    };
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Create a new transcription session.
   */
  createSession(sessionId: string, sttConfig?: Partial<STTConfig>): TranscriptionSession {
    // Clean up existing session if any
    if (this.sessions.has(sessionId)) {
      this.destroySession(sessionId);
    }

    const config: STTConfig = {
      encoding: sttConfig?.encoding ?? this.config.defaultEncoding,
      sampleRateHertz: sttConfig?.sampleRateHertz ?? this.config.defaultSampleRate,
      languageCode: sttConfig?.languageCode ?? this.config.defaultLanguage,
      enableAutomaticPunctuation: sttConfig?.enableAutomaticPunctuation ?? true,
      model: sttConfig?.model,
    };

    const stream = this.sttConnector.createStream(config);

    const session: TranscriptionSession = {
      id: sessionId,
      stream,
      transcript: '',
      isActive: true,
      startedAt: new Date(),
    };

    // Setup stream event handlers
    this.setupStreamHandlers(session);

    this.sessions.set(sessionId, session);
    logger.info('Session created', { sessionId });

    return session;
  }

  /**
   * Get existing session.
   */
  getSession(sessionId: string): TranscriptionSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /**
   * Check if session exists.
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Destroy a session and cleanup resources.
   */
  destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.isActive = false;
    session.stream.destroy();
    this.sessions.delete(sessionId);

    logger.info('Session destroyed', { sessionId });
  }

  /**
   * Destroy all sessions.
   */
  destroyAllSessions(): void {
    for (const sessionId of this.sessions.keys()) {
      this.destroySession(sessionId);
    }
  }

  // ============================================
  // Audio Processing
  // ============================================

  /**
   * Write audio chunk to session.
   */
  writeAudio(sessionId: string, chunk: Buffer): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      logger.warn('No active session', { sessionId });
      return;
    }

    session.stream.write(chunk);
  }

  /**
   * End session and get final transcript.
   */
  async endSession(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new TranscriptionError('Session not found', 'SESSION_NOT_FOUND');
    }

    try {
      session.isActive = false;
      const finalTranscript = await session.stream.end();

      // Update transcript with final result
      if (finalTranscript) {
        session.transcript = finalTranscript;
      }

      this.emit('complete', {
        sessionId,
        transcript: session.transcript,
        duration: Date.now() - session.startedAt.getTime(),
      });

      // Cleanup
      this.sessions.delete(sessionId);
      logger.info('Session ended', {
        sessionId,
        transcriptPreview: session.transcript.substring(0, 50),
      });

      return session.transcript;
    } catch (error) {
      this.emit('error', { sessionId, error });
      throw error;
    }
  }

  // ============================================
  // Event Handlers
  // ============================================

  /**
   * Setup stream event handlers.
   */
  private setupStreamHandlers(session: TranscriptionSession): void {
    const { stream, id: sessionId } = session;

    // Interim results
    stream.onInterim((result: STTResult) => {
      this.emit('interim', {
        sessionId,
        transcript: result.transcript,
        confidence: result.confidence,
      });
    });

    // Final results
    stream.onFinal((result: STTResult) => {
      session.transcript = result.transcript;
      this.emit('final', {
        sessionId,
        transcript: result.transcript,
        confidence: result.confidence,
      });
    });

    // Errors
    stream.onError((error: Error) => {
      logger.error('Stream error', error, { sessionId });
      this.emit('error', { sessionId, error });
    });
  }

  // ============================================
  // Convenience Methods
  // ============================================

  /**
   * Transcribe a complete audio buffer (non-streaming).
   */
  async transcribeBuffer(audioBuffer: Buffer, config?: Partial<STTConfig>): Promise<string> {
    const tempSessionId = `temp-${Date.now()}`;

    try {
      this.createSession(tempSessionId, config);
      this.writeAudio(tempSessionId, audioBuffer);
      return await this.endSession(tempSessionId);
    } catch (error) {
      this.destroySession(tempSessionId);
      throw error;
    }
  }

  /**
   * Get active session count.
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get list of active session IDs.
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }
}

// ============================================
// Error Class
// ============================================

export class TranscriptionError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

// ============================================
// Factory Function
// ============================================

export function createTranscriptionService(
  sttConnector: ISTTConnector,
  config?: TranscriptionServiceConfig
): TranscriptionService {
  return new TranscriptionService(sttConnector, config);
}
