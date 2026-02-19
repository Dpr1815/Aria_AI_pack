/**
 * Keyed Async Mutex
 *
 * Serializes async operations per key using a promise-chain pattern.
 * Operations on different keys run concurrently; operations on the same key
 * are queued in FIFO order.
 *
 * Zero dependencies — uses native Promise chaining.
 *
 * Usage:
 *   const mutex = new KeyedMutex();
 *   const result = await mutex.runExclusive('session-123', async () => {
 *     // This block runs exclusively for key 'session-123'
 *     return await doWork();
 *   });
 */

export class KeyedMutex {
  private readonly locks = new Map<string, Promise<void>>();

  /**
   * Acquire exclusive access for a key.
   * Returns a release function that MUST be called when done.
   *
   * Prefer `runExclusive` over manual acquire/release to avoid forgetting to release.
   */
  async acquire(key: string): Promise<() => void> {
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });

    const prev = this.locks.get(key) ?? Promise.resolve();
    const chain = prev.then(() => next);
    this.locks.set(key, chain);

    await prev;

    return () => {
      release();
      // Clean up the map entry if this is the tail of the chain
      if (this.locks.get(key) === chain) {
        this.locks.delete(key);
      }
    };
  }

  /**
   * Run a function with exclusive access for a key.
   * Automatically acquires and releases the lock.
   */
  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire(key);
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /** Whether a key currently has an active or queued operation. */
  isLocked(key: string): boolean {
    return this.locks.has(key);
  }

  /** Number of keys with active locks. */
  get size(): number {
    return this.locks.size;
  }
}
