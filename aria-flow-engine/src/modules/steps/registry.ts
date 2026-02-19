/**
 * Step Registry
 */

import { z, ZodType, ZodFirstPartyTypeKind, ZodSchema } from 'zod';
import { STEP_REGISTRY, STEP_INPUT_SCHEMAS, STEP_REGISTRY_BY_CATEGORY } from './definitions';
import { StepDefinition, StepLabels } from './types';
import { NotFoundError } from '../../utils/errors';

export { STEP_REGISTRY, STEP_INPUT_SCHEMAS, STEP_REGISTRY_BY_CATEGORY };

// ============================================
// STEP LOOKUPS
// ============================================

/**
 * Get step definition by ID
 */
export const getStepDefinition = (stepId: string): StepDefinition | undefined => {
  return STEP_REGISTRY[stepId];
};

/**
 * Get step definition or throw
 */
export const getStepDefinitionOrThrow = (stepId: string): StepDefinition => {
  const def = STEP_REGISTRY[stepId];
  if (!def) {
    throw new NotFoundError('StepDefinition', stepId);
  }
  return def;
};

/**
 * Get input schema for a step
 */
export const getStepInputSchema = (stepId: string): ZodSchema | undefined => {
  return STEP_INPUT_SCHEMAS[stepId];
};

/**
 * Validate step inputs against schema
 */
export const validateStepInputs = (
  stepId: string,
  inputs: Record<string, unknown>
): { success: boolean; errors?: string[] } => {
  const schema = getStepInputSchema(stepId);
  if (!schema) {
    return { success: true };
  }

  const result = schema.safeParse(inputs);
  if (result.success) {
    return { success: true };
  }

  const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  return { success: false, errors };
};

/**
 * Check if a step exists in the registry
 */
export const isValidStep = (stepId: string): boolean => {
  return stepId in STEP_REGISTRY;
};

/**
 * Get all step IDs
 */
export const getAllStepIds = (): string[] => {
  return Object.keys(STEP_REGISTRY);
};

/**
 * Expand a simplified step order into full order with sub-steps
 *
 * FE sends:    ["intro", "work", "background", "conclusion"]
 * Expands to:  ["intro", "introWork", "work", "conclusionWork", "background", "conclusion"]
 */
export function expandStepOrder(simplifiedOrder: string[]): string[] {
  return simplifiedOrder.flatMap((key) => {
    const def = STEP_REGISTRY[key];
    return def?.expandsTo ?? [key];
  });
}

// ============================================
// CATEGORY & CATALOG FUNCTIONS
// ============================================

/**
 * Get all available step categories
 */
export function getStepCategories(): string[] {
  return Object.keys(STEP_REGISTRY_BY_CATEGORY);
}

/**
 * Step type DTO for catalog API responses
 */
export interface StepTypeDTO {
  id: string;
  labels: StepLabels;
  position: 'first' | 'last' | 'flexible';
  expandsTo?: string[];
  inputSkeleton: Record<string, unknown>;
  additionalData?: { required: string[]; optional?: string[] };
}

/**
 * Get selectable step types for a category, formatted as DTOs
 *
 * Filters out sub-steps (selectable: false) since those are
 * auto-created when the parent step is added.
 *
 * Returns undefined if category doesn't exist.
 */
export function getStepTypesByCategory(categoryId: string): StepTypeDTO[] | undefined {
  const categorySteps = STEP_REGISTRY_BY_CATEGORY[categoryId];
  if (!categorySteps) return undefined;

  return Object.values(categorySteps)
    .filter((step) => step.selectable)
    .map((step) => ({
      id: step.id,
      labels: step.labels,
      position: step.position,
      ...(step.expandsTo && { expandsTo: step.expandsTo }),
      inputSkeleton: buildStepSkeleton(step.id),
      ...(step.additionalData && { additionalData: step.additionalData }),
    }));
}

// ============================================
// SKELETON BUILDER
// ============================================

/**
 * Build empty skeleton inputs for a step from its Zod inputSchema
 *
 * Walks the schema shape and produces default empty values:
 * - string → ""
 * - number → 0
 * - boolean → false
 * - array → []
 * - object → recurse
 * - enum → ""
 * - optional/default → unwrap
 *
 * Used by draft step creation to initialize a step with the correct
 * structure but all values empty, so the FE can render the edit form.
 */
export function buildStepSkeleton(stepId: string): Record<string, unknown> {
  const def = STEP_REGISTRY[stepId];
  if (!def) return {};
  return buildSkeletonFromZod(def.inputSchema);
}

function buildSkeletonFromZod(schema: ZodType): Record<string, unknown> {
  const def = (schema as any)._def;

  // Unwrap ZodEffects (.strict(), .refine(), .transform(), etc.)
  if (def.typeName === ZodFirstPartyTypeKind.ZodEffects) {
    return buildSkeletonFromZod(def.schema);
  }

  if (def.typeName === ZodFirstPartyTypeKind.ZodObject) {
    const shape = (schema as z.ZodObject<any>).shape;
    const result: Record<string, unknown> = {};
    for (const [key, fieldSchema] of Object.entries(shape)) {
      result[key] = getEmptyValue(fieldSchema as ZodType);
    }
    return result;
  }

  return {};
}

function getEmptyValue(schema: ZodType): unknown {
  const def = (schema as any)._def;

  switch (def.typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return '';
    case ZodFirstPartyTypeKind.ZodNumber:
      return 0;
    case ZodFirstPartyTypeKind.ZodBoolean:
      return false;
    case ZodFirstPartyTypeKind.ZodArray:
      return [];
    case ZodFirstPartyTypeKind.ZodEnum:
      return '';
    case ZodFirstPartyTypeKind.ZodOptional:
    case ZodFirstPartyTypeKind.ZodNullable:
      return getEmptyValue(def.innerType);
    case ZodFirstPartyTypeKind.ZodDefault:
      return def.defaultValue();
    case ZodFirstPartyTypeKind.ZodObject:
      return buildSkeletonFromZod(schema);
    case ZodFirstPartyTypeKind.ZodEffects:
      return getEmptyValue(def.schema);
    default:
      return null;
  }
}
