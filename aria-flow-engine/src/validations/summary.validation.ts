import { z } from 'zod';

// ============================================
// INPUT SCHEMAS
// ============================================

export const GenerateSummarySchema = z.object({
  options: z
    .object({
      includeSections: z.array(z.string()).optional(),
      excludeSections: z.array(z.string()).optional(),
      language: z.string().optional(),
    })
    .optional(),
});

// ============================================
// QUERY SCHEMAS
// ============================================

export const SummaryQuerySchema = z.object({
  agentId: z.string().optional(),
  participantId: z.string().optional(),
  typeId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * Query schema for agent-scoped summaries
 * GET /agents/:id/summaries
 */
export const SummaryByAgentQuerySchema = z.object({
  typeId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================
// PARAM SCHEMAS
// ============================================

export const SummaryIdParamSchema = z.object({
  id: z.string().min(1, 'Summary ID is required'),
});

export const SessionSummaryParamSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type GenerateSummaryInput = z.infer<typeof GenerateSummarySchema>;
export type SummaryQueryInput = z.infer<typeof SummaryQuerySchema>;
export type SummaryByAgentQueryInput = z.infer<typeof SummaryByAgentQuerySchema>;
