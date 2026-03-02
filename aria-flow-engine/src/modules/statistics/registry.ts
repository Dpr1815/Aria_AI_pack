/**
 * Statistics Registry
 *
 * Central registry for all statistics types.
 *
 * Adding a new statistics type:
 *   1. Create a folder under definitions/<your-type>/ with:
 *      - config.ts  (exports its own ID + StatisticsDefinition)
 *      - aggregator.ts (pure function)
 *      - schema.ts (Zod output validation)
 *      - index.ts (barrel)
 *   2. Export from definitions/index.ts
 *   3. Register it below (one line)
 *   4. Done — StatisticsService handles the rest
 */

import { AggregatorInput, StatisticsDefinition, StatisticsRegistryEntry } from './types';
import { INTERVIEW_STATISTICS_ID, interviewStatisticsConfig, LD_STATISTICS_ID, ldStatisticsConfig, SSA_STATISTICS_ID, ssaStatisticsConfig } from './definitions';
import { StatisticsTypeDTO } from '@models';
import { NotFoundError } from '../../utils/errors';

// ============================================
// REGISTRY
// ============================================

const statisticsRegistry: Record<string, StatisticsRegistryEntry> = {
  [INTERVIEW_STATISTICS_ID]: {
    config: interviewStatisticsConfig,
  },
  [LD_STATISTICS_ID]: {
    config: ldStatisticsConfig,
  },
  [SSA_STATISTICS_ID]: {
    config: ssaStatisticsConfig,
  },
};

// ============================================
// TYPE IDS (re-exported for external consumers)
// ============================================

export { INTERVIEW_STATISTICS_ID } from './definitions';
export { LD_STATISTICS_ID } from './definitions';
export { SSA_STATISTICS_ID } from './definitions';

/**
 * Default statistics type ID used when an agent has no explicit statisticsTypeId.
 */
export const DEFAULT_STATISTICS_TYPE_ID = INTERVIEW_STATISTICS_ID;

// ============================================
// ACCESSORS
// ============================================

export const getStatisticsType = (typeId: string): StatisticsRegistryEntry | undefined => {
  return statisticsRegistry[typeId];
};

export const getStatisticsTypeOrThrow = (typeId: string): StatisticsRegistryEntry => {
  const statisticsType = statisticsRegistry[typeId];
  if (!statisticsType) {
    throw new NotFoundError('StatisticsType', typeId);
  }
  return statisticsType;
};

export const getStatisticsConfig = (typeId: string): StatisticsDefinition => {
  return getStatisticsTypeOrThrow(typeId).config;
};

export const getAllStatisticsTypeIds = (): string[] => {
  return Object.keys(statisticsRegistry);
};

export const isStatisticsTypeRegistered = (typeId: string): boolean => {
  return typeId in statisticsRegistry;
};

/**
 * Run the aggregator for a given statistics type.
 * Validates the output against the type's schema before returning.
 */
export const aggregateStatistics = (
  typeId: string,
  input: AggregatorInput
): Record<string, unknown> => {
  const config = getStatisticsConfig(typeId);
  const result = config.aggregate(input);
  return config.outputSchema.parse(result);
};

/**
 * Validate statistics data against the type's output schema.
 */
export const validateStatisticsData = (typeId: string, data: unknown): boolean => {
  const statisticsType = getStatisticsType(typeId);
  if (!statisticsType) return false;
  return statisticsType.config.outputSchema.safeParse(data).success;
};
/**
 * Get all registered statistics types as public DTOs
 */
export function getStatisticsTypes(): StatisticsTypeDTO[] {
  return Object.values(statisticsRegistry).map((def) => ({
    id: def.config.id,
    name: def.config.name,
    description: def.config.description,
    requiredSummaryTypeId: def.config.requiredSummaryTypeId,
  }));
}
/**
 * Get statistics types that consume a specific summary type
 */
export function getStatisticsTypesBySummaryId(summaryTypeId: string): StatisticsTypeDTO[] {
  return Object.values(statisticsRegistry)
    .filter((def) => def.config.requiredSummaryTypeId === summaryTypeId)
    .map((def) => ({
      id: def.config.id,
      name: def.config.name,
      description: def.config.description,
      requiredSummaryTypeId: def.config.requiredSummaryTypeId,
    }));
}
