import { z } from 'zod';

// ============================================
// SHARED PRIMITIVES
// ============================================

const ScoreDistributionSchema = z.object({
  min: z.number(),
  max: z.number(),
  average: z.number(),
  median: z.number(),
});

const FrequencyItemSchema = z.object({
  value: z.string(),
  count: z.number(),
});

// ============================================
// PER-SECTION AGGREGATE SCHEMAS
// ============================================

export const KnowledgeTransferAggregateSchema = z.object({
  averageScore: z.number(),
  scoreDistribution: ScoreDistributionSchema,
  averageComprehensionScore: z.number(),
  topStrengths: z.array(FrequencyItemSchema),
  topAreasForImprovement: z.array(FrequencyItemSchema),
});

export const PracticalApplicationAggregateSchema = z.object({
  averageScore: z.number(),
  scoreDistribution: ScoreDistributionSchema,
  averageScenarioPerformance: z.number(),
  averageProblemSolvingScore: z.number(),
  topStrengths: z.array(FrequencyItemSchema),
  topAreasForImprovement: z.array(FrequencyItemSchema),
});

// ============================================
// FINAL AGGREGATED OUTPUT
// ============================================

export const LDStatisticsDataSchema = z.object({
  totalSummariesAnalyzed: z.number(),
  sections: z.object({
    knowledgeTransfer: KnowledgeTransferAggregateSchema.optional(),
    practicalApplication: PracticalApplicationAggregateSchema.optional(),
  }),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type ScoreDistribution = z.infer<typeof ScoreDistributionSchema>;
export type FrequencyItem = z.infer<typeof FrequencyItemSchema>;
export type LDStatisticsData = z.infer<typeof LDStatisticsDataSchema>;
