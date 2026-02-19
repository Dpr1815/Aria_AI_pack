import { Request, Response, NextFunction, RequestHandler } from 'express';
import { RateLimitError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { ICacheConnector } from '../connectors/cache/ICacheConnector';

const logger = createLogger('RateLimit');

// ============================================
// Types
// ============================================

export interface RateLimitConfig {
  /** Window size in ms */
  windowMs: number;
  /** Max requests allowed within the window */
  maxRequests: number;
  /** Extracts the rate-limit key from the request (IP, userId, etc.) */
  keyFn: (req: Request) => string;
}

interface RateLimitEntry {
  timestamps: number[];
}

// ============================================
// Key extraction helpers
// ============================================

const byIP = (req: Request): string => req.ip || req.socket.remoteAddress || 'unknown';

const byUser = (req: Request): string => req.user?._id?.toString() || byIP(req);

// ============================================
// In-memory rate limiter (sliding window — fallback)
// ============================================

function createInMemoryRateLimiter(name: string, config: RateLimitConfig): RequestHandler {
  const store = new Map<string, RateLimitEntry>();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => t > now - config.windowMs);
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }, config.windowMs);
  cleanupInterval.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = config.keyFn(req);
    const now = Date.now();

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter((t) => t > now - config.windowMs);

    if (entry.timestamps.length >= config.maxRequests) {
      const retryAfterMs = entry.timestamps[0] + config.windowMs - now;
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);

      res.set('Retry-After', String(retryAfterSec));
      res.set('X-RateLimit-Limit', String(config.maxRequests));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', new Date(now + retryAfterMs).toISOString());

      logger.warn('Rate limit exceeded', { key, limiter: name });
      next(new RateLimitError(`Too many requests. Retry after ${retryAfterSec}s`));
      return;
    }

    entry.timestamps.push(now);

    res.set('X-RateLimit-Limit', String(config.maxRequests));
    res.set('X-RateLimit-Remaining', String(config.maxRequests - entry.timestamps.length));

    next();
  };
}

// ============================================
// Cache-backed rate limiter (fixed window)
// ============================================

function createCacheRateLimiter(
  name: string,
  config: RateLimitConfig,
  cache: ICacheConnector
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${name}:${config.keyFn(req)}`;

    cache
      .increment(key, config.windowMs)
      .then((count) => {
        res.set('X-RateLimit-Limit', String(config.maxRequests));
        res.set('X-RateLimit-Remaining', String(Math.max(0, config.maxRequests - count)));

        if (count > config.maxRequests) {
          const retryAfterSec = Math.ceil(config.windowMs / 1000);

          res.set('Retry-After', String(retryAfterSec));
          res.set('X-RateLimit-Remaining', '0');

          logger.warn('Rate limit exceeded', { key, limiter: name, count });
          next(new RateLimitError(`Too many requests. Retry after ${retryAfterSec}s`));
          return;
        }

        next();
      })
      .catch((error) => {
        // Fail-open: if cache errors, allow the request
        logger.warn('Rate limit cache error, allowing request', {
          key,
          error: (error as Error).message,
        });
        next();
      });
  };
}

// ============================================
// Core factory — picks strategy based on cache availability
// ============================================

function createRateLimiter(
  name: string,
  config: RateLimitConfig,
  cache?: ICacheConnector
): RequestHandler {
  if (cache) {
    return createCacheRateLimiter(name, config, cache);
  }
  return createInMemoryRateLimiter(name, config);
}

// ============================================
// Tier factories
// ============================================

/** Global baseline — per IP, generous. Catches broad abuse / DDoS. */
export const createGlobalRateLimit = (cache?: ICacheConnector): RequestHandler =>
  createRateLimiter(
    'global',
    {
      windowMs: 60_000,
      maxRequests: 200,
      keyFn: byIP,
    },
    cache
  );

/** Auth endpoints — per IP, strict. Brute-force protection for login/signup/refresh. */
export const createAuthRateLimit = (cache?: ICacheConnector): RequestHandler =>
  createRateLimiter(
    'auth',
    {
      windowMs: 60_000,
      maxRequests: 15,
      keyFn: byIP,
    },
    cache
  );

/** Expensive endpoints — per user, very strict. Controls OpenAI cost on generation routes. */
export const createExpensiveRateLimit = (cache?: ICacheConnector): RequestHandler =>
  createRateLimiter(
    'expensive',
    {
      windowMs: 60_000,
      maxRequests: 5,
      keyFn: byUser,
    },
    cache
  );
