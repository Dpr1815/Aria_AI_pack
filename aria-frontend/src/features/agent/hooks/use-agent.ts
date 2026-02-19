/* ─────────────────────────────────────────────────────────
 * useAgent — TanStack Query wrapper for GET /agents/:id
 *
 * Fetches the agent with all sparse fieldsets expanded
 * (steps, prompts, assessment) for the config page.
 * ───────────────────────────────────────────────────────── */

import { useQuery } from "@tanstack/react-query";
import { agentApi } from "../api";

/** Query key factory for agent-related queries. */
export const agentKeys = {
  all: ["agents"] as const,
  detail: (id: string) => [...agentKeys.all, id] as const,
  config: (id: string) => [...agentKeys.detail(id), "config"] as const,
};

/**
 * Fetch a single agent with full config (steps, prompts, assessment).
 */
export function useAgent(agentId: string) {
  return useQuery({
    queryKey: agentKeys.config(agentId),
    queryFn: () =>
      agentApi.getById(agentId, { include: ["all"], collapse: true }),
    enabled: !!agentId,
    staleTime: 30_000,
  });
}
