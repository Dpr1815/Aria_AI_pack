export interface CacheConfig {
  url: string;
  keyPrefix: string;
  enabled: boolean;
}

export const cacheConfig: CacheConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  keyPrefix: 'aria-ws:rl:',
  enabled: process.env.REDIS_ENABLED !== 'false',
};

export function validateCacheConfig(): void {
  // Cache is optional — no hard validation required
}
