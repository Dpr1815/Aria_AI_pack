/**
 * KeyedMutex Unit Tests
 */

import { KeyedMutex } from '@utils/async-mutex';

describe('KeyedMutex', () => {
  let mutex: KeyedMutex;

  beforeEach(() => {
    mutex = new KeyedMutex();
  });

  // ── isLocked ──

  describe('isLocked', () => {
    it('returns false for a key with no active lock', () => {
      expect(mutex.isLocked('key-1')).toBe(false);
    });

    it('returns true while a lock is held', async () => {
      const release = await mutex.acquire('key-1');
      expect(mutex.isLocked('key-1')).toBe(true);
      release();
    });

    it('returns false after the lock is released', async () => {
      const release = await mutex.acquire('key-1');
      release();
      // Allow microtask queue to flush
      await Promise.resolve();
      expect(mutex.isLocked('key-1')).toBe(false);
    });
  });

  // ── size ──

  describe('size', () => {
    it('returns 0 when no keys are locked', () => {
      expect(mutex.size).toBe(0);
    });

    it('returns the count of currently locked keys', async () => {
      const r1 = await mutex.acquire('a');
      const r2 = await mutex.acquire('b');
      expect(mutex.size).toBe(2);
      r1();
      r2();
    });

    it('decrements after all locks on a key are released', async () => {
      const release = await mutex.acquire('a');
      expect(mutex.size).toBe(1);
      release();
      await Promise.resolve();
      expect(mutex.size).toBe(0);
    });
  });

  // ── acquire / release ──

  describe('acquire', () => {
    it('returns a release function', async () => {
      const release = await mutex.acquire('key');
      expect(typeof release).toBe('function');
      release();
    });

    it('cleans up the map entry when the last holder releases', async () => {
      const release = await mutex.acquire('key');
      release();
      await Promise.resolve();
      expect(mutex.isLocked('key')).toBe(false);
    });

    it('does NOT clean up when a second waiter is queued', async () => {
      const release1 = await mutex.acquire('key');

      // Second acquire queues behind the first
      const promise2 = mutex.acquire('key');

      // Release first — but the map entry stays because promise2 overwrote the chain
      release1();

      const release2 = await promise2;
      expect(mutex.isLocked('key')).toBe(true);
      release2();
    });
  });

  // ── runExclusive ──

  describe('runExclusive', () => {
    it('runs the function and returns its resolved value', async () => {
      const result = await mutex.runExclusive('key', async () => 42);
      expect(result).toBe(42);
    });

    it('releases the lock even when the function throws', async () => {
      await expect(
        mutex.runExclusive('key', async () => {
          throw new Error('fail');
        })
      ).rejects.toThrow('fail');

      // Lock should be released — a new acquire resolves immediately
      const release = await mutex.acquire('key');
      release();
    });

    it('propagates the rejection from the callback', async () => {
      await expect(
        mutex.runExclusive('key', async () => {
          throw new Error('custom error');
        })
      ).rejects.toThrow('custom error');
    });

    it('serializes concurrent calls on the same key (FIFO order)', async () => {
      const order: number[] = [];

      const p1 = mutex.runExclusive('key', async () => {
        order.push(1);
      });
      const p2 = mutex.runExclusive('key', async () => {
        order.push(2);
      });
      const p3 = mutex.runExclusive('key', async () => {
        order.push(3);
      });

      await Promise.all([p1, p2, p3]);
      expect(order).toEqual([1, 2, 3]);
    });

    it('runs concurrent calls on different keys in parallel', async () => {
      const running: string[] = [];
      const finished: string[] = [];

      let resolveA!: () => void;
      let resolveB!: () => void;
      const blockA = new Promise<void>((r) => (resolveA = r));
      const blockB = new Promise<void>((r) => (resolveB = r));

      const pA = mutex.runExclusive('a', async () => {
        running.push('a');
        await blockA;
        finished.push('a');
      });

      const pB = mutex.runExclusive('b', async () => {
        running.push('b');
        await blockB;
        finished.push('b');
      });

      // Both should be running concurrently
      await Promise.resolve();
      await Promise.resolve();
      expect(running).toEqual(['a', 'b']);
      expect(finished).toEqual([]);

      resolveA();
      resolveB();
      await Promise.all([pA, pB]);
      expect(finished).toEqual(['a', 'b']);
    });

    it('does not leak lock entries after completion', async () => {
      await mutex.runExclusive('key', async () => 'done');
      expect(mutex.size).toBe(0);
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('handles multiple sequential exclusive calls on the same key', async () => {
      const result1 = await mutex.runExclusive('key', async () => 'first');
      const result2 = await mutex.runExclusive('key', async () => 'second');
      expect(result1).toBe('first');
      expect(result2).toBe('second');
      expect(mutex.size).toBe(0);
    });

    it('handles many concurrent callers without deadlock', async () => {
      const count = 50;
      let counter = 0;

      const promises = Array.from({ length: count }, () =>
        mutex.runExclusive('key', async () => {
          counter++;
        })
      );

      await Promise.all(promises);
      expect(counter).toBe(count);
      expect(mutex.size).toBe(0);
    });
  });
});
