# Rate Limiting

## Overview

Aria WS Engine implements **WebSocket-specific rate limiting** at two levels: **connection rate** (how fast new sockets can open) and **message rate** (how fast messages can be sent on an active session). Both use the same cache-backed fixed-window counter shared with the Flow Engine's rate limiting infrastructure.

**Key files:**

```
src/config/cache.config.ts                  # Redis URL, key prefix, enabled flag
src/connectors/cache/
  ICacheConnector.ts                         # Cache interface (increment, get, ping)
  RedisConnector.ts                          # Redis implementation (ioredis + Lua)
  InMemoryCacheConnector.ts                  # In-memory fallback
src/middleware/WebSocketRateLimiter.ts        # Rate limiter class
src/controllers/WebSocketController.ts       # Where limits are enforced
```

---

## Rate Limit Tiers

| Tier | Name | Window | Max per Window | Key | Enforcement Point |
|------|------|--------|---------------|-----|-------------------|
| **Connection** | `conn` | 60 s | 20 | Client IP | `handleConnection()` — before any state is created |
| **Message** | `msg` | 60 s | 60 | Session ID (falls back to IP) | `routeMessage()` — before handler dispatch |

- **Connection rate** prevents a single IP from opening too many WebSocket connections in rapid succession (e.g. reconnect storms, scraping bots).
- **Message rate** prevents a connected client from flooding the server with messages (e.g. spamming audio chunks or chat messages).

---

## How It Works

### Initialization

At bootstrap, the cache connector is created based on configuration and passed through to the `WebSocketRateLimiter`:

```
bootstrap()
  → createConnectors({ cache: cacheConfig })   # RedisConnector or InMemoryCacheConnector
  → connectors.cache.connect()                  # Attempt Redis connection
  → createController(...)
      → new WebSocketRateLimiter(connectors.cache)
      → createWebSocketController({ rateLimiter, ... })
```

The `WebSocketRateLimiter` is a class (not Express middleware) because WebSocket connections don't pass through an Express middleware chain — limits are checked directly in the controller methods.

### The WebSocketRateLimiter Class

```typescript
class WebSocketRateLimiter {
  constructor(cache: ICacheConnector, config?: Partial<WebSocketRateLimiterConfig>);

  checkConnectionRate(ip: string): Promise<RateLimitResult>;
  checkMessageRate(sessionId: string): Promise<RateLimitResult>;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}
```

Both methods follow the same pattern:

1. Build a prefixed key (`conn:{ip}` or `msg:{sessionId}`)
2. Call `cache.increment(key, windowMs)` — atomic increment + TTL
3. Compare the returned count against the configured max
4. Return `{ allowed: true }` or `{ allowed: false, retryAfterMs }`

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  connectionMaxPerWindow: 20,    // 20 new connections per IP per minute
  connectionWindowMs: 60_000,    // 1 minute window
  messageMaxPerWindow: 60,       // 60 messages per session per minute
  messageWindowMs: 60_000,       // 1 minute window
};
```

Defaults can be partially overridden via the constructor's second argument.

---

## Connection Rate Limiting

Enforced in `WebSocketController.handleConnection()`, **before** any connection state is created:

```
New WebSocket connection
  │
  ├─ Extract client IP (X-Forwarded-For or socket.remoteAddress)
  │
  ├─ rateLimiter.checkConnectionRate(ip)
  │   ├─ cache.increment("conn:{ip}", 60000) → count
  │   │
  │   ├─ count <= 20?
  │   │   └─ YES → Continue with connection setup
  │   │
  │   └─ count > 20?
  │       ├─ Send error: "Too many connections. Please try again later."
  │       │   (error code: RATE_LIMITED)
  │       └─ Close socket with code 1008 (Policy Violation)
  │
  └─ Cache error?
      └─ Fail-open: allow the connection
```

Key details:
- The socket is immediately closed with WebSocket close code **1008** (Policy Violation) if rate limited.
- An error message is sent to the client before closing so the client knows why it was disconnected.
- Connection state is **never created** for rejected connections, so no resources are leaked.

---

## Message Rate Limiting

Enforced in `WebSocketController.routeMessage()`, **before** the handler registry dispatches the message:

```
Incoming WebSocket message
  │
  ├─ Parse & validate JSON
  │
  ├─ rateLimiter.checkMessageRate(key)
  │   │
  │   ├─ key = sessionId (if authenticated) or IP (if not yet authenticated)
  │   │
  │   ├─ cache.increment("msg:{key}", 60000) → count
  │   │
  │   ├─ count <= 60?
  │   │   └─ YES → Dispatch to handler
  │   │
  │   └─ count > 60?
  │       └─ Send error: "Too many messages. Please slow down."
  │           (error code: RATE_LIMITED)
  │           Connection stays open — client can retry after the window
  │
  └─ Cache error?
      └─ Fail-open: dispatch message normally
```

Key details:
- The connection is **not closed** when message rate is exceeded — only the individual message is rejected.
- The key switches from IP to session ID once the client authenticates via the `init` handler. This ensures rate limiting tracks the actual session rather than the shared IP.

---

## Cache Backend

### Redis (Production)

Uses the same atomic Lua script as the Flow Engine:

```lua
local current = redis.call('INCR', KEYS[1])
if redis.call('PTTL', KEYS[1]) == -1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return current
```

This guarantees atomic increment + TTL assignment in a single Redis round-trip. No race conditions under concurrent connections.

#### Redis Key Format

```
{keyPrefix}{tier}:{identifier}

# Examples:
aria-ws:rl:conn:203.0.113.42              # Connection tier, by IP
aria-ws:rl:msg:507f1f77bcf86cd799439011   # Message tier, by session ID
aria-ws:rl:msg:203.0.113.42               # Message tier, by IP (pre-auth)
```

The prefix `aria-ws:rl:` (configured in `cache.config.ts`) is different from the Flow Engine's `aria-flow:rl:`, so the two services have completely separate key namespaces even when sharing the same Redis instance.

#### Redis Connection Options

```typescript
{
  lazyConnect: true,            // Explicit connect, not on instantiation
  maxRetriesPerRequest: 1,      // Fail fast per operation
  retryStrategy(times) {        // Up to 3 reconnection attempts
    if (times > 3) return null; // then give up
    return Math.min(times * 200, 2000);
  },
}
```

### In-Memory Fallback

When `REDIS_ENABLED=false` or the Redis connection fails, the `InMemoryCacheConnector` is used. It stores `{ count, expiresAt }` entries in a `Map` with a 30-second cleanup interval.

**Limitations of in-memory mode:**
- Not shared across processes — each Node.js instance tracks limits independently.
- Counters are lost on restart.
- Memory grows linearly with unique keys.

---

## Fail-Open Design

Both `checkConnectionRate` and `checkMessageRate` catch errors from the cache layer and **allow the request through**:

```typescript
catch (error) {
  logger.warn('Connection rate check failed, allowing', { ip, error });
  return { allowed: true };
}
```

This means a Redis outage will **not** block legitimate clients. Rate limiting degrades gracefully rather than causing a total denial of service.

---

## Error Response

When a client is rate limited, it receives a WebSocket error message:

```json
{
  "type": "error",
  "error": "Too many connections. Please try again later.",
  "code": "RATE_LIMITED"
}
```

Or for message rate limiting:

```json
{
  "type": "error",
  "error": "Too many messages. Please slow down.",
  "code": "RATE_LIMITED"
}
```

The `RATE_LIMITED` error code is part of the `ErrorCode` enum defined in `src/types/websocket.types.ts`.

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `REDIS_ENABLED` | `true` (unless set to `"false"`) | Set to `"false"` to force in-memory fallback |

### Rate Limit Defaults

| Setting | Default | Description |
|---------|---------|-------------|
| `connectionMaxPerWindow` | 20 | Max new WebSocket connections per IP per window |
| `connectionWindowMs` | 60,000 ms | Connection rate window (1 minute) |
| `messageMaxPerWindow` | 60 | Max messages per session per window |
| `messageWindowMs` | 60,000 ms | Message rate window (1 minute) |

These defaults are defined in [WebSocketRateLimiter.ts](src/middleware/WebSocketRateLimiter.ts) and can be overridden by passing a partial config to the constructor.

---

## Comparison with Flow Engine Rate Limiting

| Aspect | Flow Engine (`aria-flow-engine`) | WS Engine (`aria-ws-engine`) |
|--------|--------------------------------|------------------------------|
| **Protocol** | HTTP (Express middleware) | WebSocket (class methods) |
| **Tiers** | Global, Auth, Expensive | Connection, Message |
| **Enforcement** | Express `RequestHandler` in middleware chain | Direct checks in controller methods |
| **On reject (HTTP)** | Returns HTTP 429 with `Retry-After` header | N/A |
| **On reject (WS)** | N/A | Connection tier: error + close(1008). Message tier: error only |
| **Cache interface** | Same `ICacheConnector` | Same `ICacheConnector` |
| **Lua script** | Identical | Identical |
| **Redis key prefix** | `aria-flow:rl:` | `aria-ws:rl:` |
| **Fallback** | In-memory sliding window (separate impl) | In-memory fixed window via `InMemoryCacheConnector` |

---

## Architecture Diagram

```
                  WebSocket Connection
                         │
                         ▼
               ┌───────────────────┐
               │ Connection Limit  │  20 conn/min per IP
               │ (handleConnection)│
               └────────┬──────────┘
                        │
                  allowed?
               ┌────────┴────────┐
               │ NO              │ YES
               ▼                 ▼
        ┌────────────┐   Create connection state
        │ Send error │   Setup ping/pong
        │ Close 1008 │   Register handlers
        └────────────┘          │
                                │
                   Incoming message
                                │
                                ▼
                      ┌───────────────────┐
                      │  Message Limit    │  60 msg/min per session
                      │  (routeMessage)   │
                      └────────┬──────────┘
                               │
                         allowed?
                      ┌────────┴────────┐
                      │ NO              │ YES
                      ▼                 ▼
               ┌────────────┐   Dispatch to handler
               │ Send error │   (init, audio, chat, etc.)
               │ Keep conn  │
               └────────────┘
```

```
            ┌──────────────────────────┐
            │  WebSocketRateLimiter    │
            │  checkConnectionRate()   │
            │  checkMessageRate()      │
            └────────────┬─────────────┘
                         │
                         ▼
            ┌──────────────────────────┐
            │    ICacheConnector       │
            │    .increment(key, ttl)  │
            └────────────┬─────────────┘
                         │
                REDIS_ENABLED?
            ┌────────────┴────────────┐
            │ YES                     │ NO
            ▼                         ▼
   ┌─────────────────┐     ┌──────────────────────┐
   │ RedisConnector   │     │ InMemoryCacheConnector│
   │ Lua INCR+PEXPIRE │     │ Map<key, {count,exp}>│
   │ Shared across    │     │ Per-process only      │
   │ all instances    │     │ 30s cleanup interval  │
   └─────────────────┘     └──────────────────────┘
```
