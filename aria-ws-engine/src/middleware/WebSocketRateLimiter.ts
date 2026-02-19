import { ICacheConnector } from '../connectors/cache/ICacheConnector';
import { createLogger } from '../utils/logger';

const logger = createLogger('WebSocketRateLimiter');

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export interface WebSocketRateLimiterConfig {
  /** Max new connections per IP per window */
  connectionMaxPerWindow: number;
  /** Connection rate window in ms */
  connectionWindowMs: number;
  /** Max control messages (non-audio) per session per window */
  messageMaxPerWindow: number;
  /** Control message rate window in ms */
  messageWindowMs: number;
  /** Max audio chunks per session per window */
  audioMaxPerWindow: number;
  /** Audio chunk rate window in ms */
  audioWindowMs: number;
}

const DEFAULT_CONFIG: WebSocketRateLimiterConfig = {
  connectionMaxPerWindow: 20,
  connectionWindowMs: 60_000,
  messageMaxPerWindow: 60,
  messageWindowMs: 60_000,
  // 250ms timeslice = 4 chunks/sec → 240 in 60s is normal.
  // 500 allows headroom for shorter timeslices or brief bursts.
  audioMaxPerWindow: 500,
  audioWindowMs: 60_000,
};

export class WebSocketRateLimiter {
  private readonly cache: ICacheConnector;
  private readonly config: WebSocketRateLimiterConfig;

  constructor(cache: ICacheConnector, config?: Partial<WebSocketRateLimiterConfig>) {
    this.cache = cache;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async checkConnectionRate(ip: string): Promise<RateLimitResult> {
    try {
      const key = `conn:${ip}`;
      const count = await this.cache.increment(key, this.config.connectionWindowMs);

      if (count > this.config.connectionMaxPerWindow) {
        logger.warn('Connection rate limit exceeded', { ip, count });
        return { allowed: false, retryAfterMs: this.config.connectionWindowMs };
      }

      return { allowed: true };
    } catch (error) {
      // Fail-open
      logger.warn('Connection rate check failed, allowing', {
        ip,
        error: (error as Error).message,
      });
      return { allowed: true };
    }
  }

  async checkMessageRate(sessionId: string): Promise<RateLimitResult> {
    try {
      const key = `msg:${sessionId}`;
      const count = await this.cache.increment(key, this.config.messageWindowMs);

      if (count > this.config.messageMaxPerWindow) {
        logger.warn('Message rate limit exceeded', { sessionId, count });
        return { allowed: false, retryAfterMs: this.config.messageWindowMs };
      }

      return { allowed: true };
    } catch (error) {
      // Fail-open
      logger.warn('Message rate check failed, allowing', {
        sessionId,
        error: (error as Error).message,
      });
      return { allowed: true };
    }
  }

  async checkAudioRate(sessionId: string): Promise<RateLimitResult> {
    try {
      const key = `audio:${sessionId}`;
      const count = await this.cache.increment(key, this.config.audioWindowMs);

      if (count > this.config.audioMaxPerWindow) {
        logger.warn('Audio rate limit exceeded', { sessionId, count });
        return { allowed: false, retryAfterMs: this.config.audioWindowMs };
      }

      return { allowed: true };
    } catch (error) {
      // Fail-open
      logger.warn('Audio rate check failed, allowing', {
        sessionId,
        error: (error as Error).message,
      });
      return { allowed: true };
    }
  }
}
