import { z } from 'zod';

// ============================================
// SHARED PRIMITIVES
// ============================================

const SkillScoreSchema = z.object({
  skill: z.string(),
  score: z.number().min(0).max(10),
  evidence: z.string(),
});

// ============================================
// PER-SECTION SCHEMAS (match prompt outputs)
// ============================================

export const RolePlaySectionSchema = z.object({
  score: z.number().min(0).max(10),
  skillScores: z.array(SkillScoreSchema),
  turningPointHandling: z.number().min(0).max(10),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
});

export const ScenarioQuestionsSectionSchema = z.object({
  score: z.number().min(0).max(10),
  skillScores: z.array(SkillScoreSchema),
  situationalAwareness: z.number().min(0).max(10),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
});

export const OpenQuestionsSectionSchema = z.object({
  score: z.number().min(0).max(10),
  skillScores: z.array(SkillScoreSchema),
  selfAwareness: z.number().min(0).max(10),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
});

// ============================================
// FINAL SUMMARY SCHEMA (complete output including sections)
// ============================================

export const SSASummaryDataSchema = z.object({
  overallScore: z.number().min(0).max(10),
  overallEvaluation: z.string(),
  skillScores: z.array(SkillScoreSchema),
  assessmentLevel: z.enum(['insufficient', 'developing', 'competent', 'advanced']),
  keyStrengths: z.array(z.string()),
  developmentAreas: z.array(z.string()),
  recommendations: z.array(z.string()),
  sections: z.object({
    ssaRolePlay: RolePlaySectionSchema.optional(),
    ssaScenarioQuestions: ScenarioQuestionsSectionSchema.optional(),
    ssaOpenQuestions: OpenQuestionsSectionSchema.optional(),
  }),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type SkillScore = z.infer<typeof SkillScoreSchema>;
export type RolePlaySectionData = z.infer<typeof RolePlaySectionSchema>;
export type ScenarioQuestionsSectionData = z.infer<typeof ScenarioQuestionsSectionSchema>;
export type OpenQuestionsSectionData = z.infer<typeof OpenQuestionsSectionSchema>;
export type SSASummaryData = z.infer<typeof SSASummaryDataSchema>;
