import { useAuthStore } from "@/features/auth/stores/auth.store";
import { ORG_STORAGE_KEY } from "@/features/organization/constants";

const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

/** Endpoints that must NOT carry an Authorization header. */
const PUBLIC_ENDPOINTS = [
  "/api/users/signup",
  "/api/users/login",
  "/api/users/refresh",
] as const;

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/* ── Token helpers (single source of truth: Zustand store) ── */

function readTokens(): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  const { accessToken, refreshToken } = useAuthStore.getState();
  return { accessToken, refreshToken };
}

function clearAuth(): void {
  useAuthStore.getState().clearAuth();
}

/* ── Organization context helper ─────────────────────────── */

interface PersistedOrgState {
  state?: {
    activeOrg?: { _id?: string } | null;
  };
}

function readActiveOrgId(): string | null {
  try {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    if (!raw) return null;
    const parsed: PersistedOrgState = JSON.parse(raw);
    return parsed?.state?.activeOrg?._id ?? null;
  } catch {
    return null;
  }
}

/* ── Cross-tab refresh coordination ──────────────────────────
 * Problem: with refresh-token rotation the backend immediately
 * invalidates the old token.  If two tabs send the same token,
 * the second request triggers "token-reuse" detection which
 * revokes *all* sessions.
 *
 * Solution:
 *  1. A localStorage lock (`aria-refresh-lock`) signals that a
 *     tab is currently refreshing.
 *  2. A BroadcastChannel lets the refreshing tab push the new
 *     tokens to every waiting tab.
 *  3. A module-level `refreshPromise` prevents duplicate calls
 *     within the same tab.
 * ───────────────────────────────────────────────────────────── */

type TokenPair = { accessToken: string; refreshToken: string };

const REFRESH_LOCK_KEY = "aria-refresh-lock";
const REFRESH_LOCK_TTL = 15_000; // stale-lock safety window
const CROSS_TAB_TIMEOUT = 5_000; // max wait for another tab

const refreshChannel: BroadcastChannel | null =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("aria-auth-refresh")
    : null;

interface CrossTabWaiter {
  resolve: (t: TokenPair) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}
let crossTabWaiters: CrossTabWaiter[] = [];

function flushWaiters(tokens?: TokenPair): void {
  const waiters = crossTabWaiters;
  crossTabWaiters = [];
  for (const w of waiters) {
    clearTimeout(w.timer);
    if (tokens) w.resolve(tokens);
    else w.reject(new Error("Refresh failed in another tab"));
  }
}

refreshChannel?.addEventListener("message", (event) => {
  const msg = event.data as {
    type: string;
    accessToken?: string;
    refreshToken?: string;
  };
  if (msg.type === "refresh-ok" && msg.accessToken && msg.refreshToken) {
    useAuthStore
      .getState()
      .setTokens(msg.accessToken, msg.refreshToken);
    flushWaiters({ accessToken: msg.accessToken, refreshToken: msg.refreshToken });
  } else if (msg.type === "refresh-fail") {
    flushWaiters();
  }
});

/* ── Single in-flight guard (per tab) ── */

let refreshPromise: Promise<TokenPair> | null = null;

/**
 * Refresh the token pair. Safe to call from anywhere — handles
 * both in-tab dedup and cross-tab coordination.
 */
export async function refreshAuthTokens(): Promise<TokenPair> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = attemptRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function attemptRefresh(): Promise<TokenPair> {
  const { refreshToken } = readTokens();
  if (!refreshToken) throw new Error("No refresh token");

  // If another tab is actively refreshing, wait for its result
  const lockRaw = localStorage.getItem(REFRESH_LOCK_KEY);
  if (lockRaw) {
    const elapsed = Date.now() - Number(lockRaw);
    if (elapsed >= 0 && elapsed < REFRESH_LOCK_TTL) {
      return new Promise<TokenPair>((resolve, reject) => {
        const timer = setTimeout(() => {
          // Other tab probably crashed — try ourselves
          crossTabWaiters = crossTabWaiters.filter((w) => w.timer !== timer);
          executeRefresh().then(resolve, reject);
        }, CROSS_TAB_TIMEOUT);
        crossTabWaiters.push({ resolve, reject, timer });
      });
    }
  }

  return executeRefresh();
}

async function executeRefresh(): Promise<TokenPair> {
  // Re-read tokens right before the call (storage-sync may have updated them)
  const { refreshToken } = readTokens();
  if (!refreshToken) throw new Error("No refresh token");

  localStorage.setItem(REFRESH_LOCK_KEY, String(Date.now()));

  const url = new URL(`${BASE_URL}/api/users/refresh`, window.location.origin);

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearAuth();
      }
      throw new ApiError(
        res.status,
        res.status === 401 || res.status === 403
          ? "Session expired"
          : "Token refresh failed",
      );
    }

    const envelope = (await res.json()) as { data: TokenPair };
    const tokens = envelope.data;
    useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);

    // Notify other tabs
    refreshChannel?.postMessage({
      type: "refresh-ok",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });

    return tokens;
  } catch (err) {
    refreshChannel?.postMessage({ type: "refresh-fail" });
    throw err;
  } finally {
    localStorage.removeItem(REFRESH_LOCK_KEY);
  }
}

function isPublicEndpoint(endpoint: string): boolean {
  return PUBLIC_ENDPOINTS.some((p) => endpoint.startsWith(p));
}

/* ── Core request function ── */

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
  _isRetry = false,
): Promise<T> {
  const { body, params, headers: customHeaders, ...rest } = options;

  const url = new URL(`${BASE_URL}${endpoint}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  // Let the browser set Content-Type (with boundary) for FormData
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
  };

  /* Inject auth header for non-public endpoints */
  if (!isPublicEndpoint(endpoint)) {
    const { accessToken } = readTokens();
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    /* Inject org context header when in org mode */
    const orgId = readActiveOrgId();
    if (orgId) {
      headers["X-Organization-ID"] = orgId;
    }
  }

  if (customHeaders instanceof Headers) {
    customHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (customHeaders && !Array.isArray(customHeaders)) {
    Object.assign(headers, customHeaders);
  }

  const response = await fetch(url.toString(), {
    headers,
    body: isFormData
      ? (body as FormData)
      : body
        ? JSON.stringify(body)
        : undefined,
    ...rest,
  });

  /* ── 401 → attempt silent refresh then retry once ── */
  if (response.status === 401 && !_isRetry && !isPublicEndpoint(endpoint)) {
    try {
      await refreshAuthTokens();
      return request<T>(endpoint, options, true);
    } catch {
      clearAuth();
      throw new ApiError(401, "Session expired — please log in again");
    }
  }

  if (!response.ok) {
    let message = "Unknown error";
    try {
      const body = await response.json();
      if (body?.error?.message) {
        message = body.error.message;
      } else if (typeof body?.message === "string") {
        message = body.message;
      }
    } catch {
      message = await response.text().catch(() => "Unknown error");
    }
    throw new ApiError(response.status, message);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * Typed API client.
 *
 * - Auto-injects Bearer token for protected routes.
 * - On 401 → silently refreshes tokens → retries once.
 * - Supports JSON bodies and FormData (multipart uploads).
 *
 * Usage:
 *   const users = await api.get<User[]>("/users");
 *   await api.post("/users", { body: { name: "Luca" } });
 *   await api.post("/upload", { body: formData });
 */
export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "POST" }),

  put: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "PUT" }),

  patch: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "PATCH" }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

export { ApiError };

/** Extract a human-readable message from any thrown value. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}
