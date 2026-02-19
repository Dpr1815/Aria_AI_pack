import type { DatabaseConfig } from '@connectors/database/IDatabase';

const DEFAULT_DATABASE_URI = 'mongodb://localhost:27017';
const DEFAULT_DATABASE_NAME = 'aria_ai';
const DEFAULT_POOL_SIZE = 10;
const DEFAULT_CONNECT_TIMEOUT_MS = 10000;
const DEFAULT_SOCKET_TIMEOUT_MS = 45000;

export const databaseConfig: DatabaseConfig = {
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

export function validateDatabaseConfig(): void {
  if (!databaseConfig.uri) {
    throw new Error('DATABASE_URI is required');
  }
  if (!databaseConfig.dbName) {
    throw new Error('DATABASE_NAME is required');
  }
  if (
    databaseConfig.poolSize === undefined ||
    isNaN(databaseConfig.poolSize) ||
    databaseConfig.poolSize < 1
  ) {
    throw new Error('DATABASE_POOL_SIZE must be a positive number');
  }
}
