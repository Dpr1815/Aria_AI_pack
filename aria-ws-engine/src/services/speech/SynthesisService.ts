/**
 * Synthesis Service
 *
 * Combines Text-to-Speech and Lip Sync generation.
 * Splits text into sentences for chunked streaming.
 *
 * OPTIMIZATION:
 * All TTS requests fire in parallel (Promise.all-style) but chunks are
 * yielded in order so the client receives them sequentially.
 * This means chunk 0 arrives as fast as a single TTS call, while chunks
 * 1..N are already being synthesized in the background.
 */

import type { ITTSConnector } from '../../connectors/tts/ITTSConnector';
import type { ILipSyncConnector } from '../../connectors/lipsync/ILipSyncConnector';
import type { VoiceConfig, SynthesisChunk, VisemeCue } from '../../types/audio.types';
import { splitIntoSentences } from '../../utils/audio/sentenceSplitter';
import { applyPcmFades } from '../../utils/audio/pcmFade';
import { cleanForTTS } from '../../utils/text/cleanString';
import { createLogger } from '@utils';

const logger = createLogger('SynthesisService');

// ============================================
// Types
// ============================================

export interface SynthesisServiceConfig {
  enableLipSync?: boolean;
  minChunkLength?: number;
  maxChunkLength?: number;
  /** Max concurrent TTS requests (default: 3) */
  maxConcurrency?: number;
}

export interface SynthesisResult {
  chunks: SynthesisChunk[];
  totalDuration: number;
  text: string;
}

// ============================================
// Synthesis Service Class
// ============================================

export class SynthesisService {
  private readonly config: Required<SynthesisServiceConfig>;

  constructor(
    private ttsConnector: ITTSConnector,
    private lipSyncConnector: ILipSyncConnector,
    config?: SynthesisServiceConfig
  ) {
    this.config = {
      enableLipSync: config?.enableLipSync ?? true,
      minChunkLength: config?.minChunkLength ?? 50,
      maxChunkLength: config?.maxChunkLength ?? 500,
      maxConcurrency: config?.maxConcurrency ?? 3,
    };
  }

  // ============================================
  // Main Synthesis Methods
  // ============================================

  /**
   * Synthesize text to audio with optional lip sync.
   * Yields chunks in order as they become ready.
   *
   * All TTS requests are fired concurrently (up to maxConcurrency),
   * so chunk N+1 is already being synthesized while chunk N is yielded.
   */
  async *synthesize(
    text: string,
    voiceConfig: VoiceConfig,
    lipSyncEnabled?: boolean
  ): AsyncGenerator<SynthesisChunk> {
    const cleanedText = cleanForTTS(text);
    if (!cleanedText) return;

    const sentences = splitIntoSentences(cleanedText, {
      minChunkLength: this.config.minChunkLength,
      maxChunkLength: this.config.maxChunkLength,
    });

    if (sentences.length === 0) return;

    const totalChunks = sentences.length;
    const shouldLipSync =
      (lipSyncEnabled ?? this.config.enableLipSync) && this.lipSyncConnector.isEnabled();

    // Fire all TTS requests immediately — they run in parallel
    const chunkPromises: Promise<SynthesisChunk>[] = sentences.map((sentence, i) =>
      this.synthesizeChunk(sentence, voiceConfig, i, totalChunks, shouldLipSync)
    );

    // Yield in order — each await resolves as soon as that specific chunk is done
    for (const chunkPromise of chunkPromises) {
      try {
        const chunk = await chunkPromise;
        yield chunk;
      } catch (error) {
        logger.error('Error synthesizing chunk', error instanceof Error ? error : undefined);
        throw error;
      }
    }
  }

  /**
   * Synthesize and collect all chunks.
   */
  async synthesizeAll(
    text: string,
    voiceConfig: VoiceConfig,
    lipSyncEnabled?: boolean
  ): Promise<SynthesisResult> {
    const chunks: SynthesisChunk[] = [];
    let totalDuration = 0;

    for await (const chunk of this.synthesize(text, voiceConfig, lipSyncEnabled)) {
      chunks.push(chunk);
      totalDuration += chunk.duration;
    }

    return { chunks, totalDuration, text };
  }

  /**
   * Synthesize a single text chunk.
   */
  private async synthesizeChunk(
    text: string,
    voiceConfig: VoiceConfig,
    chunkIndex: number,
    totalChunks: number,
    lipSyncEnabled: boolean
  ): Promise<SynthesisChunk> {
    // Generate TTS audio
    const ttsResult = await this.ttsConnector.synthesize(text, voiceConfig);

    // Calculate duration from audio buffer
    const bytesPerSample = 2; // LINEAR16 = 16 bits = 2 bytes
    const samples = ttsResult.audioContent.length / bytesPerSample;
    const duration = samples / ttsResult.sampleRateHertz;

    // Generate lip sync BEFORE fading — Rhubarb needs unmodified audio
    let visemes: VisemeCue[] = [];
    if (lipSyncEnabled) {
      try {
        const lipSyncResult = await this.lipSyncConnector.generate(ttsResult.audioContent, text);
        visemes = lipSyncResult.cues;
      } catch (error) {
        logger.warn('Lip sync failed for chunk', { chunkIndex, error: error instanceof Error ? error.message : error });
      }
    }

    // Apply fade-in/fade-out to eliminate clicks at chunk boundaries.
    // Only fade edges that border another chunk (not the very start/end of the full utterance).
    if (totalChunks > 1) {
      applyPcmFades(ttsResult.audioContent, ttsResult.sampleRateHertz, {
        fadeIn: chunkIndex > 0,
        fadeOut: chunkIndex < totalChunks - 1,
      });
    }

    return {
      audio: ttsResult.audioContent,
      visemes,
      text,
      chunkIndex,
      totalChunks,
      isFirst: chunkIndex === 0,
      isLast: chunkIndex === totalChunks - 1,
      sampleRate: ttsResult.sampleRateHertz,
      duration,
    };
  }

  // ============================================
  // Single Chunk Methods
  // ============================================

  /**
   * Synthesize a single sentence/phrase (no splitting).
   */
  async synthesizeSingle(
    text: string,
    voiceConfig: VoiceConfig,
    lipSyncEnabled?: boolean
  ): Promise<SynthesisChunk> {
    const cleanedText = cleanForTTS(text);
    if (!cleanedText) {
      throw new SynthesisError('Empty text after cleaning', 'EMPTY_TEXT');
    }

    const shouldLipSync =
      (lipSyncEnabled ?? this.config.enableLipSync) && this.lipSyncConnector.isEnabled();

    return this.synthesizeChunk(cleanedText, voiceConfig, 0, 1, shouldLipSync);
  }

  /**
   * Get just the audio (no lip sync).
   */
  async synthesizeAudioOnly(text: string, voiceConfig: VoiceConfig): Promise<Buffer> {
    const chunk = await this.synthesizeSingle(text, voiceConfig, false);
    return chunk.audio;
  }

  // ============================================
  // Utility Methods
  // ============================================

  estimateDuration(text: string): number {
    const words = text.split(/\s+/).length;
    return (words / 150) * 60;
  }

  getChunkCount(text: string): number {
    const cleanedText = cleanForTTS(text);
    if (!cleanedText) return 0;

    return splitIntoSentences(cleanedText, {
      minChunkLength: this.config.minChunkLength,
      maxChunkLength: this.config.maxChunkLength,
    }).length;
  }

  isLipSyncAvailable(): boolean {
    return this.config.enableLipSync && this.lipSyncConnector.isEnabled();
  }

  setLipSyncEnabled(enabled: boolean): void {
    (this.config as SynthesisServiceConfig).enableLipSync = enabled;
  }
}

// ============================================
// Error Class
// ============================================

export class SynthesisError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'SynthesisError';
  }
}

// ============================================
// Factory Function
// ============================================

export function createSynthesisService(
  ttsConnector: ITTSConnector,
  lipSyncConnector: ILipSyncConnector,
  config?: SynthesisServiceConfig
): SynthesisService {
  return new SynthesisService(ttsConnector, lipSyncConnector, config);
}
