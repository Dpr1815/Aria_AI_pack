/**
 * Google TTS Connector
 *
 * Implements ITTSConnector using Google Cloud Text-to-Speech.
 * Supports both standard and Journey (streaming) voices.
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import axios from 'axios';
import type { VoiceConfig, TTSResult } from '../../types/audio.types';
import type { ITTSConnector, VoiceInfo, TTSConnectorConfig } from './ITTSConnector';
import { DEFAULT_TTS_CONFIG, isRatePitchUnsupported } from './ITTSConnector';
import { ExternalServiceError, CircuitBreaker } from '@utils';
import { stripWavHeader } from '../../utils/audio/pcmToWav';

// ============================================
// Google TTS Connector Class
// ============================================

export class GoogleTTSConnector implements ITTSConnector {
  private client: TextToSpeechClient;
  private ready = false;
  private readonly config: TTSConnectorConfig;
  private readonly breaker: CircuitBreaker;
  private voiceCache: Map<string, VoiceInfo[]> = new Map();

  constructor(config?: Partial<TTSConnectorConfig>) {
    this.config = { ...DEFAULT_TTS_CONFIG, ...config };
    this.client = new TextToSpeechClient(
      config?.keyFilename ? { keyFilename: config.keyFilename } : undefined
    );
    this.breaker = new CircuitBreaker('GoogleTTS', {
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
      monitorWindowMs: 60_000,
    });
    this.ready = true;
  }

  /**
   * Synthesize text to audio.
   * Works with all voice types — conditionally omits rate/pitch for Chirp HD voices.
   */
  async synthesize(text: string, voiceConfig: VoiceConfig): Promise<TTSResult> {
    if (!this.ready) {
      throw new ExternalServiceError('GoogleTTS', 'Connector not ready');
    }

    return this.breaker.execute(async () => {
      const canAdjustRatePitch = !isRatePitchUnsupported(voiceConfig.name);

      const request = {
        input: { text },
        voice: {
          languageCode: voiceConfig.languageCode,
          name: voiceConfig.name,
          ...(canAdjustRatePitch && voiceConfig.gender
            ? { ssmlGender: voiceConfig.gender as 'MALE' | 'FEMALE' | 'NEUTRAL' }
            : {}),
        },
        audioConfig: {
          audioEncoding: this.config.audioEncoding as 'LINEAR16',
          sampleRateHertz: this.config.sampleRateHertz,
          effectsProfileId: this.config.effectsProfileId,
          ...(canAdjustRatePitch
            ? {
                speakingRate: voiceConfig.speakingRate ?? 1.0,
                pitch: voiceConfig.pitch ?? 0,
                volumeGainDb: voiceConfig.volumeGainDb ?? 0,
              }
            : {}),
        },
      };

      const [response] = await this.client.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new ExternalServiceError('GoogleTTS', 'No audio content received');
      }

      const rawBuffer = Buffer.isBuffer(response.audioContent)
        ? response.audioContent
        : Buffer.from(response.audioContent);

      // Google TTS LINEAR16 responses include a 44-byte WAV header — strip it
      // so downstream code receives pure PCM samples.
      const audioBuffer = stripWavHeader(rawBuffer);

      return {
        audioContent: audioBuffer,
        sampleRateHertz: this.config.sampleRateHertz ?? 24000,
        audioEncoding: this.config.audioEncoding ?? 'LINEAR16',
      };
    });
  }

  /**
   * Check if connector is ready.
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Get available voices for a language.
   */
  async getVoices(languageCode?: string): Promise<VoiceInfo[]> {
    const cacheKey = languageCode ?? 'all';

    if (this.voiceCache.has(cacheKey)) {
      return this.voiceCache.get(cacheKey)!;
    }

    return this.breaker.execute(async () => {
      const [response] = await this.client.listVoices({
        languageCode: languageCode,
      });

      const voices: VoiceInfo[] = (response.voices ?? []).map((voice) => ({
        name: voice.name ?? '',
        languageCode: voice.languageCodes?.[0] ?? '',
        gender: (voice.ssmlGender as 'MALE' | 'FEMALE' | 'NEUTRAL') ?? 'NEUTRAL',
        naturalSampleRateHertz: voice.naturalSampleRateHertz ?? 24000,
        isStreaming: false,
      }));

      this.voiceCache.set(cacheKey, voices);
      return voices;
    });
  }

  /**
   * Get Journey voices only.
   */
  async getJourneyVoices(languageCode?: string): Promise<VoiceInfo[]> {
    const voices = await this.getVoices(languageCode);
    return voices.filter((v) => v.isJourney);
  }

  /**
   * Clear voice cache.
   */
  clearVoiceCache(): void {
    this.voiceCache.clear();
  }
}

// ============================================
// Factory Function
// ============================================

export function createGoogleTTSConnector(config?: Partial<TTSConnectorConfig>): GoogleTTSConnector {
  return new GoogleTTSConnector(config);
}
