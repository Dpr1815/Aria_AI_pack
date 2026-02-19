# TanStack (Router & Query)

This project uses two core TanStack libraries: **TanStack Router** for type-safe file-based routing and **TanStack Query** for server state management.

---

## TanStack Router

### Overview

TanStack Router replaces React Router with fully type-safe, file-based routing. Routes are defined as files inside `src/routes/`, and the Vite plugin automatically generates a route tree at build time (`src/routeTree.gen.ts`).

### How it works in this project

**Vite plugin** (`vite.config.ts`):

```ts
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

plugins: [TanStackRouterVite(), react(), tailwindcss()];
```

The plugin watches `src/routes/` and regenerates `routeTree.gen.ts` whenever a route file is added, removed, or renamed.

**Router instance** (`src/router.ts`):

```ts
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",    // prefetch on hover/focus
  scrollRestoration: true,      // restore scroll position on back/forward
});

// Register the router for global type-safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
```

Registering the router type means `<Link to="...">` and `useNavigate()` get full autocomplete and compile-time checking on valid route paths.

**App entry** (`src/main.tsx`):

```tsx
<QueryClientProvider client={queryClient}>
  <RouterProvider router={router} />
</QueryClientProvider>
```

### Route file conventions

| File / pattern          | URL            | Purpose                        |
| ----------------------- | -------------- | ------------------------------ |
| `__root.tsx`            | (wraps all)    | Root layout, global providers  |
| `_app.tsx`              | (layout only)  | Pathless layout (Header + Footer) |
| `_app/index.tsx`        | `/`            | Home page                      |
| `_app/agents.index.tsx` | `/agents`      | Agents list                    |
| `_app/agents.$agentId/` | `/agents/:id`  | Dynamic segment folder         |
| `room/$roomId.tsx`      | `/room/:id`    | Room (outside `_app` layout)   |

Key conventions:
- **`__root.tsx`** — the top-level layout that wraps every route. Contains `<Outlet />` and global UI like the auth modal.
- **`_` prefix** (e.g. `_app`) — pathless layout routes. They wrap children without adding a URL segment.
- **`$` prefix** (e.g. `$agentId`) — dynamic segments that become route params.
- **Dot notation** (e.g. `agents.index.tsx`) — nested routes under a shared path prefix.

### Writing a route

A typical route file looks like this:

```tsx
// src/routes/_app/agents.index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { AgentsPage } from "@/features/agent/components/agents-page";

export const Route = createFileRoute("/_app/agents/")({
  component: AgentsRoute,
});

function AgentsRoute() {
  useDocumentTitle("Agents");
  return <AgentsPage />;
}
```

The route path string must match the file's position in the folder structure. The Vite plugin validates this at build time.

### Layouts

The project uses two nested layouts:

1. **`__root.tsx`** — renders auth refresh hook, auth modal, and a full-height background container.
2. **`_app.tsx`** — renders the Header, main content area (`<Outlet />`), and conditionally the Footer.

Routes outside `_app` (like `room/$roomId.tsx`) get the root layout but no header/footer — useful for immersive full-screen pages.

### Navigation

```tsx
import { Link, useNavigate } from "@tanstack/react-router";

// Declarative
<Link to="/agents/$agentId" params={{ agentId: "abc" }}>View</Link>

// Imperative
const navigate = useNavigate();
navigate({ to: "/agents/$agentId", params: { agentId: "abc" } });
```

Both are fully type-safe — invalid paths or missing params are compile errors.

---

## TanStack Query

### Overview

TanStack Query (React Query v5) handles all server state: fetching, caching, background refetching, and mutation side effects. It replaces manual `useEffect` + `useState` fetch patterns.

### Configuration

**Query client** (`src/lib/query-client.ts`):

```ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,     // 5 min — data is "fresh" and won't refetch
      gcTime: 1000 * 60 * 30,        // 30 min — unused data stays in cache
      retry: 1,                       // one retry on failure
      refetchOnWindowFocus: false,    // no refetch when tab regains focus
    },
    mutations: {
      retry: 0,                       // mutations never auto-retry
    },
  },
});
```

### Query key factory pattern

Each feature defines a key factory to keep cache keys consistent and enable targeted invalidation:

```ts
// src/features/agent/hooks/use-agent.ts
export const agentKeys = {
  all: ["agents"] as const,
  detail: (id: string) => [...agentKeys.all, id] as const,
  config: (id: string) => [...agentKeys.detail(id), "config"] as const,
};
```

This means:
- `queryClient.invalidateQueries({ queryKey: ["agents"] })` — invalidates the list **and** every detail/config query.
- `queryClient.invalidateQueries({ queryKey: agentKeys.config("abc") })` — invalidates only that agent's config.

### Query hooks

Queries are thin wrappers around `useQuery` that call the API layer:

```ts
// src/features/agent/hooks/use-agents.ts
export function useAgents(page = 1, limit = 20) {
  return useQuery({
    queryKey: [...agentKeys.all, { page, limit }],
    queryFn: () => agentApi.list({ page, limit }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,   // keep old page visible during fetch
  });
}
```

Usage in a component:

```tsx
const { data, isLoading, error } = useAgents(page, limit);
```

### Mutation hooks

Mutations use `useMutation` and invalidate related queries on success:

```ts
// src/features/agent/hooks/use-agent-mutations.ts
export function useAgentMutations(agentId: string) {
  const qc = useQueryClient();
  const configKey = agentKeys.config(agentId);
  const invalidate = () => qc.invalidateQueries({ queryKey: configKey });

  const updateAgent = useMutation({
    mutationFn: (payload: UpdateAgentPayload) =>
      agentApi.update(agentId, payload),
    onSuccess: invalidate,
  });

  // ... more mutations

  return { updateAgent, addStep, removeStep, ... } as const;
}
```

The pattern is always:
1. Call the API function in `mutationFn`
2. Invalidate the relevant query keys in `onSuccess` so the UI refreshes

### API layer

The API layer is a plain object of typed async functions (not hooks). It uses the shared `api` client from `src/lib/api-client.ts` which handles auth headers, token refresh, and org context automatically:

```ts
// src/features/agent/api/agent.api.ts
export const agentApi = {
  list: (params) => api.get<PaginatedEnvelope<Agent>>(BASE, { params }).then(r => ({ data: r.data, meta: r.meta })),
  getById: (id, options) => api.get<ApiEnvelope<Agent>>(`${BASE}/${id}`, { params }).then(r => r.data),
  update: (id, payload) => api.patch<ApiEnvelope<Agent>>(`${BASE}/${id}`, { body: payload }).then(r => r.data),
  // ...
};
```

### Devtools

TanStack Query Devtools and Router Devtools are available in dev dependencies for debugging cache state and route matching. They can be added to the root layout during development.

---

## Adding a new data-fetching feature

1. Create `features/<name>/api/<name>.api.ts` — plain async functions using `api.get/post/...`
2. Create `features/<name>/hooks/use-<name>.ts` — define a key factory and `useQuery` wrapper
3. Create `features/<name>/hooks/use-<name>-mutations.ts` — `useMutation` hooks that invalidate on success
4. Use the hooks directly in your route components
