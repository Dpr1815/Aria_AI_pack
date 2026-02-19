import { z } from 'zod';

// ============================================
// PER-SECTION SCHEMAS (match prompt outputs)
// ============================================

export const KnowledgeTransferSectionSchema = z.object({
  score: z.number().min(0).max(10),
  comprehensionScore: z.number().min(0).max(10),
  conceptsCovered: z.array(z.string()),
  keyTakeaways: z.array(z.string()),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
});

export const PracticalApplicationSectionSchema = z.object({
  score: z.number().min(0).max(10),
  scenarioPerformance: z.number().min(0).max(10),
  problemSolvingScore: z.number().min(0).max(10),
  skillsDemonstrated: z.array(z.string()),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
});

// ============================================
// FINAL REPORT SCHEMA (matches LD_SUMMARY_MAIN prompt)
// ============================================

export const LDSummaryDataSchema = z.object({
  overallScore: z.number().min(0).max(10),
  overallEvaluation: z.string(),
  knowledgeGainSummary: z.string(),
  readinessLevel: z.enum(['not_ready', 'partially_ready', 'ready']),
  recommendedNextSteps: z.array(z.string()),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type KnowledgeTransferSectionData = z.infer<typeof KnowledgeTransferSectionSchema>;
export type PracticalApplicationSectionData = z.infer<typeof PracticalApplicationSectionSchema>;
export type LDSummaryData = z.infer<typeof LDSummaryDataSchema>;
