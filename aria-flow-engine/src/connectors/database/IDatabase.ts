/**
 * Database Connector Interface
 *
 * Defines the contract for database connections.
 * Allows swapping MongoDB for other databases if needed.
 */

import type { Collection, Db, Document } from "mongodb";

// ============================================
// Interface
// ============================================

export interface IDatabase {
  /**
   * Connect to the database.
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the database.
   */
  disconnect(): Promise<void>;

  /**
   * Check if connected.
   */
  isConnected(): boolean;

  /**
   * Get the underlying database instance.
   */
  getDb(): Db;

  /**
   * Get a typed collection.
   */
  getCollection<T extends Document>(name: string): Collection<T>;

  /**
   * Health check - ping the database.
   */
  ping(): Promise<boolean>;
}

// ============================================
// Configuration
// ============================================

export interface DatabaseConfig {
  uri: string;
  dbName: string;
  poolSize?: number;
  connectTimeoutMs?: number;
  socketTimeoutMs?: number;
  retryWrites?: boolean;
  retryReads?: boolean;
}

// ============================================
// Events
// ============================================

export type DatabaseEventType =
  | "connected"
  | "disconnected"
  | "error"
  | "reconnecting";

export interface DatabaseEvents {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  reconnecting: () => void;
}
