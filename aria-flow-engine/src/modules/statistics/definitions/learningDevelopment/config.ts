import { StatisticsDefinition } from '../../types';
import { LD_SUMMARY_ID } from '@modules/summaries';
import { LDStatisticsDataSchema } from './schema';
import { ldAggregator } from './aggregator';

/** Type ID owned by this definition. */
export const LD_STATISTICS_ID = 'learningDevelopment';

export const ldStatisticsConfig: StatisticsDefinition = {
  id: LD_STATISTICS_ID,
  name: 'Learning & Development Statistics',
  description:
    'Aggregated metrics across all L&D summaries for an agent, including per-section score distributions, comprehension averages, and top strengths/weaknesses.',
  requiredSummaryTypeId: LD_SUMMARY_ID,
  aggregate: ldAggregator,
  outputSchema: LDStatisticsDataSchema,
};
