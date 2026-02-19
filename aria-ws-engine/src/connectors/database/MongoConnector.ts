/**
 * MongoDB Connector
 *
 * Implements IDatabase interface for MongoDB connections.
 * Handles connection pooling, auto-reconnect, and graceful shutdown.
 */

import { MongoClient, Db, Collection, Document } from 'mongodb';
import { EventEmitter } from 'events';
import type { IDatabase, DatabaseConfig, DatabaseEventType } from './IDatabase';
import { createLogger, DatabaseError } from '@utils';

const logger = createLogger('MongoDB');

// ============================================
// MongoDB Connector Class
// ============================================

export class MongoConnector extends EventEmitter implements IDatabase {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connected = false;
  private readonly config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
  }

  // ============================================
  // Connection Management
  // ============================================

  /**
   * Connect to MongoDB.
   */
  async connect(): Promise<void> {
    if (this.connected && this.client) {
      return;
    }

    try {
      this.client = new MongoClient(this.config.uri, {
        maxPoolSize: this.config.poolSize ?? 10,
        connectTimeoutMS: this.config.connectTimeoutMs ?? 10000,
        socketTimeoutMS: this.config.socketTimeoutMs ?? 45000,
        retryWrites: this.config.retryWrites ?? true,
        retryReads: this.config.retryReads ?? true,
      });

      // Setup event listeners
      this.setupEventListeners();

      // Connect
      await this.client.connect();
      this.db = this.client.db(this.config.dbName);
      this.connected = true;

      this.emit('connected');
      logger.info('Connected', { database: this.config.dbName });
    } catch (error) {
      this.connected = false;
      this.emit('error', error);
      throw new DatabaseError('Failed to connect to MongoDB', error as Error);
    }
  }

  /**
   * Disconnect from MongoDB.
   */
  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.connected = false;

      this.emit('disconnected');
      logger.info('Disconnected');
    } catch (error) {
      this.emit('error', error);
      throw new DatabaseError('Failed to disconnect from MongoDB', error as Error);
    }
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the database instance.
   */
  getDb(): Db {
    if (!this.db) {
      throw new DatabaseError('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Get a typed collection.
   */
  getCollection<T extends Document>(name: string): Collection<T> {
    return this.getDb().collection<T>(name);
  }

  /**
   * Ping the database for health check.
   */
  async ping(): Promise<boolean> {
    if (!this.db) {
      return false;
    }

    try {
      await this.db.command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // Event Handling
  // ============================================

  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('close', () => {
      this.connected = false;
      this.emit('disconnected');
    });

    this.client.on('error', (error) => {
      this.emit('error', error);
    });

    this.client.on('timeout', () => {
      logger.warn('Connection timeout');
    });

    // Topology events for replica sets
    this.client.on('serverHeartbeatFailed', () => {
      logger.warn('Server heartbeat failed');
    });
  }

  /**
   * Type-safe event emitter methods.
   */
  override on(event: DatabaseEventType, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  override emit(event: DatabaseEventType, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new MongoDB connector instance.
 */
export function createMongoConnector(config: DatabaseConfig): MongoConnector {
  return new MongoConnector(config);
}

// ============================================
// Singleton Pattern (Optional)
// ============================================

let instance: MongoConnector | null = null;

/**
 * Get or create singleton MongoDB connector.
 */
export function getMongoConnector(config?: DatabaseConfig): MongoConnector {
  if (!instance) {
    if (!config) {
      throw new Error('Config required for first initialization');
    }
    instance = new MongoConnector(config);
  }
  return instance;
}

/**
 * Reset singleton instance (useful for testing).
 */
export function resetMongoConnector(): void {
  instance = null;
}
