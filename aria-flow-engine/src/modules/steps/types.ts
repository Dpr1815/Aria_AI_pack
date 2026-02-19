/**
 * Step Module Types
 *
 * All type definitions for the step system.
 * Centralized here for clean imports and maintainability.
 */

// ============================================
// LABEL TYPES
// ============================================

export interface StepLabels {
  'en-US': string;
  'it-IT': string;
  [key: string]: string;
}

// ============================================
// PROMPT TYPES
// ============================================

export interface PromptMapping {
  /** Template ID prefix for conversation/system prompts (runtime) - appends _en/_it */
  conversation: string;
}

// ============================================
// VARIABLE SOURCE TYPES
// ============================================

/**
 * Variable source for pipeline stages
 */
export interface VariableSource {
  /**
   * Where to get the value:
   * - 'input': from base input (summary, language)
   * - 'additionalData': from request additionalData
   * - 'generated': from generated outputs (after generation stage)
   * - 'stage:<stageId>': from specific generation stage output (only during generation)
   */
  from: 'input' | 'additionalData' | 'generated' | `stage:${string}`;
  /** Path to the value (supports dot notation) */
  path: string;
  /** Fallback path if primary not found */
  fallback?: string;
}

// ============================================
// GENERATION TYPES
// ============================================

/**
 * Conditional template configuration
 */
export interface ConditionalTemplate {
  default: string;
  [conditionValue: string]: string;
}

/**
 * Single generation stage for pipeline
 */
export interface GenerationStage {
  id: string;
  template: string | Record<string, string>;
  templateSelector?: string;

  /** Required variables for this stage */
  requiredVariables?: string[];

  /** Conditional requirements based on template selection */
  conditionalVariables?: Record<string, string[]>;

  /** Variable mapping from previous stages (pipeline only) */
  variableMapping?: Record<string, VariableSource>;
}
/**
 * Generation configuration for a step
 */
export interface GenerationConfig {
  /** Single template (simple steps) */
  template?: string;

  /** Conditional templates (e.g., coding vs written) */
  templates?: Record<string, string>;
  templateSelector?: string;

  /** Multi-stage pipeline (complex steps) */
  stages?: GenerationStage[];

  /** Include steps array in generation variables */
  includeSteps?: boolean;
}

// ============================================
// CONVERSATION TYPES
// ============================================

export interface ConversationConfig {
  /**
   * Variables needed for the conversation template
   * Declares where each variable comes from
   */
  variableMapping?: Record<string, VariableSource>;
}
// ============================================
// ASSESSMENT ARTIFACT
// ============================================
export interface AssessmentArtifactConfig {
  /** Field in generated output containing test content */
  testContentField: string;
  /** Field for duration in minutes */
  durationField: string;
  /** Field for language (optional) */
  languageField?: string;
  /** Fallback language if not specified */
  languageFallback?: string;
}

// ============================================
// MAIN STEP DEFINITION
// ============================================

import { z, ZodSchema } from 'zod';

export interface StepDefinition {
  id: string;
  labels: StepLabels;
  prompts: PromptMapping;
  selectable: boolean;
  position: 'first' | 'last' | 'flexible';
  expandsTo?: string[];
  parentStep?: string;
  isReport?: boolean;

  /** Generation configuration */
  generation?: GenerationConfig;

  /**
   * Additional data requirements from API request (INPUT validation)
   * Validated BEFORE generation starts
   */
  additionalData?: {
    required: string[];
    optional?: string[];
  };

  /**
   * Artifacts this step creates
   * Definition-driven artifact creation (no hardcoded if statements)
   */
  artifacts?: {
    assessment?: AssessmentArtifactConfig;
  };

  /**
   * Zod schema for step card validation (OUTPUT validation)
   * Validates the generated + additionalData combined
   */
  inputSchema: ZodSchema;
}

// ============================================
// REGISTRY TYPE
// ============================================

export type StepRegistry = Record<string, StepDefinition>;

// ============================================
// RUNTIME VARIABLES
// ============================================
