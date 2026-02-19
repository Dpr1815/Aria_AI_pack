import { AppConfig } from '../config';
import { createMongoConnector, IDatabase } from './database';
import { createLLMConnector, ILLMConnector } from './llm';
import { createGCSConnector, IStorageConnector } from './storage';
import { ICacheConnector, RedisConnector, InMemoryCacheConnector } from './cache';
import { createGoogleTTSConnector, GoogleTTSConnector } from './tts';

export interface Connectors {
  database: IDatabase;
  llm: ILLMConnector;
  storage: IStorageConnector;
  cache: ICacheConnector;
  tts: GoogleTTSConnector;
}

export function createConnectors(config: AppConfig): Connectors {
  const database = createMongoConnector({
    uri: config.database.uri,
    dbName: config.database.dbName,
  });

  const llm = createLLMConnector({
    apiKey: config.openai.apiKey,
    defaultModel: config.prompt.defaultModel,
    defaultMaxTokens: config.prompt.defaultMaxTokens,
    defaultTemperature: config.prompt.defaultTemperature,
  });

  const storage = createGCSConnector({
    bucketName: config.storage.bucketName,
    keyFilePath: config.storage.keyFilePath,
  });

  const cache: ICacheConnector = config.cache.enabled
    ? new RedisConnector({ url: config.cache.url, keyPrefix: config.cache.keyPrefix })
    : new InMemoryCacheConnector();

  const tts = createGoogleTTSConnector({
    keyFilePath: config.storage.keyFilePath,
  });

  return { database, llm, storage, cache, tts };
}

export * from './database';
export * from './llm';
export * from './storage';
export * from './cache';
export * from './tts';
