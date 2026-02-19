/**
 * Configuration Index
 *
 * Aggregates all configuration modules and provides validation.
 * Loads environment variables from .env file in development.
 */

import { config as dotenvConfig } from 'dotenv';
import { logger } from '@utils';

// Load .env file in non-production environments
if (process.env.NODE_ENV !== 'production') {
  dotenvConfig();
}

// ============================================
// Import Configurations
// ============================================

export { databaseConfig, validateDatabaseConfig } from './database.config';

export {
  googleConfig,
  tokenManagerConfig,
  sttConfig,
  ttsConfig,
  validateGoogleConfig,
  type GoogleConfig,
} from './google.config';

export {
  openaiConfig,
  MODEL_PRESETS,
  resolveModel,
  validateOpenAIConfig,
  type ModelPreset,
} from './openai.config';

export {
  rhubarbConfig,
  lipSyncEnabled,
  lipSyncConfig,
  validateRhubarbConfig,
  isRhubarbAvailable,
  type LipSyncConfig,
} from './rhubarb.config';

export {
  serverConfig,
  isDevelopment,
  isProduction,
  isTest,
  getServerUrl,
  getWebSocketUrl,
  validateServerConfig,
  type ServerConfig,
  type CorsConfig,
  type WebSocketConfig,
} from './server.config';

export {
  cacheConfig,
  validateCacheConfig,
  type CacheConfig,
} from './cache.config';

// ============================================
// Import Types for AppConfig
// ============================================

import { databaseConfig } from './database.config';
import { googleConfig } from './google.config';
import { openaiConfig } from './openai.config';
import { lipSyncConfig } from './rhubarb.config';
import { serverConfig } from './server.config';

import type { DatabaseConfig } from '../connectors/database/IDatabase';
import type { GoogleConfig } from './google.config';
import type { LLMConnectorConfig } from '../connectors/llm/ILLMConnector';
import type { LipSyncConfig } from './rhubarb.config';
import type { ServerConfig } from './server.config';

// ============================================
// App Configuration Type
// ============================================

export interface AppConfig {
  database: DatabaseConfig;
  google: GoogleConfig;
  openai: LLMConnectorConfig;
  lipSync: LipSyncConfig;
  server: ServerConfig;
}

// ============================================
// Combined Configuration
// ============================================

export const appConfig: AppConfig = {
  database: databaseConfig,
  google: googleConfig,
  openai: openaiConfig,
  lipSync: lipSyncConfig,
  server: serverConfig,
};

// ============================================
// Validation
// ============================================

import { validateDatabaseConfig } from './database.config';
import { validateGoogleConfig } from './google.config';
import { validateOpenAIConfig } from './openai.config';
import { validateRhubarbConfig } from './rhubarb.config';
import { validateServerConfig } from './server.config';

/**
 * Validate all configuration.
 * Throws if any required configuration is missing.
 */
export function validateConfig(): void {
  const errors: string[] = [];

  try {
    validateDatabaseConfig();
  } catch (error) {
    errors.push(`Database: ${(error as Error).message}`);
  }

  try {
    validateGoogleConfig();
  } catch (error) {
    errors.push(`Google: ${(error as Error).message}`);
  }

  try {
    validateOpenAIConfig();
  } catch (error) {
    errors.push(`OpenAI: ${(error as Error).message}`);
  }

  try {
    validateRhubarbConfig();
  } catch (error) {
    errors.push(`Rhubarb: ${(error as Error).message}`);
  }

  try {
    validateServerConfig();
  } catch (error) {
    errors.push(`Server: ${(error as Error).message}`);
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Log configuration summary (safe, without secrets).
 */
export function logConfigSummary(): void {
  logger.info('Configuration Summary', {
    environment: serverConfig.nodeEnv,
    server: `${serverConfig.host}:${serverConfig.port}`,
    websocket: serverConfig.websocket.path,
    database: databaseConfig.dbName,
    openaiModel: openaiConfig.defaultModel,
    lipSync: lipSyncConfig.enabled ? 'enabled' : 'disabled',
    sttLanguage: googleConfig.stt.languageCode,
    ttsSampleRate: `${googleConfig.tts.sampleRateHertz}Hz`,
  });
}

// ============================================
// Default Export
// ============================================

export default appConfig;
