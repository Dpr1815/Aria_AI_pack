/* ─────────────────────────────────────────────────────────
 * useAuthRefresh — silent access-token refresh cycle
 *
 * Mount this hook ONCE at the root layout. It will:
 *  1. Immediately attempt a refresh if a refresh token exists.
 *  2. Start an interval that refreshes every 13 min.
 *  3. Clear the interval on unmount.
 *
 * Delegates to `refreshAuthTokens` from api-client, which
 * handles in-tab dedup and cross-tab coordination (prevents
 * multiple tabs from sending the same refresh token).
 * ───────────────────────────────────────────────────────── */

import { useEffect, useRef } from "react";
import { refreshAuthTokens } from "@/lib/api-client";
import { REFRESH_INTERVAL_MS } from "../constants";
import { useAuthStore } from "../stores/auth.store";

export function useAuthRefresh(): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function silentRefresh(): Promise<void> {
      const token = useAuthStore.getState().refreshToken;
      if (!token) return;

      try {
        await refreshAuthTokens();
      } catch {
        /* Don't clear auth here — the api-client 401 interceptor
           handles session expiry with a proper retry-then-clear flow. */
      }
    }

    // Refresh immediately on mount so a stale access token from
    // localStorage is replaced before any API call fires.
    void silentRefresh();

    intervalRef.current = setInterval(silentRefresh, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
