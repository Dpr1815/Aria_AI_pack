/* ─────────────────────────────────────────────────────────
 * useAgents — TanStack Query wrapper for GET /agents
 *
 * Fetches a paginated list of agents owned by the current user.
 * ───────────────────────────────────────────────────────── */

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { agentApi } from "../api";
import { agentKeys } from "./use-agent";

export function useAgents(page = 1, limit = 20) {
  return useQuery({
    queryKey: [...agentKeys.all, { page, limit }] as const,
    queryFn: () => agentApi.list({ page, limit }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
