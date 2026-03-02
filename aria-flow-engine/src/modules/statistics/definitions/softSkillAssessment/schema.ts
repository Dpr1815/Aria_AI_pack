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

export const RolePlayAggregateSchema = z.object({
  averageScore: z.number(),
  scoreDistribution: ScoreDistributionSchema,
  averageTurningPointHandling: z.number(),
  topStrengths: z.array(FrequencyItemSchema),
  topAreasForImprovement: z.array(FrequencyItemSchema),
});

export const ScenarioQuestionsAggregateSchema = z.object({
  averageScore: z.number(),
  scoreDistribution: ScoreDistributionSchema,
  averageSituationalAwareness: z.number(),
  topStrengths: z.array(FrequencyItemSchema),
  topAreasForImprovement: z.array(FrequencyItemSchema),
});

export const OpenQuestionsAggregateSchema = z.object({
  averageScore: z.number(),
  scoreDistribution: ScoreDistributionSchema,
  averageSelfAwareness: z.number(),
  topStrengths: z.array(FrequencyItemSchema),
  topAreasForImprovement: z.array(FrequencyItemSchema),
});

// ============================================
// FINAL AGGREGATED OUTPUT
// ============================================

export const SSAStatisticsDataSchema = z.object({
  totalSummariesAnalyzed: z.number(),
  sections: z.object({
    ssaRolePlay: RolePlayAggregateSchema.optional(),
    ssaScenarioQuestions: ScenarioQuestionsAggregateSchema.optional(),
    ssaOpenQuestions: OpenQuestionsAggregateSchema.optional(),
  }),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type ScoreDistribution = z.infer<typeof ScoreDistributionSchema>;
export type FrequencyItem = z.infer<typeof FrequencyItemSchema>;
export type SSAStatisticsData = z.infer<typeof SSAStatisticsDataSchema>;
