# Session Concurrency: Keyed Async Mutex

## The Problem

The `ConversationService` performs read-modify-write cycles against conversation and session state. Each operation follows this pattern:

```
1. Read session + conversation from DB
2. Add user message
3. Call LLM with conversation history
4. Add assistant message
5. Execute action (may update session step, status, etc.)
```

WebSocket connections are inherently concurrent. A user can trigger multiple operations on the same session simultaneously:

- **Double-tap**: User sends two utterances before the first finishes processing
- **Overlap**: `stopRecording` arrives while a `submitData` for the same session is in-flight
- **Reconnect race**: `initialize` fires twice if the client reconnects quickly

Without serialization, concurrent operations interleave freely:

```
Request A: read session ──── add msg ──── call LLM ──── add response ──── execute action
Request B:      read session ──── add msg ──── call LLM ──── add response ──── execute action
                     ^                              ^
                     │                              │
              Both read the same state        Both LLM calls miss each other's messages
```

This causes:
- **Duplicate sequence numbers** in conversation messages
- **Out-of-order messages** (LLM sees stale history)
- **Double action execution** (e.g., `STEP_COMPLETED` fires twice, advancing two steps)
- **State corruption** (session data partially mutated by interleaved writes)

---

## The Solution: Promise-Chain Keyed Mutex

We use a **keyed async mutex** — a `Map<string, Promise<void>>` where each new operation for a given key chains onto the previous promise. This is a standard pattern from async concurrency literature (used in VSCode, tRPC, and other production systems).

```
Session A: [op1] ──► [op2] ──► [op3]   (serialized, FIFO)
Session B: [op1] ──► [op2]             (serialized, independent of A)
```

### Properties

| Property | Guarantee |
|----------|-----------|
| **Per-key serialization** | Operations on the same `sessionId` run one at a time |
| **Cross-key concurrency** | Different sessions are fully independent — no global lock |
| **FIFO ordering** | Requests are processed in arrival order per session |
| **Self-cleaning** | Map entries are removed when the chain drains to idle |
| **Zero dependencies** | Pure TypeScript, native `Promise` chaining |

---

## Implementation

### `KeyedMutex` (`src/utils/async-mutex.ts`)

The core mechanism is a promise chain per key:

```typescript
class KeyedMutex {
  private locks = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire(key);
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
```

**How `acquire` works:**

```
1. Create a new Promise (`next`) — its resolve function is the `release` callback
2. Get the current tail of the chain for this key (or a resolved promise if idle)
3. Set the new tail: prev.then(() => next)
4. Await `prev` — this blocks until all earlier operations complete
5. Return the release function
```

When `release()` is called, it resolves `next`, which unblocks the next waiter in the chain. If no more operations are queued, the map entry is cleaned up.

### Integration in `ConversationService`

The three public methods are thin wrappers around the mutex:

```typescript
class ConversationService {
  private readonly mutex = new KeyedMutex();

  async initialize(sessionId: ObjectId): Promise<InitializeResult> {
    return this.mutex.runExclusive(
      sessionId.toString(),
      () => this._initialize(sessionId)
    );
  }

  async processUserInput(sessionId, transcript, ...): Promise<ProcessResult> {
    return this.mutex.runExclusive(
      sessionId.toString(),
      () => this._processUserInput(sessionId, transcript, ...)
    );
  }

  async processDataSubmission(sessionId, dataType, ...): Promise<ProcessDataResult> {
    return this.mutex.runExclusive(
      sessionId.toString(),
      () => this._processDataSubmission(sessionId, dataType, ...)
    );
  }
}
```

The actual business logic lives in the private `_initialize`, `_processUserInput`, `_processDataSubmission` methods (unchanged from before).

`getSessionStatus` is **not locked** — it's a read-only query with no side effects.

---

## Serialized Flow

With the mutex, the same scenario from above now looks like:

```
Request A: ┌─ read session ── add msg ── call LLM ── add response ── execute action ─┐
           │                                                                          │
Request B: └─ (waiting) ─────────────────────────────────────────────────────────────► ├─ read session ── add msg ── ...
                                                                                      │
                                                                            release() unblocks B
```

Request B sees the complete state from Request A (including the new messages and any step transitions).

---

## Edge Cases

### What if an operation throws?
The `runExclusive` wrapper uses `try/finally` — the lock is always released, even on error. The next queued operation proceeds normally.

### What about memory leaks from abandoned sessions?
Map entries are cleaned up when the chain resolves and no new operations are queued. The mutex holds no references to session data — only a `Promise<void>` per active key. Idle sessions have zero footprint.

### Does this affect latency?
Only when there is actual contention (multiple concurrent requests for the same session). In the normal case (one request at a time per session), the mutex adds negligible overhead — a single resolved promise await (~micros).

### What about `injectStepContext`?
This method is public (used by `ActionHandler`) but is always called from within an already-locked operation (`_initialize` or `buildProcessResult`). It does not need its own lock — it runs inside the caller's exclusive section.
