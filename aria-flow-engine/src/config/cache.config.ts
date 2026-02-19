export interface CacheConfig {
  url: string;
  keyPrefix: string;
  enabled: boolean;
}

export const loadCacheConfig = (): CacheConfig => ({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  keyPrefix: 'aria-flow:rl:',
  enabled: process.env.REDIS_ENABLED !== 'false',
});
