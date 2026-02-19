import { useQuery } from "@tanstack/react-query";
import { agentApi } from "../api";
import type { StepType } from "../types/agent.types";

export function useStepTypes(categoryId: string | undefined) {
  return useQuery<StepType[]>({
    queryKey: ["step-types", categoryId],
    queryFn: () => agentApi.getStepTypes(categoryId!),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000, // catalog rarely changes
  });
}
