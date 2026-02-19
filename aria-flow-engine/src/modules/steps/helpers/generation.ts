/**
 * Step Generation Helper
 *
 * Functions for handling step content generation configuration.
 *
 * @module modules/steps/helpers
 */

import { STEP_REGISTRY } from '../definitions';
import { GenerationConfig, GenerationStage } from '../types';

/**
 * Get generation template ID for a step
 *
 * Handles both simple templates and conditional templates based on additionalData.
 * For pipeline generation, returns the first stage template ID.
 *
 * @param stepId - The step ID
 * @param additionalData - Optional data containing template selector value
 * @returns Template ID or undefined if step has no generation config
 */
export const getGenerationTemplateId = (
  stepId: string,
  additionalData?: Record<string, unknown>
): string | undefined => {
  const def = STEP_REGISTRY[stepId];
  if (!def?.generation) return undefined;

  const config = def.generation;

  // Pipeline generation - return first stage template
  if (config.stages?.length) {
    return resolveStageTemplateId(config.stages[0], additionalData);
  }

  // Simple template
  if (config.template && typeof config.template === 'string') {
    return config.template;
  }

  // Conditional templates
  if (config.templates && config.templateSelector && additionalData) {
    const selector = additionalData[config.templateSelector] as string;
    return config.templates[selector] ?? config.templates.default;
  }

  return undefined;
};

/**
 * Resolve template ID for a pipeline stage
 */
const resolveStageTemplateId = (
  stage: GenerationStage,
  additionalData?: Record<string, unknown>
): string | undefined => {
  const { template, templateSelector } = stage;

  if (typeof template === 'string') {
    return template;
  }

  if (templateSelector && additionalData) {
    const selector = additionalData[templateSelector] as string;
    if (selector && template[selector]) {
      return template[selector];
    }
  }

  return template.default;
};

/**
 * Check if a step has generation configuration
 */
export const hasGenerationConfig = (stepId: string): boolean => {
  return STEP_REGISTRY[stepId]?.generation !== undefined;
};

/**
 * Check if step uses pipeline (multi-stage) generation
 */
export const usesPipelineGeneration = (stepId: string): boolean => {
  const stages = STEP_REGISTRY[stepId]?.generation?.stages;
  return !!(stages && stages.length > 0);
};

/**
 * Get pipeline stages for a step
 */
export const getGenerationStages = (stepId: string): GenerationStage[] => {
  return STEP_REGISTRY[stepId]?.generation?.stages ?? [];
};

/**
 * Get generation config for a step
 */
export const getGenerationConfig = (stepId: string): GenerationConfig | undefined => {
  return STEP_REGISTRY[stepId]?.generation;
};

/**
 * Check if a step should include steps array
 */
export const shouldIncludeSteps = (stepId: string): boolean => {
  return STEP_REGISTRY[stepId]?.generation?.includeSteps === true;
};

/**
 * Get additional data requirements for a step
 *
 * @param stepId - The step ID
 * @returns Object with required and optional field arrays, or undefined
 */
export const getAdditionalDataRequirements = (
  stepId: string
): { required: string[]; optional: string[] } | undefined => {
  const config = STEP_REGISTRY[stepId]?.additionalData;
  if (!config) return undefined;

  return {
    required: config.required,
    optional: config.optional ?? [],
  };
};

/**
 * Validate that all required additional data fields are present
 *
 * @param stepId - The step ID
 * @param additionalData - Data to validate
 * @returns Validation result with missing fields list
 */
export const validateAdditionalData = (
  stepId: string,
  additionalData?: Record<string, unknown>
): { valid: boolean; missingFields: string[] } => {
  const requirements = getAdditionalDataRequirements(stepId);
  if (!requirements) {
    return { valid: true, missingFields: [] };
  }

  const missing = requirements.required.filter((field) => {
    if (!additionalData) return true;
    const value = additionalData[field];
    return value === undefined || value === null || value === '';
  });

  return {
    valid: missing.length === 0,
    missingFields: missing,
  };
};

/**
 * Validate stage-specific requirements
 *
 * Checks both requiredVariables and conditionalVariables for a stage.
 *
 * @param stage - The generation stage
 * @param additionalData - Data to validate
 * @returns Validation result with missing fields list
 */
export const validateStageRequirements = (
  stage: GenerationStage,
  additionalData?: Record<string, unknown>
): { valid: boolean; missingFields: string[] } => {
  const required = [...(stage.requiredVariables ?? [])];

  // Add conditional requirements
  if (stage.conditionalVariables && stage.templateSelector && additionalData) {
    const selector = additionalData[stage.templateSelector] as string;
    const conditional = stage.conditionalVariables[selector];
    if (conditional) {
      required.push(...conditional);
    }
  }

  const missing = required.filter((field) => {
    if (!additionalData) return true;
    const value = additionalData[field];
    return value === undefined || value === null || value === '';
  });

  return {
    valid: missing.length === 0,
    missingFields: missing,
  };
};

/**
 * Check if step has artifact configuration
 */
export const hasArtifacts = (stepId: string): boolean => {
  return STEP_REGISTRY[stepId]?.artifacts !== undefined;
};

/**
 * Check if step creates assessment artifact
 */
export const hasAssessmentArtifact = (stepId: string): boolean => {
  return STEP_REGISTRY[stepId]?.artifacts?.assessment !== undefined;
};

/**
 * Get assessment artifact configuration
 */
export const getAssessmentArtifactConfig = (stepId: string) => {
  return STEP_REGISTRY[stepId]?.artifacts?.assessment;
};

/**
 * Get all steps that require generation (have generation config)
 */
export const getStepsRequiringGeneration = (stepIds: string[]): string[] => {
  return stepIds.filter((stepId) => hasGenerationConfig(stepId));
};

/**
 * Deduplicate steps by generation template
 *
 * Steps sharing the same template only need one generation call.
 *
 * @param stepIds - Array of step IDs
 * @param additionalData - Data for conditional template resolution
 * @returns Deduplicated array with one step per unique template
 */
export const deduplicateByGenerationTemplate = (
  stepIds: string[],
  additionalData?: Record<string, unknown>
): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const stepId of stepIds) {
    if (!hasGenerationConfig(stepId)) continue;

    const templateId = getGenerationTemplateId(stepId, additionalData);
    const key = templateId ?? `__step_${stepId}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(stepId);
    }
  }

  return unique;
};
