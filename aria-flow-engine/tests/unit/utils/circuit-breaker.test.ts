import { CircuitBreaker, CircuitState } from '../../../src/utils/circuit-breaker';
import { ExternalServiceError } from '../../../src/utils/errors';

describe('CircuitBreaker', () => {
  // Use tight timings for fast tests
  const fastOptions = {
    failureThreshold: 3,
    resetTimeoutMs: 100,
    halfOpenMaxAttempts: 1,
    monitorWindowMs: 500,
  };

  // ============================================
  // INITIAL STATE
  // ============================================

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      const breaker = new CircuitBreaker('test');

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should accept custom options', () => {
      const breaker = new CircuitBreaker('test', fastOptions);

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  // ============================================
  // CLOSED STATE — NORMAL OPERATION
  // ============================================

  describe('CLOSED state', () => {
    it('should execute and return the result of a successful call', async () => {
      const breaker = new CircuitBreaker('test', fastOptions);

      const result = await breaker.execute(async () => 'success');

      expect(result).toBe('success');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should propagate errors from the wrapped function', async () => {
      const breaker = new CircuitBreaker('test', fastOptions);

      await expect(
        breaker.execute(async () => { throw new Error('boom'); })
      ).rejects.toThrow('boom');

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should stay CLOSED when failures are below the threshold', async () => {
      const breaker = new CircuitBreaker('test', fastOptions);

      // Trigger 2 failures (threshold is 3)
      for (let i = 0; i < fastOptions.failureThreshold - 1; i++) {
        await expect(
          breaker.execute(async () => { throw new Error('fail'); })
        ).rejects.toThrow('fail');
      }

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should remain CLOSED after a success resets implicit state', async () => {
      const breaker = new CircuitBreaker('test', fastOptions);

      // 2 failures then a success
      for (let i = 0; i < fastOptions.failureThreshold - 1; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      const result = await breaker.execute(async () => 'ok');
      expect(result).toBe('ok');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  // ============================================
  // TRIP TO OPEN
  // ============================================

  describe('tripping to OPEN', () => {
    it('should trip to OPEN after reaching the failure threshold', async () => {
      const breaker = new CircuitBreaker('test', fastOptions);

      for (let i = 0; i < fastOptions.failureThreshold; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should count only failures within the monitoring window', async () => {
      const breaker = new CircuitBreaker('test', {
        ...fastOptions,
        monitorWindowMs: 50,
      });

      // Trigger 2 failures
      for (let i = 0; i < 2; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      // Wait for them to fall outside the window
      await new Promise((r) => setTimeout(r, 80));

      // Trigger 1 more failure — total in-window should be 1, below threshold of 3
      await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  // ============================================
  // OPEN STATE — FAIL FAST
  // ============================================

  describe('OPEN state', () => {
    async function tripBreaker(breaker: CircuitBreaker, threshold: number): Promise<void> {
      for (let i = 0; i < threshold; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }
    }

    it('should fail fast with ExternalServiceError when OPEN', async () => {
      const breaker = new CircuitBreaker('TestService', fastOptions);
      await tripBreaker(breaker, fastOptions.failureThreshold);

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      await expect(
        breaker.execute(async () => 'should not run')
      ).rejects.toThrow('circuit breaker open');
    });

    it('should include service name in the error', async () => {
      const breaker = new CircuitBreaker('OpenAI', fastOptions);
      await tripBreaker(breaker, fastOptions.failureThreshold);

      try {
        await breaker.execute(async () => 'nope');
        fail('Should have thrown');
      } catch (error) {
        // AppError.setPrototypeOf causes instanceof to resolve to AppError,
        // so we check the error properties directly.
        expect((error as ExternalServiceError).code).toBe('EXTERNAL_SERVICE_ERROR');
        expect((error as ExternalServiceError).service).toBe('OpenAI');
        expect((error as ExternalServiceError).message).toContain('circuit breaker open');
      }
    });

    it('should not invoke the wrapped function when OPEN', async () => {
      const breaker = new CircuitBreaker('test', fastOptions);
      await tripBreaker(breaker, fastOptions.failureThreshold);

      const fn = jest.fn().mockResolvedValue('result');
      await breaker.execute(fn).catch(() => {});

      expect(fn).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // HALF-OPEN STATE — RECOVERY PROBE
  // ============================================

  describe('HALF_OPEN state (recovery)', () => {
    async function tripBreaker(breaker: CircuitBreaker, threshold: number): Promise<void> {
      for (let i = 0; i < threshold; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }
    }

    it('should transition to HALF_OPEN after resetTimeoutMs and allow a probe', async () => {
      const breaker = new CircuitBreaker('test', fastOptions);
      await tripBreaker(breaker, fastOptions.failureThreshold);

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for resetTimeout to elapse
      await new Promise((r) => setTimeout(r, fastOptions.resetTimeoutMs + 20));

      // Next call should be allowed as a probe
      const result = await breaker.execute(async () => 'recovered');

      expect(result).toBe('recovered');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reset to CLOSED when the probe succeeds', async () => {
      const breaker = new CircuitBreaker('test', fastOptions);
      await tripBreaker(breaker, fastOptions.failureThreshold);

      await new Promise((r) => setTimeout(r, fastOptions.resetTimeoutMs + 20));

      await breaker.execute(async () => 'ok');

      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      // Subsequent calls should work normally
      const result = await breaker.execute(async () => 'still ok');
      expect(result).toBe('still ok');
    });

    it('should trip back to OPEN when the probe fails', async () => {
      const breaker = new CircuitBreaker('test', fastOptions);
      await tripBreaker(breaker, fastOptions.failureThreshold);

      await new Promise((r) => setTimeout(r, fastOptions.resetTimeoutMs + 20));

      await expect(
        breaker.execute(async () => { throw new Error('still broken'); })
      ).rejects.toThrow('still broken');

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should reject excess probes beyond halfOpenMaxAttempts', async () => {
      const breaker = new CircuitBreaker('test', {
        ...fastOptions,
        halfOpenMaxAttempts: 1,
        resetTimeoutMs: 50,
      });
      await tripBreaker(breaker, fastOptions.failureThreshold);

      await new Promise((r) => setTimeout(r, 70));

      // First probe — the function hangs (simulating a slow call)
      // We launch it but don't await, so the breaker is in HALF_OPEN with 1 probe in flight
      let resolveProbe: (v: string) => void;
      const hangingProbe = breaker.execute(
        () => new Promise<string>((resolve) => { resolveProbe = resolve; })
      );

      // Second call while first probe is still in-flight — should be rejected
      await expect(
        breaker.execute(async () => 'second probe')
      ).rejects.toThrow('max probes reached');

      // Resolve the first probe to clean up
      resolveProbe!('ok');
      await hangingProbe;
    });
  });

  // ============================================
  // FULL LIFECYCLE
  // ============================================

  describe('full lifecycle', () => {
    it('should go CLOSED → OPEN → HALF_OPEN → CLOSED', async () => {
      const breaker = new CircuitBreaker('lifecycle', fastOptions);

      // Phase 1: CLOSED
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      // Phase 2: Trip to OPEN
      for (let i = 0; i < fastOptions.failureThreshold; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Phase 3: Wait, then probe succeeds → CLOSED
      await new Promise((r) => setTimeout(r, fastOptions.resetTimeoutMs + 20));
      await breaker.execute(async () => 'recovered');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      // Phase 4: Normal operations resume
      const result = await breaker.execute(async () => 42);
      expect(result).toBe(42);
    });

    it('should go CLOSED → OPEN → HALF_OPEN → OPEN (probe fails)', async () => {
      const breaker = new CircuitBreaker('lifecycle', fastOptions);

      for (let i = 0; i < fastOptions.failureThreshold; i++) {
        await breaker.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      await new Promise((r) => setTimeout(r, fastOptions.resetTimeoutMs + 20));

      await breaker.execute(async () => { throw new Error('still down'); }).catch(() => {});
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });
});
