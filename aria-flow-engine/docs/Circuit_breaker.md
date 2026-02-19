# Circuit Breaker

## Overview

Aria Flow Engine uses a **circuit breaker** to protect against cascading failures when external services (OpenAI, Google Cloud Storage) become slow or unavailable. Instead of letting every request wait for a timeout, the breaker detects a failure pattern and **fails fast** — rejecting subsequent calls immediately until the service recovers.

This is an implementation of the [Circuit Breaker pattern](https://martinfowler.com/bliki/CircuitBreaker.html) described by Michael Nygard in *Release It!*.

**Key files:**

```
src/utils/circuit-breaker.ts       # CircuitBreaker class
src/utils/helpers.ts               # retryWithBackoff (used alongside the breaker)
src/connectors/llm/OpenAIConnector.ts       # OpenAI usage
src/connectors/storage/GCSConnector.ts      # GCS usage
```

---

## State Machine

The circuit breaker has three states:

```
         success
  ┌──────────────────┐
  │                  │
  ▼     failure      │
CLOSED ──────────► OPEN
  ▲                  │
  │   resetTimeout   │
  │   elapsed        ▼
  └──────────── HALF_OPEN
      probe succeeds    probe fails → back to OPEN
```

| State | Behavior |
|-------|----------|
| **CLOSED** | Normal operation. Requests pass through. Failures are counted within a sliding window. |
| **OPEN** | All requests are rejected immediately with `ExternalServiceError`. No calls reach the external service. |
| **HALF_OPEN** | A limited number of probe requests are allowed through. If a probe succeeds, the circuit resets to CLOSED. If it fails, the circuit trips back to OPEN. |

---

## How It Works

### 1. CLOSED (normal)

Every call passes through to the external service. On failure, the timestamp is recorded in a **sliding window**:

```
failures: [t1, t2, t3, t4, t5]
           └── within monitorWindowMs ──┘
```

Old failures (outside the window) are pruned on each new failure. When the number of failures within the window reaches `failureThreshold`, the circuit **trips** to OPEN.

### 2. OPEN (fast-fail)

All calls are rejected immediately without contacting the external service. The breaker throws:

```typescript
throw new ExternalServiceError(
  this.name,
  'Service unavailable (circuit breaker open)',
);
```

The circuit stays OPEN until `resetTimeoutMs` has elapsed since the last failure. After that timeout, the next incoming call triggers a transition to HALF_OPEN.

### 3. HALF_OPEN (probing)

A limited number of requests (`halfOpenMaxAttempts`) are let through as probes:

- **Probe succeeds** — The circuit resets to CLOSED. Failure counters are cleared.
- **Probe fails** — The circuit trips back to OPEN and the timeout restarts.

Any additional requests beyond the probe limit are rejected while in HALF_OPEN.

---

## Configuration

```typescript
interface CircuitBreakerOptions {
  failureThreshold: number;     // Failures before tripping (default: 5)
  resetTimeoutMs: number;       // Cooldown before probing (default: 30,000ms)
  halfOpenMaxAttempts: number;  // Probes allowed in HALF_OPEN (default: 1)
  monitorWindowMs: number;      // Sliding window for counting failures (default: 60,000ms)
}
```

### Defaults

| Option | Default | Rationale |
|--------|---------|-----------|
| `failureThreshold` | 5 | Tolerates transient errors; 5 failures in a window signals a real problem |
| `resetTimeoutMs` | 30,000 ms | Gives the external service time to recover before probing |
| `halfOpenMaxAttempts` | 1 | A single successful probe is enough to confirm recovery |
| `monitorWindowMs` | 60,000 ms | Failures spread across a minute are less concerning than a burst |

---

## Usage in the Codebase

Each external service connector creates its own breaker instance with service-specific tuning:

### OpenAI Connector

```typescript
// src/connectors/llm/OpenAIConnector.ts
this.breaker = new CircuitBreaker('OpenAI', {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  monitorWindowMs: 60_000,
});

// Every LLM call is wrapped
async complete(messages, config) {
  return this.breaker.execute(async () => {
    return retryWithBackoff(async () => {
      return this.client.chat.completions.create({ ... });
    }, { maxRetries: 3, initialDelayMs: 1000 });
  });
}
```

### Google Cloud Storage Connector

```typescript
// src/connectors/storage/GCSConnector.ts
this.breaker = new CircuitBreaker('GoogleCloudStorage', {
  failureThreshold: 5,
  resetTimeoutMs: 60_000,   // GCS regional outages take longer to recover
  monitorWindowMs: 60_000,
});

// Every storage operation is wrapped
async upload(filePath, buffer, metadata) {
  return this.breaker.execute(async () => { ... });
}
```

---

## Interaction with Retry Logic

The circuit breaker and `retryWithBackoff` serve different purposes and work together:

```
Request
  │
  ▼
CircuitBreaker.execute()        ← Fails fast if service is down
  │
  ▼
retryWithBackoff()              ← Retries transient failures (3 attempts)
  │
  ▼
External Service Call
```

- **retryWithBackoff** handles **transient** errors (network blips, rate limits) by retrying with exponential backoff.
- **CircuitBreaker** handles **sustained** outages by stopping retries altogether once the failure pattern is detected.

If all retries within `retryWithBackoff` fail, that counts as **one failure** to the circuit breaker. This means the breaker trips after `failureThreshold` full retry cycles, not individual attempts.

---

## Observability

The breaker logs state transitions using the structured logger:

| Event | Level | Message |
|-------|-------|---------|
| Circuit trips to OPEN | `error` | `Circuit OPEN — tripped` |
| Fast-fail rejection | `warn` | `Circuit OPEN — failing fast` |
| Probe attempt | `info` | `Circuit HALF-OPEN — sending probe` |
| Recovery | `info` | `Circuit CLOSED — reset` |

All log entries include the `service` name for filtering (e.g. `CircuitBreaker:OpenAI`).

---

## Error Handling

When the circuit is OPEN or HALF_OPEN (max probes reached), it throws an `ExternalServiceError` (HTTP 502):

```typescript
{
  statusCode: 502,
  code: "EXTERNAL_SERVICE_ERROR",
  message: "OpenAI error: Service unavailable (circuit breaker open)",
  service: "OpenAI"
}
```

This is caught by the global `errorMiddleware` and returned as a structured API response.

---

## Adding a Circuit Breaker to a New Connector

1. Import the class:
   ```typescript
   import { CircuitBreaker } from '@utils';
   ```

2. Create an instance in the constructor with service-appropriate options:
   ```typescript
   this.breaker = new CircuitBreaker('MyService', {
     failureThreshold: 5,
     resetTimeoutMs: 30_000,
   });
   ```

3. Wrap every external call:
   ```typescript
   async callMyService(): Promise<Result> {
     return this.breaker.execute(async () => {
       return this.client.doSomething();
     });
   }
   ```

4. Optionally combine with `retryWithBackoff` for transient error recovery:
   ```typescript
   return this.breaker.execute(async () => {
     return retryWithBackoff(async () => {
       return this.client.doSomething();
     }, { maxRetries: 3 });
   });
   ```
