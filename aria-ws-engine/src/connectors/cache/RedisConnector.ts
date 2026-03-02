import Redis from 'ioredis';
import { ICacheConnector } from './ICacheConnector';
import { createLogger } from '../../utils/logger';

const logger = createLogger('RedisConnector');

export interface RedisConnectorConfig {
  url: string;
  keyPrefix: string;
}

/**
 * Lua script: atomically INCR and set PEXPIRE only on key creation (TTL = -1 means no expiry set).
 * Returns the incremented value.
 */
const INCREMENT_SCRIPT = `
  local current = redis.call('INCR', KEYS[1])
  if redis.call('PTTL', KEYS[1]) == -1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
  end
  return current
`;

export class RedisConnector implements ICacheConnector {
  private client: Redis | null = null;
  private readonly config: RedisConnectorConfig;

  constructor(config: RedisConnectorConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.client = new Redis(this.config.url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('error', (err) => {
      logger.error('Redis connection error', err);
    });

    await this.client.connect();
    logger.info('Redis connected');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('Redis disconnected');
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    if (!this.client) return 0;
    const prefixedKey = `${this.config.keyPrefix}${key}`;
    const result = await this.client.eval(INCREMENT_SCRIPT, 1, prefixedKey, String(ttlMs));
    return result as number;
  }

  async get(key: string): Promise<number> {
    if (!this.client) return 0;
    const prefixedKey = `${this.config.keyPrefix}${key}`;
    const val = await this.client.get(prefixedKey);
    return val ? parseInt(val, 10) : 0;
  }
}
