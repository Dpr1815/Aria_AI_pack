import { createLogger } from './logger';
import { ExternalServiceError } from './errors';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Number of failures within the monitoring window before the circuit opens */
  failureThreshold: number;
  /** How long (ms) the circuit stays open before allowing a probe */
  resetTimeoutMs: number;
  /** Number of probe requests allowed in HALF_OPEN state */
  halfOpenMaxAttempts: number;
  /** Sliding window (ms) in which failures are counted */
  monitorWindowMs: number;
}

const DEFAULTS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxAttempts: 1,
  monitorWindowMs: 60_000,
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = [];
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;

  private readonly options: CircuitBreakerOptions;
  private readonly logger;

  constructor(
    private readonly name: string,
    options: Partial<CircuitBreakerOptions> = {},
  ) {
    this.options = { ...DEFAULTS, ...options };
    this.logger = createLogger(`CircuitBreaker:${name}`);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        return this.tryHalfOpen(fn);
      }

      this.logger.warn('Circuit OPEN — failing fast', { service: this.name });
      throw new ExternalServiceError(
        this.name,
        'Service unavailable (circuit breaker open)',
      );
    }

    if (this.state === CircuitState.HALF_OPEN) {
      return this.tryHalfOpen(fn);
    }

    // CLOSED — normal execution
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  // ============================================
  // Private
  // ============================================

  private async tryHalfOpen<T>(fn: () => Promise<T>): Promise<T> {
    if (this.halfOpenAttempts >= this.options.halfOpenMaxAttempts) {
      throw new ExternalServiceError(
        this.name,
        'Service unavailable (circuit breaker half-open, max probes reached)',
      );
    }

    this.state = CircuitState.HALF_OPEN;
    this.halfOpenAttempts++;
    this.logger.info('Circuit HALF-OPEN — sending probe', {
      service: this.name,
      attempt: this.halfOpenAttempts,
    });

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.trip();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.reset();
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;

    // Prune failures outside the monitoring window
    const windowStart = now - this.options.monitorWindowMs;
    this.failures = this.failures.filter((t) => t > windowStart);

    if (this.failures.length >= this.options.failureThreshold) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = CircuitState.OPEN;
    this.halfOpenAttempts = 0;
    this.logger.error('Circuit OPEN — tripped', {
      service: this.name,
      failures: this.failures.length,
      threshold: this.options.failureThreshold,
    });
  }

  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.halfOpenAttempts = 0;
    this.logger.info('Circuit CLOSED — reset', { service: this.name });
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs;
  }
}
