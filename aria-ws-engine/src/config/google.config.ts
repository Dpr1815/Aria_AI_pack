/**
 * Google Cloud Configuration
 *
 * Settings for Google Cloud Speech-to-Text and Text-to-Speech services.
 */

import type { TokenManagerConfig } from '../connectors/google/GoogleTokenManager';
import type { STTConnectorConfig } from '../connectors/stt/ISTTConnector';
import type { TTSConnectorConfig } from '../connectors/tts/ITTSConnector';
import { logger } from '@utils';

// ============================================
// Environment Variables
// ============================================

const {
  GCS_KEY_FILE_PATH = '',
  GOOGLE_STT_ENCODING = 'WEBM_OPUS',
  GOOGLE_STT_SAMPLE_RATE = '48000',
  GOOGLE_STT_LANGUAGE = 'en-US',
  GOOGLE_STT_MODEL = '',
  GOOGLE_STT_ENHANCED = 'false',
  GOOGLE_TTS_ENCODING = 'LINEAR16',
  GOOGLE_TTS_SAMPLE_RATE = '24000',
  GOOGLE_TOKEN_REFRESH_BUFFER_MS = '300000', // 5 minutes
} = process.env;

// ============================================
// Token Manager Configuration
// ============================================

export const tokenManagerConfig: TokenManagerConfig = {
  credentialsPath: GCS_KEY_FILE_PATH,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  refreshBufferMs: parseInt(GOOGLE_TOKEN_REFRESH_BUFFER_MS, 10),
};

// ============================================
// STT Configuration
// ============================================

export const sttConfig: STTConnectorConfig = {
  keyFilename: GCS_KEY_FILE_PATH || undefined,
  encoding: GOOGLE_STT_ENCODING,
  sampleRateHertz: parseInt(GOOGLE_STT_SAMPLE_RATE, 10),
  languageCode: GOOGLE_STT_LANGUAGE,
  enableAutomaticPunctuation: true,
  useEnhanced: GOOGLE_STT_ENHANCED === 'true',
  model: GOOGLE_STT_MODEL || undefined,
  interimResults: true,
  singleUtterance: false,
};

// ============================================
// TTS Configuration
// ============================================

export const ttsConfig: TTSConnectorConfig = {
  keyFilename: GCS_KEY_FILE_PATH || undefined,
  audioEncoding: GOOGLE_TTS_ENCODING as 'LINEAR16' | 'MP3' | 'OGG_OPUS',
  sampleRateHertz: parseInt(GOOGLE_TTS_SAMPLE_RATE, 10),
  effectsProfileId: [],
  enableSsml: false,
};

// ============================================
// Combined Google Configuration
// ============================================

export interface GoogleConfig {
  tokenManager: TokenManagerConfig;
  stt: STTConnectorConfig;
  tts: TTSConnectorConfig;
}

export const googleConfig: GoogleConfig = {
  tokenManager: tokenManagerConfig,
  stt: sttConfig,
  tts: ttsConfig,
};

// ============================================
// Validation
// ============================================

export function validateGoogleConfig(): void {
  if (!tokenManagerConfig.credentialsPath) {
    logger.warn('GCS_KEY_FILE_PATH not set - using default credentials');
  }
}
