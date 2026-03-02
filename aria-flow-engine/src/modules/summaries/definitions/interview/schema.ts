import { z } from 'zod';

// ============================================
// PER-SECTION SCHEMAS (match prompt outputs)
// ============================================

export const BackgroundSectionSchema = z.object({
  score: z.number().min(0).max(10),
  yearsOfExperience: z.number(),
  relevanceToRole: z.number().min(0).max(10),
  keyHighlights: z.array(z.string()),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
});

export const BehavioralSectionSchema = z.object({
  score: z.number().min(0).max(10),
  culturalFitScore: z.number().min(0).max(10),
  communicationScore: z.number().min(0).max(10),
  teamworkScore: z.number().min(0).max(10),
  keyObservations: z.array(z.string()),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
});

export const AssessmentSectionSchema = z.object({
  candidateScore: z.number().min(0).max(10),
  skillsAssessment: z.record(z.string(), z.number().min(0).max(10)),
  testResults: z.string(),
  problemSolvingScore: z.number().min(0).max(10),
  strengths: z.string(),
  areasForImprovement: z.string(),
});

export const LinguisticSectionSchema = z.object({
  candidateScore: z.number().min(0).max(10),
  skillsAssessment: z.object({
    listening: z.number().min(0).max(10),
    comprehension: z.number().min(0).max(10),
    grammarAndVocabulary: z.number().min(0).max(10),
  }),
  testResults: z.string(),
  strengths: z.string(),
  areasForImprovement: z.string(),
});

export const WorkplaceSafetySectionSchema = z.object({
  score: z.number().min(0).max(10),
  yearsOfExperience: z.number(),
  relevanceToRole: z.number().min(0).max(10),
  keyHighlights: z.array(z.string()),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
});

export const ScenarioSectionSchema = z.object({
  candidateScore: z.number().min(0).max(10),
  skillsAssessment: z.record(z.string(), z.number().min(0).max(10)),
  testResults: z.string(),
  professionality: z.number().min(0).max(10),
  strengths: z.string(),
  areasForImprovement: z.string(),
});

export const TimeAnalysisSchema = z.object({
  averageResponseTime: z.number(),
  responseConsistency: z.number().min(0).max(10),
  engagementLevel: z.number().min(0).max(10),
  notableResponses: z.array(
    z.object({
      content: z.string(),
      insight: z.string(),
    })
  ),
});

export const IsAiCodeSchema = z.object({
  score: z.number().min(0).max(100),
});

// ============================================
// FINAL SUMMARY SCHEMA (complete output including sections)
// ============================================

export const InterviewSummaryDataSchema = z.object({
  overallEvaluation: z.string(),
  nextSteps: z.array(z.string()),
  sections: z.object({
    background: BackgroundSectionSchema.optional(),
    work: ScenarioSectionSchema.optional(),
    assessment: AssessmentSectionSchema.optional(),
    behavioral: BehavioralSectionSchema.optional(),
    linguisticTest: LinguisticSectionSchema.optional(),
    workplaceSafety: WorkplaceSafetySectionSchema.optional(),
  }),
  timeAnalysis: TimeAnalysisSchema.optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type BackgroundSectionData = z.infer<typeof BackgroundSectionSchema>;
export type BehavioralSectionData = z.infer<typeof BehavioralSectionSchema>;
export type AssessmentSectionData = z.infer<typeof AssessmentSectionSchema>;
export type LinguisticSectionData = z.infer<typeof LinguisticSectionSchema>;
export type WorkplaceSafetySectionData = z.infer<typeof WorkplaceSafetySectionSchema>;
export type ScenarioSectionData = z.infer<typeof ScenarioSectionSchema>;
export type TimeAnalysis = z.infer<typeof TimeAnalysisSchema>;
export type IsAiCodeData = z.infer<typeof IsAiCodeSchema>;
export type InterviewSummaryData = z.infer<typeof InterviewSummaryDataSchema>;
