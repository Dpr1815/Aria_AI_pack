/**
 * AI Response Validations
 *
 * Zod schemas for validating AI/LLM responses.
 * Used with OpenAI's JSON mode (response_format: { type: "json_object" }).
 *
 * DESIGN:
 * - The LLM returns { text: string, action: string }.
 * - Action is a flat string key, not an object.
 * - Empty action string is normalized to undefined.
 * - The action registry is the single source of truth for valid action types.
 */

import { z } from 'zod';
import type { AIResponse } from '../types/conversation.types';
import { isActionRegistered } from '../services/conversation/actions/registry';

// ============================================
// AI Response Schema
// ============================================

/**
 * Raw schema matching what the LLM returns.
 * Action is a string that can be empty.
 */
const RawAIResponseSchema = z.object({
  text: z.string().min(1, 'AI response text is required'),
  action: z.string().optional(),
});

// ============================================
// Parsing
// ============================================

/**
 * Parse raw LLM output into AIResponse.
 * Normalizes empty action strings to undefined.
 */
function normalize(raw: z.infer<typeof RawAIResponseSchema>): AIResponse {
  const action = raw.action?.trim();
  return {
    text: raw.text,
    action: action || undefined, // empty string → undefined
  };
}

/**
 * Parse and validate AI response.
 */
export function parseAIResponse(data: unknown): AIResponse {
  const raw = RawAIResponseSchema.parse(data);
  return normalize(raw);
}

/**
 * Safely parse AI response.
 */
export function safeParseAIResponse(
  data: unknown
): { success: true; data: AIResponse } | { success: false; error: z.ZodError } {
  const result = RawAIResponseSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: normalize(result.data) };
  }
  return { success: false, error: result.error };
}

/**
 * Parse AI response from JSON string.
 */
export function parseAIResponseFromString(jsonString: string): AIResponse {
  try {
    const data = JSON.parse(jsonString);
    return parseAIResponse(data);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in AI response: ${error.message}`);
    }
    throw error;
  }
}

// ============================================
// Summary Section Schemas
// ============================================

export const SectionResultSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  analysis: z.string(),
  highlights: z.array(z.string()).optional(),
  concerns: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
});

export type SectionResultInput = z.infer<typeof SectionResultSchema>;

export const AssessmentSectionSchema = z.object({
  score: z.number().min(0).max(100),
  analysis: z.string(),
  technicalSkills: z.array(z.string()).optional(),
  codeQuality: z.string().optional(),
  problemSolving: z.string().optional(),
});

export type AssessmentSectionInput = z.infer<typeof AssessmentSectionSchema>;

export const BehavioralSectionSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  analysis: z.string(),
  strengths: z.array(z.string()).optional(),
  areasForImprovement: z.array(z.string()).optional(),
  communicationStyle: z.string().optional(),
});

export type BehavioralSectionInput = z.infer<typeof BehavioralSectionSchema>;

export const TimeAnalysisSectionSchema = z.object({
  averageResponseTime: z.number(),
  totalDuration: z.number(),
  analysis: z.string(),
  breakdown: z.record(z.string(), z.number()).optional(),
});

export type TimeAnalysisSectionInput = z.infer<typeof TimeAnalysisSectionSchema>;

export const FinalSummarySectionSchema = z.object({
  overallScore: z.number().min(0).max(100),
  summary: z.string(),
  recommendation: z.enum(['strong_yes', 'yes', 'maybe', 'no', 'strong_no']).optional(),
  keyTakeaways: z.array(z.string()).optional(),
});

export type FinalSummarySectionInput = z.infer<typeof FinalSummarySectionSchema>;

export const SummarySchema = z.object({
  sections: z.record(z.string(), SectionResultSchema),
  overallScore: z.number().min(0).max(100).optional(),
  generatedAt: z.string().datetime().optional(),
});

export type SummaryInput = z.infer<typeof SummarySchema>;

/**
 * Parse complete summary.
 */
export function parseSummary(data: unknown): SummaryInput {
  return SummarySchema.parse(data);
}

// ============================================
// Type Guards
// ============================================

export function hasAction(response: AIResponse): response is AIResponse & { action: string } {
  return !!response.action;
}

export { isActionRegistered };

// ============================================
// Error Formatting
// ============================================

export function formatAIValidationError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `[${path || 'root'}] ${issue.message}`;
  });
  return `AI Response Validation Failed:\n${issues.join('\n')}`;
}
