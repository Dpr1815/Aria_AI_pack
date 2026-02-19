/**
 * Google TTS Connector (Flow Engine)
 *
 * Lightweight connector for listing available Google Cloud TTS voices.
 * Uses the same service account credentials as GCS storage.
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { createLogger, ExternalServiceError, CircuitBreaker } from '@utils';

const logger = createLogger('GoogleTTSConnector');

// ============================================
// Types
// ============================================

export interface VoiceInfo {
  name: string;
  languageCode: string;
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL' | 'SSML_VOICE_GENDER_UNSPECIFIED';
  naturalSampleRateHertz: number;
}

export interface LanguageInfo {
  code: string;
  voiceCount: number;
}

export interface GoogleTTSConnectorConfig {
  keyFilePath: string;
}

// ============================================
// Connector
// ============================================

export class GoogleTTSConnector {
  private readonly client: TextToSpeechClient;
  private readonly breaker: CircuitBreaker;
  private voiceCache: Map<string, VoiceInfo[]> = new Map();

  constructor(config: GoogleTTSConnectorConfig) {
    this.client = new TextToSpeechClient({ keyFilename: config.keyFilePath });
    this.breaker = new CircuitBreaker('GoogleTTS', {
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
      monitorWindowMs: 60_000,
    });
  }

  async listVoices(languageCode?: string): Promise<VoiceInfo[]> {
    const cacheKey = languageCode ?? 'all';

    if (this.voiceCache.has(cacheKey)) {
      return this.voiceCache.get(cacheKey)!;
    }

    return this.breaker.execute(async () => {
      try {
        const [response] = await this.client.listVoices({
          languageCode: languageCode,
        });

        const voices: VoiceInfo[] = (response.voices ?? [])
          .map((voice) => ({
            name: voice.name ?? '',
            languageCode: voice.languageCodes?.[0] ?? '',
            gender:
              (voice.ssmlGender as VoiceInfo['gender']) ?? 'SSML_VOICE_GENDER_UNSPECIFIED',
            naturalSampleRateHertz: voice.naturalSampleRateHertz ?? 24000,
          }))
          .filter((v) => v.name.startsWith(v.languageCode));

        this.voiceCache.set(cacheKey, voices);
        logger.info('Voices fetched', { languageCode: cacheKey, count: voices.length });
        return voices;
      } catch (error) {
        throw new ExternalServiceError(
          'GoogleTTS',
          `Failed to list voices: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  async listLanguages(): Promise<LanguageInfo[]> {
    const voices = await this.listVoices();

    const languageMap = new Map<string, number>();
    for (const voice of voices) {
      languageMap.set(voice.languageCode, (languageMap.get(voice.languageCode) ?? 0) + 1);
    }

    return Array.from(languageMap.entries())
      .map(([code, voiceCount]) => ({ code, voiceCount }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  clearCache(): void {
    this.voiceCache.clear();
  }
}

// ============================================
// Factory
// ============================================

export function createGoogleTTSConnector(
  config: GoogleTTSConnectorConfig
): GoogleTTSConnector {
  return new GoogleTTSConnector(config);
}
