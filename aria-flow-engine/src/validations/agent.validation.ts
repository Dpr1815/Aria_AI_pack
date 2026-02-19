import { z } from 'zod';
import { AgentStatus } from '../constants';
import {
  STEP_INPUT_SCHEMAS,
  getAllStepIds,
  getStepDefinition,
  getStepCategories,
  getSummaryConfig,
  getStatisticsConfig,
  isValidStep,
  isReportStep,
  isSubStep,
  getParentStep,
  isFirstPositionStep,
  isLastPositionStep,
  isSummaryTypeRegistered,
  isStatisticsTypeRegistered,
  expandStepOrder,
} from '@modules';

// ============================================
// SHARED SCHEMAS
// ============================================

export const VoiceConfigSchema = z.object({
  languageCode: z.string().min(1, 'Language code is required'),
  name: z.string().min(1, 'Voice name is required'),
  gender: z.enum(['MALE', 'FEMALE', 'NEUTRAL']),
});

export const AgentFeaturesSchema = z.object({
  lipSync: z.boolean().default(false),
  sessionPersistence: z.boolean().default(true),
  autoSummary: z.boolean().default(true),
  videoRecording: z.boolean().default(false),
});

export const PresentationConfigSchema = z.object({
  link: z.string(),
  slides: z.record(z.string(), z.number()).optional(),
});

export const RenderConfigSchema = z.object({
  mode: z.enum(['avatar', 'presentation']),
  presentation: PresentationConfigSchema.optional(),
});

export const StepConfigSchema = z.object({
  label: z.string().min(1, 'Step label is required'),
  description: z.string().optional(),
  order: z.number().int().min(0),
  inputs: z.record(z.string(), z.unknown()).optional(),
  nextStep: z.string().nullable(),
});

export const PromptMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

export const PromptConfigSchema = z.object({
  system: z.string().min(1, 'System prompt is required'),
  model: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().positive(),
  reasoningEffort: z.string().optional(),
  messages: z.array(PromptMessageSchema).optional(),
});

export const AssessmentConfigSchema = z.object({
  testContent: z.string().min(1, 'Test content is required'),
  language: z.string().min(1, 'Language is required'),
  durationSeconds: z.number().int().positive(),
});

// ============================================
// SHARED VALIDATION HELPERS
// ============================================

const conversationTypeIdField = z
  .string()
  .refine((id) => getStepCategories().includes(id), {
    message: 'Unknown conversation type ID',
  })
  .optional();

/**
 * Cross-field compatibility validation for the agent type chain:
 *   conversationTypeId → summaryTypeId → statisticsTypeId
 */
function validateTypeCompatibility(
  data: { conversationTypeId?: string; summaryTypeId?: string; statisticsTypeId?: string },
  ctx: z.RefinementCtx
) {
  // summaryTypeId must be compatible with conversationTypeId
  if (data.summaryTypeId && data.conversationTypeId) {
    const summaryDef = getSummaryConfig(data.summaryTypeId);
    if (!summaryDef.compatibleConversationTypes.includes(data.conversationTypeId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['summaryTypeId'],
        message: `Summary type "${data.summaryTypeId}" is not compatible with conversation type "${data.conversationTypeId}"`,
      });
    }
  }

  // statisticsTypeId must be compatible with summaryTypeId
  if (data.statisticsTypeId && data.summaryTypeId) {
    const statsDef = getStatisticsConfig(data.statisticsTypeId);
    if (statsDef.requiredSummaryTypeId !== data.summaryTypeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['statisticsTypeId'],
        message: `Statistics type "${data.statisticsTypeId}" requires summary type "${statsDef.requiredSummaryTypeId}", but got "${data.summaryTypeId}"`,
      });
    }
  }
}

// ============================================
// AGENT CRUD SCHEMAS
// ============================================

export const CreateAgentSchema = z
  .object({
    label: z.string().min(1, 'Label is required').max(200, 'Label too long'),
    voice: VoiceConfigSchema,
    features: AgentFeaturesSchema.optional(),
    render: RenderConfigSchema,
    steps: z.record(z.string(), StepConfigSchema),
    prompts: z.record(z.string(), PromptConfigSchema),
    assessment: AssessmentConfigSchema.optional(),
    conversationTypeId: conversationTypeIdField,
    summaryTypeId: z
      .string()
      .refine((id) => isSummaryTypeRegistered(id), {
        message: 'Unknown summary type ID',
      })
      .optional(),
    statisticsTypeId: z
      .string()
      .refine((id) => isStatisticsTypeRegistered(id), {
        message: 'Unknown statistics type ID',
      })
      .optional(),
  })
  .superRefine(validateTypeCompatibility);

/**
 * Update agent configuration
 * NOTE: steps, prompts, assessment are managed via dedicated sub-routes:
 * - PATCH /agents/:id/steps/:key
 * - PATCH /agents/:id/prompts/:key
 * - PATCH /agents/:id/assessment
 */

export const UpdateAgentSchema = z
  .object({
    label: z.string().min(1, 'Label is required').max(200, 'Label too long').optional(),
    voice: VoiceConfigSchema.optional(),
    features: AgentFeaturesSchema.partial().optional(),
    render: RenderConfigSchema.optional(),
    conversationTypeId: conversationTypeIdField,
    summaryTypeId: z
      .string()
      .refine((id) => isSummaryTypeRegistered(id), {
        message: 'Unknown summary type ID',
      })
      .optional(),
    statisticsTypeId: z
      .string()
      .refine((id) => isStatisticsTypeRegistered(id), {
        message: 'Unknown statistics type ID',
      })
      .optional(),

    // stepOrder — accepts simplified order, expands automatically
    stepOrder: z
      .array(z.string().min(1))
      .min(1, 'stepOrder must contain at least one step')
      // Block sub-steps in input — FE should only send parent steps
      .refine((order) => order.every((key) => !isSubStep(key)), {
        message:
          'stepOrder should only contain parent steps (e.g. "work" not "introWork"). Sub-steps are expanded automatically.',
      })
      // Expand parent steps into full order (work → [introWork, work, conclusionWork])
      .transform((order) => expandStepOrder(order))
      // Position constraints (validated on expanded order)
      .refine(
        (order) => {
          const introIndex = order.findIndex((key) => isFirstPositionStep(key));
          return introIndex === -1 || introIndex === 0;
        },
        { message: 'Step with position "first" must be at index 0' }
      )
      .refine(
        (order) => {
          const conclusionIndex = order.findIndex((key) => isLastPositionStep(key));
          return conclusionIndex === -1 || conclusionIndex === order.length - 1;
        },
        { message: 'Step with position "last" must be at the end' }
      )
      .optional(),
  })
  .superRefine(validateTypeCompatibility);

export const AgentQuerySchema = z.object({
  status: z.enum([AgentStatus.ACTIVE, AgentStatus.INACTIVE]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const AgentIdParamSchema = z.object({
  id: z.string().min(1, 'Agent ID is required'),
});

// ============================================
// SPARSE FIELDSETS / EXPANSION PATTERN
// ============================================

/**
 * Valid expansion fields for GET /agents/:id
 * - steps: Include agent steps
 * - prompts: Include agent prompts
 * - assessment: Include agent assessment
 * - all: Include everything
 */
const VALID_INCLUDES = ['steps', 'prompts', 'assessment', 'all'] as const;
type ValidInclude = (typeof VALID_INCLUDES)[number];

export const AgentGetByIdQuerySchema = z.object({
  include: z
    .string()
    .optional()
    .transform((val): ValidInclude[] => {
      if (!val) return [];
      return val
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s): s is ValidInclude => VALID_INCLUDES.includes(s as ValidInclude));
    }),

  /**
   * When true, filters out sub-steps (selectable: false) from steps
   * and returns a collapsed stepOrder with only parent keys.
   * Useful for FE step editor where sub-steps are managed automatically.
   *
   * @example ?include=all&collapse=true
   */
  collapse: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export interface GetAgentOptions {
  includeSteps?: boolean;
  includePrompts?: boolean;
  includeAssessment?: boolean;
  collapseSubSteps?: boolean;
}

export function parseIncludeQuery(include: ValidInclude[], collapse?: boolean): GetAgentOptions {
  const includeAll = include.includes('all');

  return {
    includeSteps: includeAll || include.includes('steps'),
    includePrompts: includeAll || include.includes('prompts'),
    includeAssessment: includeAll || include.includes('assessment'),
    collapseSubSteps: collapse ?? false,
  };
}

// ============================================
// GENERATE AGENT SCHEMA
// ============================================

const validStepId = z.string().refine(
  (step) => getAllStepIds().includes(step),
  (step) => ({ message: `Invalid step: "${step}"` })
);
export const GenerateAgentSchema = z
  .object({
    summary: z.string().min(10, 'Job summary is required'),
    label: z.string().min(1, 'Label is required').max(200, 'Label too long'),
    steps: z.array(validStepId).min(1, 'At least one step is required'),
    render: RenderConfigSchema,
    voice: VoiceConfigSchema,
    features: AgentFeaturesSchema.partial().optional(),
    conversationTypeId: conversationTypeIdField,
    summaryTypeId: z.string().refine((id) => isSummaryTypeRegistered(id), {
      message: 'Unknown summary type ID',
    }),
    statisticsTypeId: z.string().refine((id) => isStatisticsTypeRegistered(id), {
      message: 'Unknown statistics type ID',
    }),
    additionalData: z
      .object({
        assessment_type: z.enum(['coding', 'written']).optional(),
        time_minutes: z.number().int().positive().optional(),
        language_coding: z.string().optional(),
        target_language: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Type chain compatibility
    validateTypeCompatibility(data, ctx);

    // Step additionalData requirements
    for (const stepId of data.steps) {
      const def = getStepDefinition(stepId);
      if (!def?.additionalData?.required?.length) continue;

      for (const field of def.additionalData.required) {
        const value = (data.additionalData as Record<string, unknown> | undefined)?.[field];
        if (value === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['additionalData', field],
            message: `Step "${stepId}" requires "${field}" in additionalData`,
          });
        }
      }
    }
  });

// ============================================
// GENERATE STEP SCHEMA
// ============================================

export const GenerateStepSchema = z.object({
  summary: z.string().min(10, 'Job summary is required'),
  language: z.string().min(1, 'Language code is required'),
  steps: z.array(validStepId).min(1, 'At least one step is required'),
  additionalData: z
    .object({
      assessment_type: z.enum(['coding', 'written']).optional(),
      time_minutes: z.number().int().positive().optional(),
      language_coding: z.string().optional(),
      target_language: z.string().optional(),
    })
    .optional(),
});
// ============================================
// NESTED ROUTE SCHEMAS
// ============================================

export const AgentStepKeyParamSchema = z.object({
  id: z.string().min(1, 'Agent ID is required'),
  key: z.string().min(1, 'Step key is required'),
});

export const AgentPromptKeyParamSchema = z.object({
  id: z.string().min(1, 'Agent ID is required'),
  key: z.string().min(1, 'Prompt key is required'),
});

export const UpdateStepSchema = z.object({
  label: z.string().min(1, 'Step label is required').optional(),
  inputs: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Update single prompt
 * NOTE: Only model settings can be updated - system prompt is derived from step inputs
 * To change the system prompt, update the step inputs instead
 */
export const UpdatePromptSchema = z.object({
  model: z.string().min(1, 'Model is required').optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});

/**
 * Add a new step to an agent
 *
 * When draft is true, inputs are ignored and skeleton is generated from schema.
 * When draft is false (default), inputs are validated against the step's schema.
 */
export const AddStepSchema = z
  .object({
    key: z.string().min(1, 'Step key is required'),
    order: z.number().int().positive().optional(),
    inputs: z.record(z.string(), z.unknown()).optional().default({}),
    draft: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (!isValidStep(data.key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['key'],
        message: `Invalid step key: "${data.key}". Must be a valid step from the registry.`,
      });
      return;
    }

    if (isReportStep(data.key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['key'],
        message: `Cannot manually add report step: "${data.key}"`,
      });
      return;
    }

    if (isSubStep(data.key)) {
      const parentStep = getParentStep(data.key);
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['key'],
        message: `Cannot add sub-step "${data.key}" directly. Add the parent step "${parentStep}" instead.`,
      });
      return;
    }

    // Only validate inputs when not draft
    if (!data.draft) {
      const schema = STEP_INPUT_SCHEMAS[data.key];
      if (schema) {
        const result = schema.safeParse(data.inputs);
        if (!result.success) {
          for (const issue of result.error.issues) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['inputs', ...issue.path],
              message: issue.message,
            });
          }
        }
      }
    }
  });

export const UpdateAssessmentSchema = z.object({
  testContent: z.string().min(1, 'Test content is required').optional(),
  language: z.string().min(1, 'Language is required').optional(),
  durationSeconds: z.number().int().positive().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
export type AgentQueryInput = z.infer<typeof AgentQuerySchema>;
export type AgentGetByIdQuery = z.infer<typeof AgentGetByIdQuerySchema>;
export type GenerateAgentInput = z.infer<typeof GenerateAgentSchema>;
export type GenerateStepInput = z.infer<typeof GenerateStepSchema>;
export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;
export type AgentFeatures = z.infer<typeof AgentFeaturesSchema>;
export type RenderConfig = z.infer<typeof RenderConfigSchema>;
export type StepConfig = z.infer<typeof StepConfigSchema>;
export type PromptConfig = z.infer<typeof PromptConfigSchema>;
export type AssessmentConfig = z.infer<typeof AssessmentConfigSchema>;
export type PromptMessage = z.infer<typeof PromptMessageSchema>;
export type UpdateStepInput = z.infer<typeof UpdateStepSchema>;
export type AddStepInput = z.infer<typeof AddStepSchema>;
export type UpdatePromptInput = z.infer<typeof UpdatePromptSchema>;
export type UpdateAssessmentInput = z.infer<typeof UpdateAssessmentSchema>;
