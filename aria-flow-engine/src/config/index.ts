import dotenv from 'dotenv';
import { ConfigurationError } from '@utils';

// Load .env into process.env FIRST, before any config loading
const result = dotenv.config();

if (result.error) {
  console.warn('Warning: .env file not found or could not be loaded');
}

import { loadDatabaseConfig } from './database.config';
import { DatabaseConfig } from '@connectors';
import { loadPromptConfig, PromptConfig } from './prompt.config';
import { loadServerConfig, ServerConfig } from './server.config';
import { loadStorageConfig, StorageConfig } from './storage.config';
import { loadCacheConfig, CacheConfig } from './cache.config';

export interface AppConfig {
  database: DatabaseConfig;
  prompt: PromptConfig;
  server: ServerConfig;
  storage: StorageConfig;
  openai: {
    apiKey: string;
  };
  cache: CacheConfig;
}

let cachedConfig: AppConfig | null = null;

export const loadConfig = (): AppConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new ConfigurationError('OPENAI_API_KEY is required');
  }

  cachedConfig = {
    database: loadDatabaseConfig(),
    prompt: loadPromptConfig(),
    server: loadServerConfig(),
    storage: loadStorageConfig(),
    openai: {
      apiKey: openaiApiKey,
    },
    cache: loadCacheConfig(),
  };

  return cachedConfig;
};

export const getConfig = (): AppConfig => {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
};

export * from './database.config';
export * from './prompt.config';
export * from './server.config';
export * from './storage.config';
export * from './cache.config';
