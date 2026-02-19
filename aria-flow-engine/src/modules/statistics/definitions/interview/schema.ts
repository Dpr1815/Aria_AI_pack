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

export const BackgroundAggregateSchema = z.object({
  averageScore: z.number(),
  scoreDistribution: ScoreDistributionSchema,
  averageRelevanceToRole: z.number(),
  averageYearsOfExperience: z.number(),
  topStrengths: z.array(FrequencyItemSchema),
  topAreasForImprovement: z.array(FrequencyItemSchema),
});

export const BehavioralAggregateSchema = z.object({
  averageScore: z.number(),
  scoreDistribution: ScoreDistributionSchema,
  averageCulturalFitScore: z.number(),
  averageCommunicationScore: z.number(),
  averageTeamworkScore: z.number(),
  topStrengths: z.array(FrequencyItemSchema),
  topAreasForImprovement: z.array(FrequencyItemSchema),
});

export const AssessmentAggregateSchema = z.object({
  averageScore: z.number(),
  scoreDistribution: ScoreDistributionSchema,
  averageProblemSolvingScore: z.number(),
});

export const LinguisticAggregateSchema = z.object({
  averageScore: z.number(),
  scoreDistribution: ScoreDistributionSchema,
  averageListening: z.number(),
  averageComprehension: z.number(),
  averageGrammarAndVocabulary: z.number(),
});

export const WorkplaceSafetyAggregateSchema = z.object({
  averageScore: z.number(),
  scoreDistribution: ScoreDistributionSchema,
  averageRelevanceToRole: z.number(),
  topStrengths: z.array(FrequencyItemSchema),
  topAreasForImprovement: z.array(FrequencyItemSchema),
});

export const ScenarioAggregateSchema = z.object({
  averageScore: z.number(),
  scoreDistribution: ScoreDistributionSchema,
  averageProfessionality: z.number(),
});

// ============================================
// FINAL AGGREGATED OUTPUT
// ============================================

export const InterviewStatisticsDataSchema = z.object({
  totalSummariesAnalyzed: z.number(),
  sections: z.object({
    background: BackgroundAggregateSchema.optional(),
    behavioral: BehavioralAggregateSchema.optional(),
    assessment: AssessmentAggregateSchema.optional(),
    linguistic: LinguisticAggregateSchema.optional(),
    workplaceSafety: WorkplaceSafetyAggregateSchema.optional(),
    work: ScenarioAggregateSchema.optional(),
  }),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type ScoreDistribution = z.infer<typeof ScoreDistributionSchema>;
export type FrequencyItem = z.infer<typeof FrequencyItemSchema>;
export type InterviewStatisticsData = z.infer<typeof InterviewStatisticsDataSchema>;
