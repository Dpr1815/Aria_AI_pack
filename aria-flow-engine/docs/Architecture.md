# Architecture

## Overview

Aria Flow Engine is a TypeScript/Express backend service for managing conversational AI agents. It follows a **layered architecture** with dependency injection via a composition root.

**Tech stack:** Node.js, Express, MongoDB (native driver), Redis (ioredis), OpenAI API, Google Cloud Storage, Zod, JWT, Pino.

---

## Project Structure

```
├── Dockerfile
├── docs
│   ├── Add_new_statistic.md
│   ├── Add_new_step.md
│   ├── Add_new_summary.md
│   ├── Architecture.md
│   └── Auth_and_tenancy.md
├── jest.config.js
├── package.json
├── package-lock.json
├── README.md
├── scripts
│   ├── generate-jwt-secrets.ts
│   └── generate-service-token.ts
├── src
│   ├── bootstrap.ts
│   ├── config
│   │   ├── cache.config.ts
│   │   ├── database.config.ts
│   │   ├── index.ts
│   │   ├── prompt.config.ts
│   │   ├── server.config.ts
│   │   └── storage.config.ts
│   ├── connectors
│   │   ├── cache
│   │   │   ├── ICacheConnector.ts
│   │   │   ├── InMemoryCacheConnector.ts
│   │   │   ├── index.ts
│   │   │   └── RedisConnector.ts
│   │   ├── database
│   │   │   ├── IDatabase.ts
│   │   │   ├── index.ts
│   │   │   └── MongoConnector.ts
│   │   ├── index.ts
│   │   ├── llm
│   │   │   ├── ILLMConnector.ts
│   │   │   ├── index.ts
│   │   │   ├── model-capabilities.ts
│   │   │   └── OpenAIConnector.ts
│   │   └── storage
│   │       ├── GCSConnector.ts
│   │       ├── index.ts
│   │       └── IStorageConnector.ts
│   ├── constants
│   │   ├── agent-status.ts
│   │   ├── index.ts
│   │   ├── plans.ts
│   │   └── roles.ts
│   ├── controllers
│   │   ├── agent.controller.ts
│   │   ├── category.controller.ts
│   │   ├── conversation.controller.ts
│   │   ├── index.ts
│   │   ├── organization.controller.ts
│   │   ├── participant.controller.ts
│   │   ├── session.controller.ts
│   │   ├── statistics.controller.ts
│   │   ├── summary.controller.ts
│   │   └── user.controller.ts
│   ├── middleware
│   │   ├── auth.middleware.ts
│   │   ├── entitlement.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── index.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── session-auth.middleware.ts
│   │   ├── tenant.middleware.ts
│   │   ├── tenant-scope.middleware.ts
│   │   ├── upload.middleware.ts
│   │   └── validation.middleware.ts
│   ├── models
│   │   ├── documents
│   │   │   ├── agent-assessment.document.ts
│   │   │   ├── agent.document.ts
│   │   │   ├── agent-prompt.document.ts
│   │   │   ├── agent-statistics.document.ts
│   │   │   ├── agent-step.document.ts
│   │   │   ├── conversation.document.ts
│   │   │   ├── index.ts
│   │   │   ├── organization.document.ts
│   │   │   ├── participant.document.ts
│   │   │   ├── session.document.ts
│   │   │   ├── summary.document.ts
│   │   │   └── user.document.ts
│   │   ├── dto
│   │   │   ├── agent.dto.ts
│   │   │   ├── conversation.dto.ts
│   │   │   ├── index.ts
│   │   │   ├── organization.dto.ts
│   │   │   ├── participant.dto.ts
│   │   │   ├── session.dto.ts
│   │   │   ├── statistics.dto.ts
│   │   │   ├── summary.dto.ts
│   │   │   └── user.dto.ts
│   │   └── index.ts
│   ├── modules
│   │   ├── index.ts
│   │   ├── statistics
│   │   │   ├── definitions
│   │   │   │   ├── index.ts
│   │   │   │   └── interview
│   │   │   │       ├── aggregator.ts
│   │   │   │       ├── config.ts
│   │   │   │       ├── index.ts
│   │   │   │       └── schema.ts
│   │   │   ├── index.ts
│   │   │   ├── registry.ts
│   │   │   └── types.ts
│   │   ├── steps
│   │   │   ├── definitions
│   │   │   │   ├── index.ts
│   │   │   │   └── interview
│   │   │   │       ├── assessment.step.ts
│   │   │   │       ├── background.step.ts
│   │   │   │       ├── behavioral.step.ts
│   │   │   │       ├── conclusion.step.ts
│   │   │   │       ├── index.ts
│   │   │   │       ├── intro.step.ts
│   │   │   │       ├── linguistic.step.ts
│   │   │   │       ├── workplace-safety.step.ts
│   │   │   │       └── work.step.ts
│   │   │   ├── helpers
│   │   │   │   ├── generation.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── labels.ts
│   │   │   │   ├── prompts.ts
│   │   │   │   └── relationships.ts
│   │   │   ├── index.ts
│   │   │   ├── registry.ts
│   │   │   └── types.ts
│   │   └── summaries
│   │       ├── index.ts
│   │       ├── registry.ts
│   │       ├── templates
│   │       │   ├── index.ts
│   │       │   └── interview
│   │       │       ├── config.ts
│   │       │       ├── index.ts
│   │       │       └── schema.ts
│   │       └── types.ts
│   ├── prompts
│   │   ├── index.ts
│   │   └── templates
│   │       ├── conversation
│   │       │   ├── index.ts
│   │       │   └── recruiting.prompts.ts
│   │       ├── generation
│   │       │   ├── index.ts
│   │       │   └── recruiting.prompts.ts
│   │       ├── index.ts
│   │       └── summary
│   │           ├── index.ts
│   │           └── recruiting-summary.prompt.ts
│   ├── repositories
│   │   ├── agent-assessment.repository.ts
│   │   ├── agent-prompt.repository.ts
│   │   ├── agent.repository.ts
│   │   ├── agent-statistics.repository.ts
│   │   ├── agent-step.repository.ts
│   │   ├── base.repository.ts
│   │   ├── conversation.repository.ts
│   │   ├── index.ts
│   │   ├── organization.repository.ts
│   │   ├── participant.repository.ts
│   │   ├── session.repository.ts
│   │   ├── summary.repository.ts
│   │   └── user.repository.ts
│   ├── routes
│   │   ├── agent.routes.ts
│   │   ├── category.routes.ts
│   │   ├── conversation.routes.ts
│   │   ├── health.routes.ts
│   │   ├── index.ts
│   │   ├── internal.routes.ts
│   │   ├── organization.routes.ts
│   │   ├── participant.routes.ts
│   │   ├── session.routes.ts
│   │   ├── statistics.routes.ts
│   │   ├── summary.routes.ts
│   │   └── user.routes.ts
│   ├── server.ts
│   ├── services
│   │   ├── agent.service.ts
│   │   ├── ai
│   │   │   ├── index.ts
│   │   │   ├── openai.service.ts
│   │   │   └── prompt-builder.service.ts
│   │   ├── conversation.service.ts
│   │   ├── generation
│   │   │   ├── agent-generator.service.ts
│   │   │   ├── index.ts
│   │   │   ├── step-generator.service.ts
│   │   │   └── step-sequencer.ts
│   │   ├── index.ts
│   │   ├── organization.service.ts
│   │   ├── participant.service.ts
│   │   ├── session.service.ts
│   │   ├── statistics.service.ts
│   │   ├── summary.service.ts
│   │   ├── user.service.ts
│   │   └── video.service.ts
│   ├── utils
│   │   ├── circuit-breaker.ts
│   │   ├── errors.ts
│   │   ├── helpers.ts
│   │   ├── index.ts
│   │   ├── logger.ts
│   │   ├── response.ts
│   │   ├── slides.ts
│   │   └── types.ts
│   └── validations
│       ├── agent.validation.ts
│       ├── category.validation.ts
│       ├── conversation.validation.ts
│       ├── index.ts
│       ├── organization.validation.ts
│       ├── participant.validation.ts
│       ├── session.validation.ts
│       ├── statistics.validation.ts
│       ├── summary.validation.ts
│       ├── user.validation.ts
│       └── video.validation.ts

```

## Layers

```
┌─────────────────────────────────────────────────┐
│  Routes                                         │
│  HTTP verb + path → middleware chain → handler   │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│  Controllers                                    │
│  Extract request data → call service → format   │
│  response via ApiResponseBuilder                │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│  Services                                       │
│  Business logic, orchestration, validation      │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│  Repositories                                   │
│  Data access via BaseRepository<T>              │
│  Automatic timestamps, error wrapping           │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│  Connectors                                     │
│  IDatabase (MongoDB), ILLMConnector (OpenAI),   │
│  IStorageConnector (GCS), ICacheConnector(Redis) │
└─────────────────────────────────────────────────┘
```

Each layer only depends on the layer directly below it.

---

## Initialization Flow

Defined in `src/bootstrap.ts`. The composition root creates all dependencies in order:

```
bootstrap()
  → loadConfig()              # Environment variables → typed AppConfig
  → createConnectors(config)  # Database, LLM, Storage, Cache adapters
  → database.connect()        # Establish MongoDB connection
  → cache.connect()           # Connect to Redis (falls back to in-memory on failure)
  → createRepositories(db)    # One repository per collection
  → createServices(...)       # Business logic (ordered by dependencies)
  → createMiddleware(...)     # Auth, tenant, rate limiting, validation
  → createControllers(...)    # HTTP handlers
  → createExpressApp(...)     # Wire routes, mount middleware
  → startServer(core)         # Listen on port
```

Each factory function returns a typed object. No service locator or DI container library is used.

---

## Configuration

All config is loaded once at startup from environment variables and cached.

| Config   | File                        | Key Settings                                          |
| -------- | --------------------------- | ----------------------------------------------------- |
| Cache    | `config/cache.config.ts`    | Redis URL, key prefix, enabled flag                   |
| Database | `config/database.config.ts` | MongoDB URI, pool size, timeouts                      |
| Server   | `config/server.config.ts`   | Port, JWT secrets (access, refresh, session, service) |
| Prompt   | `config/prompt.config.ts`   | Default LLM model, max tokens, temperature            |
| Storage  | `config/storage.config.ts`  | GCS bucket name, key file path, signed URL expiry     |

---

## Connectors (Infrastructure Adapters)

Connectors implement interfaces so implementations can be swapped without touching business logic.

| Interface           | Implementation                            | Purpose                                                   |
| ------------------- | ----------------------------------------- | --------------------------------------------------------- |
| `IDatabase`         | `MongoConnector`                          | Connection pooling, collection access, health check       |
| `ILLMConnector`     | `OpenAIConnector`                         | Text completion, JSON completion (with circuit breaker)   |
| `IStorageConnector` | `GCSConnector`                            | File upload, signed URLs, deletion (with circuit breaker) |
| `ICacheConnector`   | `RedisConnector`, `InMemoryCacheConnector` | Atomic increment with TTL, used for rate limiting         |

Both OpenAI and GCS connectors include **circuit breakers** that fail fast when a downstream service is experiencing sustained failures.

### Cache Connector

The cache layer uses a **strategy pattern** with two implementations:

- **`RedisConnector`** — Production implementation using `ioredis`. Connects with `lazyConnect`, retries up to 3 times with exponential backoff, and uses **Lua scripts** for atomic `INCR` + `PEXPIRE` operations. All keys are prefixed with `aria-flow:rl:` to prevent collisions.
- **`InMemoryCacheConnector`** — Fallback for development or when Redis is unavailable. Uses an in-memory `Map` with a 30-second TTL cleanup interval. Per-process only, not shared across instances.

The connector factory in `connectors/index.ts` selects the implementation based on the `REDIS_ENABLED` flag. If `RedisConnector` fails to connect at startup, the system logs a warning and continues with the in-memory fallback — no hard dependency on Redis.

---

## Repositories

All repositories extend `BaseRepository<T>`, which provides:

- CRUD: `findById`, `findOne`, `findMany`, `create`, `updateById`, `deleteById`
- Pagination: `findPaginated` (parallel count + data fetch)
- Upsert, bulk operations, distinct, exists, count
- Automatic `createdAt`/`updatedAt` timestamps
- Error wrapping into `DatabaseError`
- `OrThrow` variants that throw `NotFoundError`

**Collections:** users, organizations, agents, agent-steps, agent-prompts, agent-assessments, sessions, participants, conversations, summaries, agent-statistics.

---

## Services

Services are created in dependency order to avoid circular references.

### Core (no cross-service deps)

- **UserService** — Signup, login, JWT token rotation, password management
- **OrganizationService** — Org CRUD, member management, role assignment
- **AgentService** — Agent CRUD, step/prompt/assessment management

### Session Management

- **ConversationService** — Store/retrieve conversation records
- **ParticipantService** — Find-or-create by email, cascade operations
- **SessionService** — Session lifecycle (join, complete, abandon), token generation
- **VideoService** — Video upload to GCS, signed URL generation

### Analytics

- **SummaryService** — Config-driven summary generation via LLM (see `ADD_NEW_SUMMARY.md`)
- **StatisticsService** — Aggregates summaries into statistics (see `ADD_NEW_STATISTIC.md`)

### AI

- **OpenAIService** — Wrapper around ILLMConnector
- **PromptBuilderService** — Template resolution with variable injection

### Generation

- **AgentGeneratorService** — AI-driven agent creation from description

---

## Middleware

Applied as composable Express middleware functions. The standard protected-route chain:

```
auth → tenant → requireTenantRole(Role) → tenantScope.resource() → controller
```

| Middleware                | Purpose                                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| `auth`                    | JWT verification, user lookup, sets `req.user`                            |
| `optionalAuth`            | Same as auth but passes through if no token                               |
| `serviceAuth`             | Service-to-service JWT (long-lived, no user lookup)                       |
| `tenant`                  | Resolves personal vs organization context from `X-Organization-ID` header |
| `requireTenantRole(role)` | Enforces minimum role (READ < WRITE < ADMIN)                              |
| `tenantScope.*()`         | Verifies resource ownership (agent, session, summary, organization)       |
| `entitlement`             | Plan-based feature gates (e.g., max active agents)                        |
| `sessionAuth`             | Participant access token validation                                       |
| `validation`              | Zod schema validation for body, query, params                             |
| `globalRateLimit`         | 200 req/min per IP on all `/api` routes (Redis-backed)                    |
| `authRateLimit`           | 15 req/min per IP on login/signup/refresh/join (Redis-backed)             |
| `expensiveRateLimit`      | 5 req/min per user on OpenAI-triggering routes (Redis-backed)             |
| `error`                   | Centralized error handler (operational vs unexpected)                     |

Rate limiters use `ICacheConnector` under the hood — Redis in production for shared counters across instances, in-memory fallback otherwise. See `RATE_LIMITING.md` for detailed rate limiting documentation.

See `AUTH_AND_TENANCY.md` for detailed auth/tenant documentation.

---

## Routes

| Prefix                           | Auth          | Purpose                                              |
| -------------------------------- | ------------- | ---------------------------------------------------- |
| `/health`                        | None          | Liveness, readiness, health checks                   |
| `/internal`                      | Service token | Service-to-service (summary/statistics triggers)     |
| `/api/users`                     | Mixed         | Signup, login, refresh (public); profile (protected) |
| `/api/organizations`             | User          | Org CRUD, member management                          |
| `/api/agents`                    | User + Tenant | Agent CRUD, steps, prompts, assessment               |
| `/api/sessions`                  | Mixed         | Join (public); lifecycle management (protected)      |
| `/api/sessions/:id/conversation` | User + Tenant | Conversation messages                                |
| `/api/participants`              | User + Tenant | Participant CRUD                                     |
| `/api/summaries`                 | User + Tenant | Summary generation and retrieval                     |
| `/api/statistics`                | User + Tenant | Statistics calculation and retrieval                 |
| `/api/categories`                | User          | Step category listing                                |

---

## Modules (Pluggable Systems)

Three config-driven module systems under `src/modules/`. Each follows the same pattern: define a config, register it, and the service handles the rest.

### Steps (`modules/steps/`)

Defines conversation step types (intro, background, assessment, etc.) with Zod input schemas, prompt mappings, and generation configs. See `ADD_NEW_STEP.md`.

### Summaries (`modules/summaries/`)

Defines summary types as ordered section pipelines. Each section maps to a step, resolves variables, calls an LLM prompt, and validates output with Zod. See `ADD_NEW_SUMMARY.md`.

### Statistics (`modules/statistics/`)

Defines aggregation functions that consume summaries and produce aggregate metrics. Pure functions with no I/O. See `ADD_NEW_STATISTIC.md`.

---

## Error Handling

Custom error hierarchy in `src/utils/errors.ts`:

| Error                  | Status | Operational | Use Case                                         |
| ---------------------- | ------ | ----------- | ------------------------------------------------ |
| `NotFoundError`        | 404    | Yes         | Resource not found                               |
| `ValidationError`      | 400    | Yes         | Input validation failure (includes field errors) |
| `UnauthorizedError`    | 401    | Yes         | Missing/invalid auth                             |
| `ForbiddenError`       | 403    | Yes         | Insufficient permissions                         |
| `ConflictError`        | 409    | Yes         | Duplicate resource                               |
| `RateLimitError`       | 429    | Yes         | Rate limit exceeded                              |
| `DatabaseError`        | 500    | No          | Infrastructure failure                           |
| `ExternalServiceError` | 502    | Yes         | OpenAI/GCS failure                               |

The error middleware returns consistent `ApiErrorResponse` JSON. Stack traces are only included in development.

---

## API Response Format

All responses use `ApiResponseBuilder`:

```json
// Success
{ "success": true, "data": { ... }, "message": "Optional" }

// Paginated
{ "success": true, "data": [...], "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3, "hasNextPage": true, "hasPrevPage": false } }

// Error
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Agent not found", "requestId": "abc123" } }
```

---

## Security

- **Authentication:** JWT with access + refresh token rotation
- **Password storage:** bcrypt (12 rounds)
- **Refresh tokens:** Stored as SHA-256 hashes, max 10 per user, reuse detection
- **Multi-tenancy:** Middleware-enforced tenant isolation with RBAC
- **Input validation:** Zod schemas on all API inputs
- **Rate limiting:** Tiered (global, auth, expensive), Redis-backed with in-memory fallback
- **Headers:** Helmet for security headers
- **Circuit breakers:** Fail-fast on OpenAI/GCS outages

---

## Graceful Shutdown

`src/server.ts` handles `SIGINT` and `SIGTERM`:

1. Stop accepting new HTTP connections
2. Close the HTTP server
3. Disconnect from Redis cache
4. Disconnect from MongoDB

Uncaught exceptions and unhandled rejections are caught and trigger shutdown.

---

## Directory Structure

```
src/
  config/          # Environment-driven configuration (DB, cache, LLM, storage, server)
  connectors/      # Infrastructure adapters (DB, Cache, LLM, Storage)
  constants/       # Plans, roles, agent status
  controllers/     # HTTP request handlers
  middleware/      # Auth, tenant, validation, rate limiting, errors
  models/
    documents/     # MongoDB document types
    dto/           # API response types
  modules/
    steps/         # Step type definitions and registry
    summaries/     # Summary type configs and registry
    statistics/    # Statistics aggregators and registry
  prompts/         # LLM prompt templates
  repositories/    # Data access layer
  routes/          # Express route definitions
  services/        # Business logic
  utils/           # Errors, logger, helpers, circuit breaker, response builder
  validations/     # Zod schemas for API input validation
  bootstrap.ts     # Composition root
  server.ts        # Entry point, signal handling
```
