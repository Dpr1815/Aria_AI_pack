import { ICacheConnector } from './ICacheConnector';

interface CacheEntry {
  count: number;
  expiresAt: number;
}

export class InMemoryCacheConnector implements ICacheConnector {
  private store = new Map<string, CacheEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  async connect(): Promise<void> {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (entry.expiresAt <= now) this.store.delete(key);
      }
    }, 30_000);
    this.cleanupTimer.unref();
  }

  async disconnect(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.expiresAt > now) {
      existing.count += 1;
      return existing.count;
    }

    // New key or expired — start fresh
    this.store.set(key, { count: 1, expiresAt: now + ttlMs });
    return 1;
  }

  async get(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || entry.expiresAt <= Date.now()) return 0;
    return entry.count;
  }
}
