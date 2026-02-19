/**
 * TTS Connector Interface
 *
 * Defines the contract for Text-to-Speech services.
 * Allows swapping Google TTS for other providers.
 */

import type { VoiceConfig, TTSResult } from '../../types/audio.types';

// ============================================
// Connector Interface
// ============================================

export interface ITTSConnector {
  /**
   * Synthesize text to audio.
   */
  synthesize(text: string, voiceConfig: VoiceConfig): Promise<TTSResult>;

  /**
   * Check if the connector is ready.
   */
  isReady(): boolean;

  /**
   * Get available voices for a language.
   */
  getVoices(languageCode?: string): Promise<VoiceInfo[]>;
}

// ============================================
// Voice Information
// ============================================

export interface VoiceInfo {
  name: string;
  languageCode: string;
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  naturalSampleRateHertz: number;
  isJourney?: boolean;
  isStreaming?: boolean;
}

// ============================================
// Configuration
// ============================================

export interface TTSConnectorConfig {
  /** Path to Google Cloud service account key file */
  keyFilename?: string;
  /** Default audio encoding */
  audioEncoding?: 'LINEAR16' | 'MP3' | 'OGG_OPUS';
  /** Default sample rate */
  sampleRateHertz?: number;
  /** Effects profile IDs */
  effectsProfileId?: string[];
  /** Enable SSML support */
  enableSsml?: boolean;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_TTS_CONFIG: TTSConnectorConfig = {
  audioEncoding: 'LINEAR16',
  sampleRateHertz: 24000,
  effectsProfileId: [],
  enableSsml: false,
};

// ============================================
// Journey Voice Patterns
// ============================================

/**
 * Voices that do NOT support speakingRate/pitch params.
 * Sending these causes a 400 error on Chirp 3 HD, Chirp HD, and Journey voices.
 */
const NO_RATE_PITCH_PATTERN = /chirp3-hd|chirp-hd|journey/i;

/**
 * Check if a voice rejects speakingRate and pitch parameters.
 */
export function isRatePitchUnsupported(voiceName: string): boolean {
  return NO_RATE_PITCH_PATTERN.test(voiceName);
}
