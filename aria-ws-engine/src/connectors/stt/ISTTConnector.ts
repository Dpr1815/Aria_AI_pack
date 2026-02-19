/**
 * STT Connector Interface
 *
 * Defines the contract for Speech-to-Text services.
 * Allows swapping Google STT for other providers.
 */

import type { STTConfig, STTResult } from '../../types/audio.types';

// ============================================
// Stream Interface
// ============================================

export interface STTStream {
  /**
   * Unique stream identifier.
   */
  readonly id: string;

  /**
   * Write audio chunk to the stream.
   */
  write(chunk: Buffer): void;

  /**
   * End the stream and get final transcript.
   */
  end(): Promise<string>;

  /**
   * Register callback for interim results.
   */
  onInterim(callback: (result: STTResult) => void): void;

  /**
   * Register callback for final results.
   */
  onFinal(callback: (result: STTResult) => void): void;

  /**
   * Register callback for errors.
   */
  onError(callback: (error: Error) => void): void;

  /**
   * Destroy the stream and cleanup resources.
   */
  destroy(): void;

  /**
   * Check if stream is active.
   */
  isActive(): boolean;
}

// ============================================
// Connector Interface
// ============================================

export interface ISTTConnector {
  /**
   * Create a new STT streaming session.
   */
  createStream(config: STTConfig): STTStream;

  /**
   * Check if the connector is ready.
   */
  isReady(): boolean;

  /**
   * Get supported encodings.
   */
  getSupportedEncodings(): string[];

  /**
   * Get supported languages.
   */
  getSupportedLanguages(): string[];
}

// ============================================
// Configuration
// ============================================

export interface STTConnectorConfig {
  /** Path to Google Cloud service account key file */
  keyFilename?: string;
  /** Language code (e.g., 'en-US') */
  languageCode?: string;
  /** Audio encoding */
  encoding?: string;
  /** Sample rate in Hz */
  sampleRateHertz?: number;
  /** Enable automatic punctuation */
  enableAutomaticPunctuation?: boolean;
  /** Use enhanced model */
  useEnhanced?: boolean;
  /** Model variant */
  model?: string;
  /** Single utterance mode */
  singleUtterance?: boolean;
  /** Interim results */
  interimResults?: boolean;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_STT_CONFIG: STTConnectorConfig = {
  languageCode: 'en-US',
  encoding: 'WEBM_OPUS',
  sampleRateHertz: 48000,
  enableAutomaticPunctuation: true,
  useEnhanced: false,
  interimResults: true,
  singleUtterance: false,
};
