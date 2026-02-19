# Authentication & Multi-Tenancy Middleware

## Middleware Files

| File | Purpose |
|------|---------|
| `auth.middleware.ts` | **Authentication** — Verifies JWT, loads user from DB, sets `req.user` |
| `tenant.middleware.ts` | **Tenant resolution** — Reads `X-Organization-ID` header, resolves personal or org tenant, sets `req.tenant`. Also exports `requireTenantRole` |
| `tenant-scope.middleware.ts` | **Resource authorization** — Verifies the requested resource belongs to the tenant |

## Request Flow

Every protected route follows the same chain:

```
auth → tenant → requireTenantRole(Role) → tenantScope.X() → controller
```

### 1. `auth` — Who are you?

Extracts Bearer token, verifies JWT, looks up user in DB.

**Sets:** `req.user` (`{ _id, email, organizationId, planId }`)

Variants:
- `optionalAuth` — Same but passes through if no token
- `serviceAuth` — Validates service-to-service tokens (internal routes only)

### 2. `tenant` — Which workspace?

Reads the `X-Organization-ID` header to determine tenant context:

- **No header** → Personal tenant: `{ type: 'personal', userId }`
- **With header** → Org tenant: `{ type: 'organization', userId, organizationId, role, organization }`

For org tenants, it validates the org exists and the user is a member.

**Sets:** `req.tenant`

### 3. `requireTenantRole(role)` — Do you have permission?

Checks the user's role meets the minimum required level. Personal tenants always pass (owner has full access). Org tenants are checked against the role hierarchy.

### 4. `tenantScope.X()` — Can you access this resource?

Verifies the specific resource belongs to the tenant. Each method handles a different resource type:

| Method | What it checks |
|--------|---------------|
| `.agent(paramKey?)` | Agent is owned by user (personal) or belongs to org |
| `.session(paramKey?)` | Session's agent belongs to tenant |
| `.summary(paramKey?)` | Summary's agent belongs to tenant |
| `.organization(paramKey?)` | URL org ID matches tenant's org |
| `.resolveAgentIds()` | Resolves tenant's agent IDs for list operations, sets `req.tenantAgentIds` |

All methods default to `paramKey = 'id'`. Pass a custom key when the route param differs (e.g., `tenantScope.agent('agentId')` for `/statistics/agent/:agentId`).

## Route Examples

```typescript
// Single resource — scope check on the specific resource
router.get('/:id', auth, tenant, requireTenantRole(Role.READ), tenantScope.agent(), controller.getById);

// List — resolve which agents the tenant can see
router.get('/', auth, tenant, requireTenantRole(Role.READ), tenantScope.resolveAgentIds(), controller.list);

// Nested resource — scope check via parent (session's agent)
router.get('/', auth, tenant, requireTenantRole(Role.READ), tenantScope.session('sessionId'), controller.getBySessionId);

// Org management — verify URL org matches tenant org
router.patch('/:id', auth, tenant, requireTenantRole(Role.ADMIN), tenantScope.organization(), controller.update);
```

## Tenant Types

```
Personal tenant (no X-Organization-ID header):
  - User owns agents directly
  - Full access to own resources
  - requireTenantRole always passes

Organization tenant (with X-Organization-ID header):
  - Resources belong to the org, not individual users
  - Access controlled by member role (READ / WRITE / ADMIN)
  - requireTenantRole enforces minimum role
```

## Routes Without Tenant

Some routes skip tenant resolution:

- **Public routes** (`/health`, `GET /agents/:id/public`) — No auth at all
- **User routes** (`/api/users/*`) — Only need `auth`
- **Internal routes** (`/internal/*`) — Use `serviceAuth` instead
- **Session join** (`POST /api/sessions/join`) — Uses `sessionAuth` (participant token)
