/* ─────────────────────────────────────────────────────────
 * Auth Store (Zustand 5 + persist)
 *
 * Persisted slice  → user, tokens, isAuthenticated
 * Ephemeral slice  → modal open/view (reset on reload)
 * ───────────────────────────────────────────────────────── */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthModalView, User } from "../types";
import { AUTH_STORAGE_KEY } from "../constants";

/** Shape of the persisted slice inside the zustand-persist JSON. */
interface PersistedAuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

/* ── State shape ─────────────────────────────────────────── */

interface AuthState {
  /* Persisted */
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  /* Derived — kept in sync by actions for selector convenience */
  isAuthenticated: boolean;

  /* Ephemeral UI */
  isModalOpen: boolean;
  modalView: AuthModalView;
}

interface AuthActions {
  /** Set full auth context after login / signup. */
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;

  /** Swap token pair after a silent refresh. */
  setTokens: (accessToken: string, refreshToken: string) => void;

  /** Wipe everything (logout). */
  clearAuth: () => void;

  /** Open the auth modal on a specific view. */
  openModal: (view?: AuthModalView) => void;

  /** Close the auth modal. */
  closeModal: () => void;

  /** Toggle between login ↔ signup without closing. */
  switchView: (view: AuthModalView) => void;
}

/* ── Store ────────────────────────────────────────────────── */

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      /* ── Initial state ── */
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      isModalOpen: false,
      modalView: "login",

      /* ── Actions ── */
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      openModal: (view = "login") =>
        set({ isModalOpen: true, modalView: view }),

      closeModal: () => set({ isModalOpen: false }),

      switchView: (view) => set({ modalView: view }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      /** Only persist auth data — modal state resets on reload. */
      partialize: ({ user, accessToken, refreshToken, isAuthenticated }) => ({
        user,
        accessToken,
        refreshToken,
        isAuthenticated,
      }),
    },
  ),
);

/* ── Cross-tab sync ─────────────────────────────────────────
 * The `storage` event fires when *another* tab writes to
 * localStorage.  We use it to keep every tab's in-memory
 * Zustand state up-to-date so a stale refresh token is never
 * sent to the backend (which would trigger token-reuse
 * revocation).
 * ───────────────────────────────────────────────────────── */

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== AUTH_STORAGE_KEY) return;

    // Another tab cleared auth (logout)
    if (!event.newValue) {
      useAuthStore.getState().clearAuth();
      return;
    }

    try {
      const persisted = JSON.parse(event.newValue) as {
        state?: PersistedAuthState;
      };
      const s = persisted?.state;
      if (s) {
        useAuthStore.setState({
          user: s.user ?? null,
          accessToken: s.accessToken ?? null,
          refreshToken: s.refreshToken ?? null,
          isAuthenticated: s.isAuthenticated ?? false,
        });
      }
    } catch {
      /* malformed JSON — ignore */
    }
  });
}
