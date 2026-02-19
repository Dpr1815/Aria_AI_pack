import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { agentApi } from "../api";
import { agentKeys } from "./use-agent";
import type { GenerateAgentPayload } from "../types";

export function useGenerateAgent() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: GenerateAgentPayload) => agentApi.generate(payload),
    onSuccess: (agent) => {
      qc.invalidateQueries({ queryKey: agentKeys.all });
      navigate({ to: "/agents/$agentId/config", params: { agentId: agent._id } });
    },
  });
}
