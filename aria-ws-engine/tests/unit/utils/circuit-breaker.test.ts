/**
 * CircuitBreaker Unit Tests
 */

import { CircuitBreaker, CircuitState } from '@utils/circuit-breaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createBreaker(overrides: Record<string, number> = {}) {
    return new CircuitBreaker('test-service', {
      failureThreshold: 3,
      resetTimeoutMs: 10_000,
      halfOpenMaxAttempts: 1,
      monitorWindowMs: 30_000,
      ...overrides,
    });
  }

  async function failNTimes(breaker: CircuitBreaker, n: number) {
    for (let i = 0; i < n; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error(`fail-${i}`);
        });
      } catch {
        // expected
      }
    }
  }

  // ── Initial state ──

  describe('initial state', () => {
    it('starts in CLOSED state', () => {
      const breaker = createBreaker();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  // ── CLOSED state ──

  describe('CLOSED state', () => {
    it('executes the function and returns its result', async () => {
      const breaker = createBreaker();
      const result = await breaker.execute(async () => 'ok');
      expect(result).toBe('ok');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('counts failures but stays CLOSED below threshold', async () => {
      const breaker = createBreaker({ failureThreshold: 3 });
      await failNTimes(breaker, 2);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('transitions to OPEN when failureThreshold is reached', async () => {
      const breaker = createBreaker({ failureThreshold: 3 });
      await failNTimes(breaker, 3);
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('re-throws the original error on failure', async () => {
      const breaker = createBreaker();
      await expect(
        breaker.execute(async () => {
          throw new Error('original');
        })
      ).rejects.toThrow('original');
    });

    it('prunes failures outside the monitoring window', async () => {
      const breaker = createBreaker({
        failureThreshold: 3,
        monitorWindowMs: 5_000,
      });

      // Two failures at t=0
      await failNTimes(breaker, 2);

      // Advance past the monitoring window
      jest.setSystemTime(Date.now() + 6_000);

      // Two more failures — the first two are pruned, so only 2 in window
      await failNTimes(breaker, 2);

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('stays CLOSED on success (no state change)', async () => {
      const breaker = createBreaker();
      await breaker.execute(async () => 'ok');
      await breaker.execute(async () => 'ok');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  // ── OPEN state ──

  describe('OPEN state', () => {
    it('throws ExternalServiceError without calling fn', async () => {
      const breaker = createBreaker({ failureThreshold: 3 });
      await failNTimes(breaker, 3);
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      const fn = jest.fn();
      await expect(breaker.execute(fn)).rejects.toThrow(
        'Service unavailable (circuit breaker open)'
      );
      expect(fn).not.toHaveBeenCalled();
    });

    it('includes service name in thrown error message', async () => {
      const breaker = createBreaker({ failureThreshold: 3 });
      await failNTimes(breaker, 3);

      await expect(breaker.execute(async () => 'x')).rejects.toThrow(
        'test-service error: Service unavailable (circuit breaker open)'
      );
    });

    it('stays OPEN when resetTimeoutMs has NOT elapsed', async () => {
      const breaker = createBreaker({ failureThreshold: 3, resetTimeoutMs: 10_000 });
      await failNTimes(breaker, 3);

      // Advance only 5s (less than the 10s reset timeout)
      jest.setSystemTime(Date.now() + 5_000);

      await expect(breaker.execute(async () => 'x')).rejects.toThrow(
        'Service unavailable (circuit breaker open)'
      );
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('transitions to HALF_OPEN when resetTimeoutMs has elapsed', async () => {
      const breaker = createBreaker({ failureThreshold: 3, resetTimeoutMs: 10_000 });
      await failNTimes(breaker, 3);

      // Advance past the reset timeout
      jest.setSystemTime(Date.now() + 10_001);

      // The probe call succeeds → resets to CLOSED
      const result = await breaker.execute(async () => 'probe-ok');
      expect(result).toBe('probe-ok');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  // ── HALF_OPEN state ──

  describe('HALF_OPEN state', () => {
    async function tripAndWait(breaker: CircuitBreaker) {
      await failNTimes(breaker, 3);
      jest.setSystemTime(Date.now() + 10_001);
    }

    it('transitions to CLOSED on a successful probe', async () => {
      const breaker = createBreaker({ failureThreshold: 3, resetTimeoutMs: 10_000 });
      await tripAndWait(breaker);

      const result = await breaker.execute(async () => 'recovered');
      expect(result).toBe('recovered');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('transitions back to OPEN on a failed probe', async () => {
      const breaker = createBreaker({ failureThreshold: 3, resetTimeoutMs: 10_000 });
      await tripAndWait(breaker);

      await expect(
        breaker.execute(async () => {
          throw new Error('still broken');
        })
      ).rejects.toThrow('still broken');

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('throws when max probe attempts are reached', async () => {
      const breaker = createBreaker({
        failureThreshold: 3,
        resetTimeoutMs: 10_000,
        halfOpenMaxAttempts: 1,
      });
      await tripAndWait(breaker);

      // First probe fails → trips back to OPEN
      await expect(
        breaker.execute(async () => {
          throw new Error('fail');
        })
      ).rejects.toThrow('fail');

      // Advance time again for another reset attempt
      jest.setSystemTime(Date.now() + 10_001);

      // Second probe (attempt 1 of 1) — fails again → trips back
      await expect(
        breaker.execute(async () => {
          throw new Error('fail-again');
        })
      ).rejects.toThrow('fail-again');

      // Now immediately try without advancing time
      // halfOpenAttempts was reset by trip(), so we need to advance again
      jest.setSystemTime(Date.now() + 10_001);

      // This time, the probe is allowed (halfOpenAttempts was reset by trip())
      const result = await breaker.execute(async () => 'recovered');
      expect(result).toBe('recovered');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('resets halfOpenAttempts counter when returning to CLOSED', async () => {
      const breaker = createBreaker({ failureThreshold: 3, resetTimeoutMs: 10_000 });
      await tripAndWait(breaker);

      // First cycle: probe succeeds → CLOSED
      await breaker.execute(async () => 'ok');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      // Trip again
      await failNTimes(breaker, 3);
      jest.setSystemTime(Date.now() + 10_001);

      // Probe is allowed again (counter was reset)
      const result = await breaker.execute(async () => 'ok-again');
      expect(result).toBe('ok-again');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  // ── Full cycles ──

  describe('full state cycle', () => {
    it('completes CLOSED -> OPEN -> HALF_OPEN -> CLOSED cycle', async () => {
      const breaker = createBreaker({ failureThreshold: 3, resetTimeoutMs: 10_000 });

      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      await failNTimes(breaker, 3);
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      jest.setSystemTime(Date.now() + 10_001);

      await breaker.execute(async () => 'ok');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('completes CLOSED -> OPEN -> HALF_OPEN -> OPEN cycle on probe failure', async () => {
      const breaker = createBreaker({ failureThreshold: 3, resetTimeoutMs: 10_000 });

      await failNTimes(breaker, 3);
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      jest.setSystemTime(Date.now() + 10_001);

      await expect(
        breaker.execute(async () => {
          throw new Error('nope');
        })
      ).rejects.toThrow('nope');

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  // ── getState ──

  describe('getState', () => {
    it('reflects the current state after each transition', async () => {
      const breaker = createBreaker({ failureThreshold: 2, resetTimeoutMs: 5_000 });

      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      await failNTimes(breaker, 2);
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      jest.setSystemTime(Date.now() + 5_001);

      await breaker.execute(async () => 'ok');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });
});
