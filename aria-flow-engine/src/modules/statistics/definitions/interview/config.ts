import { StatisticsDefinition } from '../../types';
import { interviewSummaryConfig } from '@modules/summaries';
import { InterviewStatisticsDataSchema } from './schema';
import { interviewAggregator } from './aggregator';

/** Type ID owned by this definition. */
export const INTERVIEW_STATISTICS_ID = 'interview';

export const interviewStatisticsConfig: StatisticsDefinition = {
  id: INTERVIEW_STATISTICS_ID,
  name: 'Interview Statistics',
  description:
    'Aggregated metrics across all interview summaries for an agent, including per-section score distributions, skill averages, and top strengths/weaknesses.',
  requiredSummaryTypeId: interviewSummaryConfig.id,
  aggregate: interviewAggregator,
  outputSchema: InterviewStatisticsDataSchema,
};
