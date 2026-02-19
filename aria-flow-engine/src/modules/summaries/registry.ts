/**
 * Summary Registry
 *
 * Central registry for all summary types.
 *
 * Adding a new summary type:
 *   1. Create definition + schemas under definitions/<your-type>/
 *   2. Register it here
 *   3. Add prompt templates to prompts/templates/summary/
 *   4. Done — SummaryService handles the rest
 */

import { SummaryDefinition, SummaryRegistryEntry } from './types';
import { INTERVIEW_SUMMARY_ID, interviewSummaryConfig } from './definitions/interview';
import { LD_SUMMARY_ID, ldSummaryConfig } from './definitions/learningDevelopment';
import { SummaryTypeDTO } from '@models';
import { NotFoundError } from '../../utils/errors';

// ============================================
// REGISTRY
// ============================================

const summaryRegistry: Record<string, SummaryRegistryEntry> = {
  [INTERVIEW_SUMMARY_ID]: {
    config: interviewSummaryConfig,
  },
  [LD_SUMMARY_ID]: {
    config: ldSummaryConfig,
  },
};

// ============================================
// TYPE IDS (re-exported for external consumers)
// ============================================

export { INTERVIEW_SUMMARY_ID } from './definitions/interview';
export { LD_SUMMARY_ID } from './definitions/learningDevelopment';

// ============================================
// ACCESSORS
// ============================================

export const getSummaryType = (typeId: string): SummaryRegistryEntry | undefined => {
  return summaryRegistry[typeId];
};

export const getSummaryTypeOrThrow = (typeId: string): SummaryRegistryEntry => {
  const summaryType = summaryRegistry[typeId];
  if (!summaryType) {
    throw new NotFoundError('SummaryType', typeId);
  }
  return summaryType;
};

export const getSummaryConfig = (typeId: string): SummaryDefinition => {
  return getSummaryTypeOrThrow(typeId).config;
};

export const getAllSummaryTypeIds = (): string[] => {
  return Object.keys(summaryRegistry);
};

export const isSummaryTypeRegistered = (typeId: string): boolean => {
  return typeId in summaryRegistry;
};

/**
 * Validate final summary data against the type's output schema.
 */
export const validateSummaryData = (typeId: string, data: unknown): boolean => {
  const summaryType = getSummaryType(typeId);
  if (!summaryType) return false;
  return summaryType.config.outputSchema.safeParse(data).success;
};

/**
 * Parse and validate final summary data, throwing on failure.
 */
export const parseSummaryData = <T>(typeId: string, data: unknown): T => {
  const config = getSummaryConfig(typeId);
  return config.outputSchema.parse(data) as T;
};

export function getSummaryTypes(): SummaryTypeDTO[] {
  return Object.values(summaryRegistry).map((def) => ({
    id: def.config.id,
    name: def.config.name,
    description: def.config.description,
    compatibleConversationTypes: def.config.compatibleConversationTypes,
  }));
}

/**
 * Get summary types compatible with a specific conversation type (step category).
 */
export function getSummaryTypesByConversationType(conversationType: string): SummaryTypeDTO[] {
  return Object.values(summaryRegistry)
    .filter((def) => def.config.compatibleConversationTypes.includes(conversationType))
    .map((def) => ({
      id: def.config.id,
      name: def.config.name,
      description: def.config.description,
      compatibleConversationTypes: def.config.compatibleConversationTypes,
    }));
}
