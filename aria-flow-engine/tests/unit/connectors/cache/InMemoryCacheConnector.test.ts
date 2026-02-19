import { InMemoryCacheConnector } from '../../../../src/connectors/cache/InMemoryCacheConnector';

describe('InMemoryCacheConnector', () => {
  let cache: InMemoryCacheConnector;

  beforeEach(async () => {
    cache = new InMemoryCacheConnector();
    await cache.connect();
  });

  afterEach(async () => {
    await cache.disconnect();
  });

  describe('ping', () => {
    it('should return true', async () => {
      expect(await cache.ping()).toBe(true);
    });
  });

  describe('increment', () => {
    it('should return 1 on first call for a new key', async () => {
      const count = await cache.increment('key1', 60_000);
      expect(count).toBe(1);
    });

    it('should increment on subsequent calls', async () => {
      await cache.increment('key1', 60_000);
      const count = await cache.increment('key1', 60_000);
      expect(count).toBe(2);
    });

    it('should track different keys independently', async () => {
      await cache.increment('key1', 60_000);
      await cache.increment('key1', 60_000);
      const count = await cache.increment('key2', 60_000);

      expect(count).toBe(1);
    });
  });

  describe('get', () => {
    it('should return 0 for a non-existent key', async () => {
      expect(await cache.get('nonexistent')).toBe(0);
    });

    it('should return the current count', async () => {
      await cache.increment('key1', 60_000);
      await cache.increment('key1', 60_000);
      await cache.increment('key1', 60_000);

      expect(await cache.get('key1')).toBe(3);
    });
  });

  describe('TTL expiry', () => {
    it('should reset count after TTL expires', async () => {
      await cache.increment('expire-key', 50);
      await cache.increment('expire-key', 50);

      expect(await cache.get('expire-key')).toBe(2);

      // Wait for TTL to expire
      await new Promise((r) => setTimeout(r, 80));

      expect(await cache.get('expire-key')).toBe(0);

      // New increment should start fresh
      const count = await cache.increment('expire-key', 50);
      expect(count).toBe(1);
    });
  });

  describe('disconnect', () => {
    it('should clear all data on disconnect', async () => {
      await cache.increment('key1', 60_000);
      await cache.disconnect();

      // Reconnect and check
      await cache.connect();
      expect(await cache.get('key1')).toBe(0);
    });
  });
});
