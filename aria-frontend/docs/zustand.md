# Zustand

Zustand v5 is used for all client-side state that doesn't come from the server (for server state, see [TanStack Query](./tanstack.md)).

---

## Why Zustand

- Minimal API — a store is a single `create()` call, no providers or context wrappers needed
- Works outside React (call `store.getState()` from plain functions, WebSocket handlers, etc.)
- Built-in `persist` middleware for localStorage
- Selective subscriptions — components only re-render when the slice they read changes

## Store locations

The project organizes stores in two places:

| Location | Scope | Examples |
| --- | --- | --- |
| `src/stores/` | Global, app-wide | `app.store.ts` (sidebar toggle) |
| `src/features/<name>/stores/` | Feature-scoped | `auth.store.ts`, `room.store.ts`, `agent-editor.store.ts`, `organization.store.ts`, `generate-wizard.store.ts` |

## Basic store pattern

Every store follows the same structure — state interface, actions interface (or combined), and a `create()` call:

```ts
// src/stores/app.store.ts
import { create } from "zustand";

interface AppState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
}));
```

Usage in a component:

```tsx
function Sidebar() {
  const isOpen = useAppStore((s) => s.isSidebarOpen);
  const toggle = useAppStore((s) => s.toggleSidebar);

  return <nav className={isOpen ? "open" : "closed"}>...</nav>;
}
```

Always use a **selector** (`(s) => s.someField`) to subscribe to only the state you need. This prevents unnecessary re-renders.

## Persisted stores

For state that should survive page reloads, wrap the store with the `persist` middleware:

```ts
// src/features/auth/stores/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      isModalOpen: false,     // ephemeral — not persisted
      modalView: "login",     // ephemeral — not persisted

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      // ...more actions
    }),
    {
      name: "aria-auth",                // localStorage key
      partialize: ({ user, accessToken, refreshToken, isAuthenticated }) => ({
        user,
        accessToken,
        refreshToken,
        isAuthenticated,
      }),
    },
  ),
);
```

Key points:
- **`name`** — the localStorage key. Convention: `"aria-<feature>"`.
- **`partialize`** — pick which fields get persisted. UI state (modal open/close) is excluded so it resets on reload.

### Current persisted stores

| Store | localStorage key | What's persisted |
| --- | --- | --- |
| `useAuthStore` | `aria-auth` | user, tokens, isAuthenticated |
| `useLocaleStore` | `aria-locale` | locale preference |
| `useOrganizationStore` | `aria-organization` | active organization ID |

## Ephemeral stores

Some stores are intentionally **not** persisted — they hold transient UI state that should reset on navigation:

```ts
// src/features/agent/stores/agent-editor.store.ts
export const useAgentEditorStore = create<AgentEditorState>((set) => ({
  panel: { kind: "settings" },

  showSettings: () => set({ panel: { kind: "settings" } }),
  showStep: (stepKey) => set({ panel: { kind: "step", stepKey } }),
  showAssessment: () => set({ panel: { kind: "assessment" } }),
  reset: () => set({ panel: { kind: "settings" } }),
}));
```

Call `reset()` when leaving a page to clean up.

## Using stores outside React

Zustand stores can be accessed anywhere — not just inside components. This is particularly useful in API clients, WebSocket handlers, and action registries:

```ts
// src/lib/api-client.ts — reads the auth token for every request
const token = useAuthStore.getState().accessToken;

// WebSocket handler — updates room state from a server event
useRoomStore.getState().addMessage(msg);
```

`getState()` reads the current snapshot synchronously without subscribing.

## Cross-tab sync

The auth store listens to the `storage` event to stay in sync across browser tabs. When another tab refreshes the token or logs out, every tab updates instantly:

```ts
window.addEventListener("storage", (event) => {
  if (event.key !== AUTH_STORAGE_KEY) return;
  if (!event.newValue) {
    useAuthStore.getState().clearAuth();
    return;
  }
  const persisted = JSON.parse(event.newValue);
  useAuthStore.setState({ ...persisted.state });
});
```

This prevents stale tokens from being sent to the backend when multiple tabs are open.

## Adding a new store

1. Create `src/features/<name>/stores/<name>.store.ts` (or `src/stores/` if global)
2. Define state + actions interfaces
3. Use `create()` — add `persist()` middleware if the state should survive reloads
4. Export the hook (e.g. `useMyStore`)
5. Use selectors in components: `useMyStore((s) => s.field)`
