import { StatisticsDefinition } from '../../types';
import { SSA_SUMMARY_ID } from '@modules/summaries';
import { SSAStatisticsDataSchema } from './schema';
import { ssaAggregator } from './aggregator';

/** Type ID owned by this definition. */
export const SSA_STATISTICS_ID = 'softSkillAssessment';

export const ssaStatisticsConfig: StatisticsDefinition = {
  id: SSA_STATISTICS_ID,
  name: 'Soft Skill Assessment Statistics',
  description:
    'Aggregated metrics across all soft skill assessment summaries for an agent, including per-section score distributions, skill-specific averages, and top strengths/weaknesses.',
  requiredSummaryTypeId: SSA_SUMMARY_ID,
  aggregate: ssaAggregator,
  outputSchema: SSAStatisticsDataSchema,
};
