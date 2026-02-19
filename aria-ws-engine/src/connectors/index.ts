/**
 * Connectors Index
 */

export * from './database/index';
export * from './google/index';
export * from './stt/index';
export * from './tts/index';
export * from './llm/index';
export * from './lipsync/index';
export * from './api/index';
export * from './cache/index';

// ============================================
// Connectors Bundle
// ============================================

import type { IDatabase } from './database/index';
import type { GoogleTokenManager } from './google/index';
import type { ISTTConnector } from './stt/index';
import type { ITTSConnector } from './tts/index';
import type { ILLMConnector } from './llm/index';
import type { ILipSyncConnector } from './lipsync/index';
import type { IApiConnector } from './api/index';
import type { ICacheConnector } from './cache/index';

export interface Connectors {
  database: IDatabase;
  tokenManager: GoogleTokenManager;
  stt: ISTTConnector;
  tts: ITTSConnector;
  llm: ILLMConnector;
  lipSync: ILipSyncConnector;
  api: IApiConnector;
  cache: ICacheConnector;
}

// ============================================
// Configuration
// ============================================

import type { DatabaseConfig } from './database/index';
import type { TokenManagerConfig } from './google/index';
import type { STTConnectorConfig } from './stt/index';
import type { TTSConnectorConfig } from './tts/index';
import type { LLMConnectorConfig } from './llm/index';
import type { LipSyncConnectorConfig } from './lipsync/index';
import type { ApiConnectorConfig } from './api/index';
import type { CacheConfig } from '../config/cache.config';

export interface ConnectorsConfig {
  database: DatabaseConfig;
  google?: TokenManagerConfig;
  stt?: Partial<STTConnectorConfig>;
  tts?: Partial<TTSConnectorConfig>;
  llm: LLMConnectorConfig;
  lipSync?: {
    enabled: boolean;
    config?: Partial<LipSyncConnectorConfig>;
  };
  api: ApiConnectorConfig;
  cache?: CacheConfig;
}

// ============================================
// Factory
// ============================================

import { createMongoConnector } from './database/index';
import { createTokenManager } from './google/index';
import { createGoogleSTTConnector } from './stt/index';
import { createGoogleTTSConnector } from './tts/index';
import { createOpenAIConnector } from './llm/index';
import { createLipSyncConnector } from './lipsync/index';
import { createApiConnector } from './api/index';
import { RedisConnector } from './cache/RedisConnector';
import { InMemoryCacheConnector } from './cache/InMemoryCacheConnector';

export function createConnectors(config: ConnectorsConfig): Connectors {
  const database = createMongoConnector(config.database);
  const tokenManager = createTokenManager(config.google);
  const stt = createGoogleSTTConnector(config.stt);
  const tts = createGoogleTTSConnector(config.tts);
  const llm = createOpenAIConnector(config.llm);
  const lipSync = createLipSyncConnector(config.lipSync?.enabled ?? true, config.lipSync?.config);
  const api = createApiConnector(config.api);

  const cache: ICacheConnector = config.cache?.enabled
    ? new RedisConnector({ url: config.cache.url, keyPrefix: config.cache.keyPrefix })
    : new InMemoryCacheConnector();

  return { database, tokenManager, stt, tts, llm, lipSync, api, cache };
}
