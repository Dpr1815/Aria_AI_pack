/**
 * Google STT Connector
 *
 * Implements ISTTConnector using Google Cloud Speech-to-Text.
 * Supports streaming recognition with interim results.
 */

import { SpeechClient } from '@google-cloud/speech';
import { v4 as uuidv4 } from 'uuid';
import type { STTConfig, STTResult } from '../../types/audio.types';
import type { ISTTConnector, STTStream, STTConnectorConfig } from './ISTTConnector';
import { DEFAULT_STT_CONFIG } from './ISTTConnector';
import type { GoogleTokenManager } from '../google/GoogleTokenManager';
import { ExternalServiceError } from '@utils';

// ============================================
// Google STT Stream Implementation
// ============================================

class GoogleSTTStream implements STTStream {
  readonly id: string;

  private recognizeStream: ReturnType<SpeechClient['streamingRecognize']> | null = null;
  private transcript = '';
  private active = false;
  private destroyed = false;

  private interimCallbacks: Array<(result: STTResult) => void> = [];
  private finalCallbacks: Array<(result: STTResult) => void> = [];
  private errorCallbacks: Array<(error: Error) => void> = [];

  constructor(
    private client: SpeechClient,
    private config: STTConfig
  ) {
    this.id = uuidv4();
    this.initializeStream();
  }

  private initializeStream(): void {
    const request = {
      config: {
        encoding: this.config.encoding as 'WEBM_OPUS' | 'LINEAR16',
        sampleRateHertz: this.config.sampleRateHertz,
        languageCode: this.config.languageCode,
        enableAutomaticPunctuation: this.config.enableAutomaticPunctuation ?? true,
        model: this.config.model,
        useEnhanced: this.config.useEnhanced ?? false,
      },
      interimResults: true,
      singleUtterance: false,
    };

    this.recognizeStream = this.client.streamingRecognize(request);
    this.active = true;

    this.recognizeStream.on('data', (response) => {
      this.handleResponse(response);
    });

    this.recognizeStream.on('error', (error) => {
      this.handleError(error as Error);
    });

    this.recognizeStream.on('end', () => {
      this.active = false;
    });
  }

  private handleResponse(response: {
    results?: Array<{
      alternatives?: Array<{ transcript?: string; confidence?: number }>;
      isFinal?: boolean;
    }>;
  }): void {
    if (!response.results || response.results.length === 0) {
      return;
    }

    const result = response.results[0];
    const alternative = result.alternatives?.[0];

    if (!alternative?.transcript) {
      return;
    }

    const sttResult: STTResult = {
      transcript: alternative.transcript,
      confidence: alternative.confidence ?? 0,
      isFinal: result.isFinal ?? false,
    };

    if (sttResult.isFinal) {
      // Accumulate final transcripts
      this.transcript += (this.transcript ? ' ' : '') + sttResult.transcript;
      this.finalCallbacks.forEach((cb) => cb(sttResult));
    } else {
      this.interimCallbacks.forEach((cb) => cb(sttResult));
    }
  }

  private handleError(error: Error): void {
    // Ignore "cancelled" errors on intentional stop
    if (error.message?.includes('cancelled') && !this.active) {
      return;
    }
    this.errorCallbacks.forEach((cb) => cb(error));
  }

  write(chunk: Buffer): void {
    if (this.destroyed || !this.recognizeStream) {
      return;
    }

    try {
      this.recognizeStream.write(chunk);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  async end(): Promise<string> {
    if (this.destroyed) {
      return this.transcript;
    }

    return new Promise((resolve) => {
      if (!this.recognizeStream) {
        resolve(this.transcript);
        return;
      }

      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(this.transcript);
      };

      // Safety timeout — generous, only fires if Google never responds
      const safetyTimeout = setTimeout(done, 10_000);

      // Resolve when Google sends the final result after half-close
      const onFinalData = (response: { results?: Array<{ isFinal?: boolean }> }) => {
        if (response.results?.[0]?.isFinal) {
          // The existing 'data' listener already called handleResponse,
          // so this.transcript is up to date.
          done();
        }
      };

      const cleanup = () => {
        clearTimeout(safetyTimeout);
        this.recognizeStream?.removeListener('data', onFinalData);
        this.recognizeStream?.removeListener('end', onEnd);
      };

      const onEnd = () => done();

      this.recognizeStream.on('data', onFinalData);
      this.recognizeStream.once('end', onEnd);

      try {
        this.recognizeStream.end();
      } catch {
        done();
      }

      this.active = false;
    });
  }

  onInterim(callback: (result: STTResult) => void): void {
    this.interimCallbacks.push(callback);
  }

  onFinal(callback: (result: STTResult) => void): void {
    this.finalCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.active = false;

    if (this.recognizeStream) {
      try {
        this.recognizeStream.destroy();
      } catch {
        // Ignore destroy errors
      }
      this.recognizeStream = null;
    }

    this.interimCallbacks = [];
    this.finalCallbacks = [];
    this.errorCallbacks = [];
  }

  isActive(): boolean {
    return this.active && !this.destroyed;
  }
}

// ============================================
// Google STT Connector Class
// ============================================

export class GoogleSTTConnector implements ISTTConnector {
  private client: SpeechClient;
  private ready = false;
  private readonly defaultConfig: STTConnectorConfig;

  constructor(config?: Partial<STTConnectorConfig>) {
    this.defaultConfig = { ...DEFAULT_STT_CONFIG, ...config };

    // Initialize client
    this.client = new SpeechClient(
      config?.keyFilename ? { keyFilename: config.keyFilename } : undefined
    );
    this.ready = true;
  }

  /**
   * Create a new STT streaming session.
   */
  createStream(config: STTConfig): STTStream {
    if (!this.ready) {
      throw new ExternalServiceError('GoogleSTT', 'Connector not ready');
    }

    const mergedConfig: STTConfig = {
      encoding: config.encoding ?? this.defaultConfig.encoding ?? 'WEBM_OPUS',
      sampleRateHertz: config.sampleRateHertz ?? this.defaultConfig.sampleRateHertz ?? 48000,
      languageCode: config.languageCode ?? this.defaultConfig.languageCode ?? 'en-US',
      enableAutomaticPunctuation:
        config.enableAutomaticPunctuation ?? this.defaultConfig.enableAutomaticPunctuation,
      model: config.model ?? this.defaultConfig.model,
      useEnhanced: config.useEnhanced ?? this.defaultConfig.useEnhanced,
    };

    return new GoogleSTTStream(this.client, mergedConfig);
  }

  /**
   * Check if connector is ready.
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Get supported audio encodings.
   */
  getSupportedEncodings(): string[] {
    return [
      'WEBM_OPUS',
      'LINEAR16',
      'FLAC',
      'MULAW',
      'AMR',
      'AMR_WB',
      'OGG_OPUS',
      'SPEEX_WITH_HEADER_BYTE',
    ];
  }

  /**
   * Get supported language codes.
   */
  getSupportedLanguages(): string[] {
    // Common languages - full list available in Google docs
    return [
      'en-US',
      'en-GB',
      'en-AU',
      'es-ES',
      'es-MX',
      'fr-FR',
      'fr-CA',
      'de-DE',
      'it-IT',
      'pt-BR',
      'pt-PT',
      'nl-NL',
      'ja-JP',
      'ko-KR',
      'zh-CN',
      'zh-TW',
      'ru-RU',
      'ar-SA',
      'hi-IN',
    ];
  }
}

// ============================================
// Factory Function
// ============================================

export function createGoogleSTTConnector(config?: Partial<STTConnectorConfig>): GoogleSTTConnector {
  return new GoogleSTTConnector(config);
}
