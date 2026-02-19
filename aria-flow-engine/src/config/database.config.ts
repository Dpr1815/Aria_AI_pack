import type { DatabaseConfig } from '@connectors/database/IDatabase';
import { ConfigurationError } from '@utils';

const DEFAULT_DATABASE_URI = 'mongodb://localhost:27017';
const DEFAULT_DATABASE_NAME = 'aria_ai';
const DEFAULT_POOL_SIZE = 10;
const DEFAULT_CONNECT_TIMEOUT_MS = 10000;
const DEFAULT_SOCKET_TIMEOUT_MS = 45000;

export const loadDatabaseConfig = (): DatabaseConfig => {
  const config: DatabaseConfig = {
    uri: process.env.DATABASE_URI || DEFAULT_DATABASE_URI,
    dbName: process.env.DATABASE_NAME || DEFAULT_DATABASE_NAME,
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || String(DEFAULT_POOL_SIZE), 10),
    connectTimeoutMs: parseInt(
      process.env.DATABASE_CONNECT_TIMEOUT_MS || String(DEFAULT_CONNECT_TIMEOUT_MS),
      10
    ),
    socketTimeoutMs: parseInt(
      process.env.DATABASE_SOCKET_TIMEOUT_MS || String(DEFAULT_SOCKET_TIMEOUT_MS),
      10
    ),
    retryWrites: true,
    retryReads: true,
  };

  validateDatabaseConfig(config);

  return config;
};

function validateDatabaseConfig(config: DatabaseConfig): void {
  if (!config.uri) {
    throw new ConfigurationError('DATABASE_URI is required');
  }
  if (!config.dbName) {
    throw new ConfigurationError('DATABASE_NAME is required');
  }
  if (config.poolSize === undefined || isNaN(config.poolSize) || config.poolSize < 1) {
    throw new ConfigurationError('DATABASE_POOL_SIZE must be a positive number');
  }
}
