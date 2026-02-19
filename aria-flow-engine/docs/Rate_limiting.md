# Rate Limiting

## Overview

Aria Flow Engine implements **tiered rate limiting** to protect against abuse, brute-force attacks, and excessive resource consumption. The system uses a **strategy pattern**: when Redis is available it uses a fast, shared **fixed-window counter**; when Redis is unavailable it falls back to a per-process **sliding-window** in-memory store.

**Key files:**

```
src/config/cache.config.ts          # Redis URL, key prefix, enabled flag
src/connectors/cache/
  ICacheConnector.ts                 # Cache interface (increment, get, ping)
  RedisConnector.ts                  # Redis implementation (ioredis + Lua)
  InMemoryCacheConnector.ts          # In-memory fallback
src/middleware/rate-limit.middleware.ts  # Middleware factories
```

---

## Rate Limit Tiers

Three tiers are defined, each targeting a different risk profile:

| Tier | Name | Window | Max Requests | Key | Applied To |
|------|------|--------|-------------|-----|------------|
| **Global** | `global` | 60 s | 200 | Client IP | All `/api` routes |
| **Auth** | `auth` | 60 s | 15 | Client IP | `/signup`, `/login`, `/refresh`, `/join` |
| **Expensive** | `expensive` | 60 s | 5 | Authenticated user ID (falls back to IP) | `/agents/generate`, summary generation |

- **Global** is a broad safety net mounted on every `/api` request. It catches DDoS-style floods.
- **Auth** protects authentication endpoints from brute-force credential stuffing.
- **Expensive** guards routes that trigger OpenAI calls (agent generation, summary generation), controlling cost per user.

A single request may pass through multiple tiers (e.g. `POST /api/agents/generate` hits both `global` **and** `expensive`).

---

## How It Works

### Strategy Selection

At startup, `bootstrap.ts` creates the connectors and passes the cache connector into `createMiddleware`:

```
bootstrap()
  → createConnectors(config)      # Picks RedisConnector or InMemoryCacheConnector
  → connectors.cache.connect()    # Attempts connection (fail = warn, not crash)
  → createMiddleware(..., cache)   # Passes cache into rate limit factories
```

Each tier factory (`createGlobalRateLimit`, `createAuthRateLimit`, `createExpensiveRateLimit`) calls the core `createRateLimiter` function, which picks the strategy:

```typescript
function createRateLimiter(name, config, cache?) {
  if (cache) return createCacheRateLimiter(name, config, cache);
  return createInMemoryRateLimiter(name, config);
}
```

If `REDIS_ENABLED=true` and the connection succeeds, all three tiers use the Redis-backed strategy. Otherwise they fall back to in-memory.

---

### Redis-Backed Strategy (Fixed Window)

When Redis is available, rate limiting uses a **fixed-window counter** powered by an atomic Lua script.

#### The Lua Script

```lua
local current = redis.call('INCR', KEYS[1])
if redis.call('PTTL', KEYS[1]) == -1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return current
```

This script runs atomically on the Redis server:

1. **`INCR`** — Increments the counter for the key. If the key doesn't exist, Redis creates it with value `1`.
2. **`PTTL` check** — If the key has no expiry set (`PTTL == -1`), it means this is the first request in the window, so set the TTL.
3. **`PEXPIRE`** — Sets the key to auto-expire after `windowMs` milliseconds (60,000 ms for all current tiers).
4. **Returns** the current count after incrementing.

This guarantees that the counter and expiry are set together in a single atomic operation — no race conditions, even under high concurrency.

#### Redis Key Format

Keys are prefixed and namespaced per tier:

```
{keyPrefix}{tierName}:{clientIdentifier}

# Examples:
aria-flow:rl:global:203.0.113.42        # Global tier, by IP
aria-flow:rl:auth:203.0.113.42          # Auth tier, by IP
aria-flow:rl:expensive:507f1f77bcf86cd  # Expensive tier, by user ID
```

The prefix `aria-flow:rl:` is configured in `cache.config.ts` and prevents collisions with other Redis keys.

#### Request Flow

```
Request arrives
  │
  ├─ Extract key (IP or user ID)
  ├─ Build Redis key: "{prefix}{tier}:{identifier}"
  ├─ Execute Lua INCR script → returns count
  │
  ├─ count <= maxRequests?
  │   ├─ YES → Set response headers, call next()
  │   └─ NO  → Set Retry-After header, throw RateLimitError (429)
  │
  └─ Redis error?
      └─ Fail-open: log warning, allow the request through
```

#### Fail-Open Behavior

If Redis becomes unavailable mid-flight (e.g. a network partition), the cache-backed limiter **fails open** — the request is allowed through and a warning is logged. This prevents a Redis outage from becoming a total API outage:

```typescript
.catch((error) => {
  logger.warn('Rate limit cache error, allowing request', { key, error });
  next(); // Allow the request
});
```

---

### In-Memory Fallback (Sliding Window)

When Redis is not available (disabled or connection failed), the system falls back to a **sliding-window log** algorithm using a per-process `Map`.

#### How It Works

Each key stores an array of request timestamps:

```typescript
interface RateLimitEntry {
  timestamps: number[];  // Array of Date.now() values
}
```

On each request:

1. **Filter** — Remove timestamps older than `windowMs` from the array.
2. **Check** — If the remaining count `>= maxRequests`, reject with 429.
3. **Record** — Push the current timestamp into the array.

This provides a true **sliding window**: the window slides with each request rather than resetting at fixed intervals.

#### Cleanup

A `setInterval` runs every `windowMs` (60 s) to prune expired entries from the map, preventing memory leaks. The timer is `unref()`'d so it doesn't prevent Node.js from shutting down.

#### Limitations

- **Not shared across processes.** If you run multiple instances behind a load balancer, each process tracks limits independently. A client could get `maxRequests × N` total requests (where N = number of processes).
- **Lost on restart.** All counters reset when the process restarts.
- **Memory proportional to unique keys.** Under a distributed attack with many IPs, memory usage grows linearly.

These limitations are exactly why Redis is the recommended strategy for production.

---

## Response Headers

Both strategies set standard rate-limit response headers:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests allowed in the window | `200` |
| `X-RateLimit-Remaining` | Requests remaining in the current window | `142` |
| `X-RateLimit-Reset` | ISO timestamp when the window resets (in-memory only) | `2026-02-18T12:01:00.000Z` |
| `Retry-After` | Seconds until the client should retry (only on 429) | `45` |

---

## Error Response

When a client exceeds the limit, the middleware throws a `RateLimitError` (HTTP 429), which the centralized error handler formats as:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Retry after 45s",
    "requestId": "abc123"
  }
}
```

---

## Fixed Window vs Sliding Window

The two strategies have subtly different behavior at window boundaries:

| Property | Fixed Window (Redis) | Sliding Window (In-Memory) |
|----------|---------------------|---------------------------|
| **Accuracy** | Can allow up to 2x burst at boundary edges | Precise — always counts exact window |
| **Performance** | O(1) per request (single Redis call) | O(n) per request (filter + push) |
| **Shared state** | Yes — works across all processes | No — per-process only |
| **Persistence** | Survives process restarts (until TTL) | Lost on restart |

**Example of fixed-window boundary burst:** If a client makes 200 requests at second 59 of window A, then 200 more at second 0 of window B, they effectively made 400 requests in 2 seconds. The sliding window would correctly reject the second batch. In practice this edge case is acceptable for the protection levels needed.

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `REDIS_ENABLED` | `true` (unless set to `"false"`) | Set to `"false"` to force in-memory fallback |

### Redis Connection Options

The `RedisConnector` is configured with:

- **`lazyConnect: true`** — Connection is established explicitly, not on instantiation.
- **`maxRetriesPerRequest: 1`** — Fail fast on individual operations rather than blocking.
- **`retryStrategy`** — Retries up to 3 times with exponential backoff (200ms, 400ms, 600ms), then gives up.

---

## Where Each Tier Is Applied

### Global (`globalRateLimit`)

Mounted once on the `/api` prefix — every API request passes through it:

```typescript
// routes/index.ts
app.use('/api', middleware.globalRateLimit);
```

### Auth (`authRateLimit`)

Applied to individual auth-sensitive routes:

```typescript
// routes/user.routes.ts
router.post('/signup',  deps.authRateLimit, ...);
router.post('/login',   deps.authRateLimit, ...);
router.post('/refresh', deps.authRateLimit, ...);

// routes/session.routes.ts
router.post('/join', deps.authRateLimit, ...);
```

### Expensive (`expensiveRateLimit`)

Applied to routes that trigger OpenAI calls:

```typescript
// routes/agent.routes.ts
router.post('/generate', ..., deps.expensiveRateLimit, ...);

// routes/summary.routes.ts
router.post('/',         ..., deps.expensiveRateLimit, ...);
router.post('/:id/...',  ..., deps.expensiveRateLimit, ...);
```

---

## Architecture Diagram

```
                    Request
                       │
                       ▼
              ┌────────────────┐
              │  Global Limit  │  200 req/min per IP
              │   (all /api)   │
              └───────┬────────┘
                      │
           ┌──────────┼──────────┐
           ▼          ▼          ▼
    ┌────────────┐  ┌─────┐  ┌──────────────┐
    │ Auth Limit │  │ ... │  │Expensive Limit│
    │ 15 req/min │  │     │  │  5 req/min    │
    │  (by IP)   │  │     │  │  (by user)    │
    └─────┬──────┘  └──┬──┘  └──────┬───────┘
          │             │            │
          ▼             ▼            ▼
       Controller    Controller   Controller
```

```
                  ┌──────────────────────┐
  Rate Limiter    │  createRateLimiter() │
  Factory         └──────────┬───────────┘
                             │
                    cache available?
                   ┌─────────┴─────────┐
                   │ YES               │ NO
                   ▼                   ▼
          ┌─────────────┐    ┌──────────────────┐
          │   Redis      │    │   In-Memory       │
          │ Fixed Window │    │  Sliding Window   │
          │  (Lua INCR)  │    │  (timestamp log)  │
          └──────┬───────┘    └────────┬──────────┘
                 │                     │
                 ▼                     ▼
          ┌──────────┐         ┌─────────────┐
          │  Shared   │         │  Per-process │
          │  across   │         │  only, lost  │
          │  all pods │         │  on restart  │
          └──────────┘         └─────────────┘
```
