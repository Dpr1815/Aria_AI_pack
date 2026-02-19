import { Request, Response, NextFunction } from 'express';
import {
  createGlobalRateLimit,
  createAuthRateLimit,
  createExpensiveRateLimit,
} from '../../../src/middleware/rate-limit.middleware';
import { ICacheConnector } from '../../../src/connectors/cache/ICacheConnector';

// ============================================
// Helpers
// ============================================

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const headers: Record<string, string> = {};
  return {
    set: jest.fn((key: string, value: string) => { headers[key] = value; }),
    _headers: headers,
  } as unknown as Response;
}

function createMockCache(counts: Map<string, number> = new Map()): ICacheConnector {
  return {
    connect: jest.fn(),
    disconnect: jest.fn(),
    ping: jest.fn().mockResolvedValue(true),
    increment: jest.fn(async (key: string) => {
      const current = (counts.get(key) ?? 0) + 1;
      counts.set(key, current);
      return current;
    }),
    get: jest.fn(async (key: string) => counts.get(key) ?? 0),
  };
}

// ============================================
// Tests: In-memory fallback (no cache)
// ============================================

describe('rate-limit middleware (in-memory)', () => {
  it('should allow requests within the limit', () => {
    const limiter = createGlobalRateLimit();
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    limiter(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', '200');
  });

  it('should block requests that exceed the limit', () => {
    const limiter = createAuthRateLimit(); // 15 per minute
    const next = jest.fn();

    for (let i = 0; i < 15; i++) {
      const res = mockRes();
      limiter(mockReq(), res, jest.fn());
    }

    const res = mockRes();
    limiter(mockReq(), res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Too many requests'),
    }));
    expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
  });

  it('should track different IPs separately', () => {
    const limiter = createAuthRateLimit();

    // Fill up limit for IP 1
    for (let i = 0; i < 15; i++) {
      limiter(mockReq({ ip: '1.2.3.4' }), mockRes(), jest.fn());
    }

    // IP 2 should still be allowed
    const next = jest.fn();
    limiter(mockReq({ ip: '5.6.7.8' }), mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });
});

// ============================================
// Tests: Cache-backed
// ============================================

describe('rate-limit middleware (cache-backed)', () => {
  it('should use cache.increment for counting', async () => {
    const cache = createMockCache();
    const limiter = createGlobalRateLimit(cache);

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    // The cache-backed limiter is async internally, so we need to await
    await new Promise<void>((resolve) => {
      limiter(req, res, (...args: unknown[]) => {
        next(...args);
        resolve();
      });
    });

    expect(cache.increment).toHaveBeenCalledWith('global:127.0.0.1', 60_000);
    expect(next).toHaveBeenCalledWith();
  });

  it('should block when cache count exceeds limit', async () => {
    const counts = new Map<string, number>();
    counts.set('auth:127.0.0.1', 15); // Already at limit
    const cache = createMockCache(counts);

    const limiter = createAuthRateLimit(cache);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    await new Promise<void>((resolve) => {
      limiter(req, res, (...args: unknown[]) => {
        next(...args);
        resolve();
      });
    });

    // Cache returns 16 (15 + 1 from increment), which exceeds 15
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Too many requests'),
    }));
  });

  it('should fail-open when cache throws', async () => {
    const cache = createMockCache();
    (cache.increment as jest.Mock).mockRejectedValue(new Error('Redis down'));

    const limiter = createGlobalRateLimit(cache);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    await new Promise<void>((resolve) => {
      limiter(req, res, (...args: unknown[]) => {
        next(...args);
        resolve();
      });
    });

    // Should call next() without error (fail-open)
    expect(next).toHaveBeenCalledWith();
  });
});

// ============================================
// Tests: Tier factories
// ============================================

describe('tier factories', () => {
  it('createExpensiveRateLimit should use user ID when available', () => {
    const limiter = createExpensiveRateLimit();
    const req = mockReq({ user: { _id: 'user-123' } } as any);
    const res = mockRes();
    const next = jest.fn();

    limiter(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('createExpensiveRateLimit should fall back to IP without user', () => {
    const limiter = createExpensiveRateLimit();
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    limiter(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
