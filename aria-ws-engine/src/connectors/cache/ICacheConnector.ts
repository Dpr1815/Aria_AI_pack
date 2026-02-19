export interface ICacheConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<boolean>;

  /**
   * Atomically increment a counter and set TTL on first creation.
   * Returns the new count after incrementing.
   */
  increment(key: string, ttlMs: number): Promise<number>;

  /**
   * Get the current count for a key. Returns 0 if key doesn't exist.
   */
  get(key: string): Promise<number>;
}
