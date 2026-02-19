/**
 * Audio Types
 *
 * Type definitions for audio processing, STT, TTS, and lip sync.
 */

// ============================================
// Voice Configuration
// ============================================

export type VoiceGender = 'MALE' | 'FEMALE' | 'NEUTRAL';

export interface VoiceConfig {
  languageCode: string; // e.g., 'en-US', 'it-IT'
  name: string; // e.g., 'en-US-Journey-D'
  gender: VoiceGender;
  speakingRate?: number; // 0.25 to 4.0, default 1.0
  pitch?: number; // -20.0 to 20.0, default 0
  volumeGainDb?: number; // -96.0 to 16.0, default 0
}

// ============================================
// Speech-to-Text (STT)
// ============================================

export interface STTConfig {
  encoding: string;
  sampleRateHertz: number;
  languageCode: string;
  enableAutomaticPunctuation?: boolean;
  model?: string;
  useEnhanced?: boolean;
}

export interface STTResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

// ============================================
// Text-to-Speech (TTS)
// ============================================

export interface TTSRequest {
  text: string;
  voiceConfig: VoiceConfig;
  audioConfig?: {
    audioEncoding?: string;
    sampleRateHertz?: number;
    effectsProfileId?: string[];
  };
}

export interface TTSResult {
  audioContent: Buffer;
  sampleRateHertz: number;
  audioEncoding: string;
}

// ============================================
// Lip Sync (Rhubarb Visemes)
// ============================================

/**
 * Rhubarb mouth shapes:
 * A - Closed mouth (M, B, P)
 * B - Slightly open (most consonants)
 * C - Open (EH, AE)
 * D - Wide open (AA)
 * E - Rounded (ER)
 * F - Puckered (UW, OW, W)
 * G - Upper teeth on lower lip (F, V)
 * H - Tongue behind teeth (L)
 * X - Idle/rest position
 */
export type VisemeShape = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X';

export interface VisemeMorphs {
  mouthOpen?: number;
  mouthSmile?: number;
  mouthFunnel?: number;
  mouthPucker?: number;
  mouthWide?: number;
  mouthClose?: number;
  tongueOut?: number;
  jawOpen?: number;
  [key: string]: number | undefined;
}

export interface VisemeCue {
  start: number; // Start time in seconds
  end: number; // End time in seconds
  value: string; // Rhubarb shape letter (e.g. 'A', 'B', 'X')
  morphs: VisemeMorphs; // Blend shape weights
}

export interface LipSyncResult {
  cues: VisemeCue[];
  duration: number;
  text: string;
}

// ============================================
// Synthesis Output (TTS + Lip Sync Combined)
// ============================================

export interface SynthesisChunk {
  audio: Buffer; // PCM audio data
  visemes: VisemeCue[]; // Lip sync data for this chunk
  text: string; // Original text for this chunk
  chunkIndex: number; // Position in sequence
  totalChunks: number; // Total number of chunks
  isFirst: boolean; // Is this the first chunk?
  isLast: boolean; // Is this the last chunk?
  sampleRate: number; // Audio sample rate
  duration: number; // Duration in seconds
}

export interface SynthesisMetadata {
  totalDuration: number;
  totalChunks: number;
  voiceConfig: VoiceConfig;
  lipSyncEnabled: boolean;
}

// ============================================
// Audio Chunk (for WebSocket streaming)
// ============================================

export interface AudioChunk {
  data: string; // Base64 encoded audio
  chunkIndex: number;
  isFirstChunk: boolean;
  isLastChunk: boolean;
  sampleRate: number;
  duration: number;
  text?: string;
}

export interface LipSyncChunk {
  cues: VisemeCue[];
  duration: number;
  text: string;
  chunkIndex: number;
  totalChunks: number;
  isFirst: boolean;
  isLast: boolean;
}
