import { WebSocketRateLimiter } from '../../../src/middleware/WebSocketRateLimiter';
import { ICacheConnector } from '../../../src/connectors/cache/ICacheConnector';

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

describe('WebSocketRateLimiter', () => {
  describe('checkConnectionRate', () => {
    it('should allow connections within the limit', async () => {
      const cache = createMockCache();
      const limiter = new WebSocketRateLimiter(cache, {
        connectionMaxPerWindow: 5,
        connectionWindowMs: 60_000,
      });

      const result = await limiter.checkConnectionRate('192.168.1.1');

      expect(result.allowed).toBe(true);
      expect(cache.increment).toHaveBeenCalledWith('conn:192.168.1.1', 60_000);
    });

    it('should block connections exceeding the limit', async () => {
      const counts = new Map<string, number>();
      counts.set('conn:192.168.1.1', 5); // Already at limit
      const cache = createMockCache(counts);

      const limiter = new WebSocketRateLimiter(cache, {
        connectionMaxPerWindow: 5,
        connectionWindowMs: 60_000,
      });

      const result = await limiter.checkConnectionRate('192.168.1.1');

      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBe(60_000);
    });

    it('should track different IPs separately', async () => {
      const counts = new Map<string, number>();
      counts.set('conn:192.168.1.1', 5);
      const cache = createMockCache(counts);

      const limiter = new WebSocketRateLimiter(cache, {
        connectionMaxPerWindow: 5,
        connectionWindowMs: 60_000,
      });

      // IP 1 is at limit
      const result1 = await limiter.checkConnectionRate('192.168.1.1');
      expect(result1.allowed).toBe(false);

      // IP 2 should still be allowed
      const result2 = await limiter.checkConnectionRate('192.168.1.2');
      expect(result2.allowed).toBe(true);
    });

    it('should fail-open when cache throws', async () => {
      const cache = createMockCache();
      (cache.increment as jest.Mock).mockRejectedValue(new Error('Redis down'));

      const limiter = new WebSocketRateLimiter(cache);

      const result = await limiter.checkConnectionRate('192.168.1.1');

      expect(result.allowed).toBe(true);
    });
  });

  describe('checkMessageRate', () => {
    it('should allow messages within the limit', async () => {
      const cache = createMockCache();
      const limiter = new WebSocketRateLimiter(cache, {
        messageMaxPerWindow: 60,
        messageWindowMs: 60_000,
      });

      const result = await limiter.checkMessageRate('session-abc');

      expect(result.allowed).toBe(true);
      expect(cache.increment).toHaveBeenCalledWith('msg:session-abc', 60_000);
    });

    it('should block messages exceeding the limit', async () => {
      const counts = new Map<string, number>();
      counts.set('msg:session-abc', 60);
      const cache = createMockCache(counts);

      const limiter = new WebSocketRateLimiter(cache, {
        messageMaxPerWindow: 60,
        messageWindowMs: 60_000,
      });

      const result = await limiter.checkMessageRate('session-abc');

      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBe(60_000);
    });

    it('should fail-open when cache throws', async () => {
      const cache = createMockCache();
      (cache.increment as jest.Mock).mockRejectedValue(new Error('Redis down'));

      const limiter = new WebSocketRateLimiter(cache);

      const result = await limiter.checkMessageRate('session-abc');

      expect(result.allowed).toBe(true);
    });
  });

  describe('default config', () => {
    it('should use sensible defaults', async () => {
      const cache = createMockCache();
      const limiter = new WebSocketRateLimiter(cache);

      // Should not throw and should allow first request
      const connResult = await limiter.checkConnectionRate('1.2.3.4');
      const msgResult = await limiter.checkMessageRate('session-1');

      expect(connResult.allowed).toBe(true);
      expect(msgResult.allowed).toBe(true);
    });
  });
});
