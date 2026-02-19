import { useQuery } from "@tanstack/react-query";
import { agentApi } from "../api";
import type { SummaryTypeDTO, StatisticsTypeDTO } from "../types";
import type { CatalogOption } from "@/components/ui/catalog-select";
import type { VoiceDTO } from "../api/agent.api";

/**
 * Fetches available conversation types (step categories).
 * BE returns string[], mapped to CatalogOption[] for CatalogSelect.
 */
export function useConversationTypes() {
  return useQuery<CatalogOption[]>({
    queryKey: ["catalog", "conversation-types"],
    queryFn: async () => {
      const ids = await agentApi.getConversationTypes();
      return ids.map((id) => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        description: `${id} conversation type`,
      }));
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetches summary types compatible with the given conversation type.
 * Disabled until a conversationTypeId is selected (same pattern as statistics).
 */
export function useSummaryTypes(conversationTypeId: string | undefined) {
  return useQuery<SummaryTypeDTO[]>({
    queryKey: ["catalog", "summary-types", conversationTypeId],
    queryFn: () =>
      agentApi.getSummaryTypesByConversationType(conversationTypeId!),
    enabled: !!conversationTypeId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useStatisticsTypes(summaryTypeId: string | undefined) {
  return useQuery<StatisticsTypeDTO[]>({
    queryKey: ["catalog", "statistics-types", summaryTypeId],
    queryFn: () => agentApi.getStatisticsTypes(summaryTypeId!),
    enabled: !!summaryTypeId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetches available conversation languages for the given category.
 * Disabled until a conversationTypeId is selected (cascading pattern).
 */
export function useLanguages(conversationTypeId: string | undefined) {
  return useQuery<CatalogOption[]>({
    queryKey: ["catalog", "languages", conversationTypeId],
    queryFn: async () => {
      const languages = await agentApi.getLanguages(conversationTypeId!);
      return languages.map((code) => ({
        id: code,
        name: code,
        description: code,
      }));
    },
    enabled: !!conversationTypeId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetches available TTS voices for the given language code.
 * Disabled until a languageCode is selected (cascading pattern).
 */
export function useVoices(languageCode: string | undefined) {
  return useQuery<CatalogOption[]>({
    queryKey: ["catalog", "voices", languageCode],
    queryFn: async () => {
      const voices = await agentApi.getVoices(languageCode!);
      return voices.map((v: VoiceDTO) => ({
        id: v.name,
        name: v.name,
        description: v.gender,
      }));
    },
    enabled: !!languageCode,
    staleTime: 10 * 60 * 1000,
  });
}
