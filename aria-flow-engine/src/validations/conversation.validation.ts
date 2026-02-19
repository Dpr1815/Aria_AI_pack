import { z } from 'zod';

// ============================================
// CONSTANTS
// ============================================

export const MessageRoleEnum = z.enum(['user', 'assistant', 'system']);

// ============================================
// PARAM SCHEMAS
// ============================================

export const ConversationIdParamSchema = z.object({
  id: z.string().min(1, 'Conversation ID is required'),
});

export const ConversationBySessionParamSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

// ============================================
// EMBEDDED SCHEMAS
// ============================================

/**
 * Token count for cost tracking
 */
export const TokenCountSchema = z.object({
  input: z.number().int().nonnegative(),
  output: z.number().int().nonnegative(),
});

/**
 * Message entry (embedded in conversation)
 */
export const MessageEntrySchema = z.object({
  sequence: z.number().int().nonnegative(),
  stepKey: z.string().min(1),
  role: MessageRoleEnum,
  content: z.string(),
  tokenCount: TokenCountSchema.optional(),
  promptKey: z.string().optional(),
  action: z.string().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  createdAt: z.coerce.date(),
});

// ============================================
// INTERNAL SCHEMAS (used by WS engine)
// ============================================

/**
 * Add message input (used by WS engine, not exposed via REST)
 */
export const AddMessageSchema = z.object({
  stepKey: z.string().min(1, 'Step key is required'),
  role: MessageRoleEnum,
  content: z.string().min(1, 'Content is required'),
  tokenCount: TokenCountSchema.optional(),
  promptKey: z.string().optional(),
  action: z.string().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
});

// ============================================
// QUERY SCHEMAS
// ============================================

/**
 * Query conversations (for admin/analytics)
 */
export const ConversationQuerySchema = z.object({
  agentId: z.string().optional(),
  participantId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * Message filter options (for filtering messages by role)
 * Usage: ?includeRoles=user&includeRoles=assistant
 */
export const MessageFilterSchema = z.object({
  includeRoles: z
    .union([MessageRoleEnum, z.array(MessageRoleEnum)])
    .optional()
    .transform((val) => (val ? (Array.isArray(val) ? val : [val]) : undefined)),
});

// ============================================
// INFERRED TYPES
// ============================================

export type MessageRole = z.infer<typeof MessageRoleEnum>;
export type TokenCount = z.infer<typeof TokenCountSchema>;
export type MessageEntry = z.infer<typeof MessageEntrySchema>;
export type AddMessageInput = z.infer<typeof AddMessageSchema>;
export type ConversationQueryInput = z.infer<typeof ConversationQuerySchema>;
export type MessageFilterOptions = z.infer<typeof MessageFilterSchema>;
