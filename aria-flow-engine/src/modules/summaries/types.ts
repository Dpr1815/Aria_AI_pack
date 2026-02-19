/**
 * Summary Module Types
 *
 * Generic, definition-driven type definitions for the summary system.
 *
 * Adding a new summary type requires ONLY:
 *   1. A new definition implementing SummaryDefinition
 *   2. Zod schemas for section outputs + final output
 *   3. Prompt templates registered in the prompt registry
 *   4. Registration in the summary registry
 *
 * Zero changes needed in SummaryService.
 */

import { ZodSchema } from 'zod';

// ============================================
// SECTION VARIABLE CONFIGURATION
// ============================================

/**
 * Declares WHERE each prompt variable comes from,
 * so the service can resolve them generically.
 */
export interface SectionVariableConfig {
  /**
   * Keys to pull from the parent AgentStepDocument.inputs.
   * e.g. ['job_description', 'key_skills_required']
   *
   * The service resolves the parent step via StepDefinition.id
   * and fetches its AgentStepDocument.inputs.
   */
  fromStepCard?: string[];
  fromAssessmentCard?: string[];
  /**
   * Whether to inject the filtered conversation text for this step.
   * Messages are gathered using the step's expandsTo (from step registry)
   * or [stepKey] if expandsTo is not defined.
   *
   * @default true
   */
  injectConversation?: boolean;

  /**
   * Whether to inject the data from the session card.
   *
   * @default true
   */
  injectSessiondata?: boolean;

  /**
   * Variable name for the conversation text in the prompt template.
   * @default 'conversation'
   */
  conversationVariableName?: string;

  /**
   * Static variables injected as-is into the prompt.
   * Useful for fixed instructions, format hints, etc.
   */
  static?: Record<string, unknown>;

  /**
   * Variables pulled from previously executed section outputs.
   * Enables chaining: later sections can reference earlier results.
   *
   * Key = variable name for this prompt
   * Value = 'sectionKey.fieldPath' (dot notation)
   *
   * e.g. { 'backgroundScore': 'background.score' }
   */
  fromSections?: Record<string, string>;
}

// ============================================
// SECTION DEFINITION
// ============================================

/**
 * Definition for a single summary section.
 *
 * Each section maps to a conversation step and produces
 * a structured partial output (e.g., background analysis).
 */
export interface SummarySectionDefinition {
  /**
   * Step key this section maps to.
   * Must match AgentStepDocument.key and the step registry ID.
   *
   * The service uses the step registry to resolve expandsTo
   * for conversation gathering, and fetches this step's
   * AgentStepDocument.inputs for step card variables.
   */
  key: string;

  /**
   * Base prompt template ID.
   * Language suffix is appended at runtime:
   *   `${promptId}_${langSuffix}`
   *
   * e.g. 'interview_summary_background' → 'interview_summary_background_it'
   */
  promptId: string;

  /**
   * Whether this section is required.
   * - true: throws if step not found in agent's stepOrder
   * - false: silently skipped if step not present
   *
   * @default false
   */
  required?: boolean;

  /**
   * Variable resolution config for this section's prompt.
   */
  variables: SectionVariableConfig;

  /**
   * Zod schema to validate the AI output for this section.
   * Ensures structured, type-safe partial results before aggregation.
   */
  outputSchema: ZodSchema;
}

// ============================================
// MAIN (AGGREGATION) CONFIGURATION
// ============================================

/**
 * Configuration for the main aggregation prompt.
 * Receives ALL section outputs and produces the final summary.
 */
export interface SummaryMainConfig {
  /**
   * Base prompt template ID. Language suffix appended at runtime.
   */
  promptId: string;

  /**
   * Variable resolution for the main prompt.
   */
  variables: SummaryMainVariableConfig;
}

export interface SummaryMainVariableConfig {
  /**
   * Whether to inject all section outputs as a JSON blob.
   * @default true
   */
  injectSectionResults?: boolean;

  /**
   * Variable name for the section results blob.
   * @default 'sectionResults'
   */
  sectionResultsVariableName?: string;

  /**
   * Whether to inject session-level time analysis data.
   * @default true
   */
  injectTimeAnalysis?: boolean;

  /**
   * Variables pulled from agent/session context using dot-path resolution.
   *
   * Available context paths:
   *   - 'agent.label'
   *   - 'agent.voice.languageCode'
   *   - 'agent.stepOrder'
   *   - 'session.createdAt'
   *   - 'session.updatedAt'
   *
   * Key = variable name for the prompt
   * Value = dot-path into the context object
   */
  fromContext?: Record<string, string>;

  /**
   * Static variables injected as-is.
   */
  static?: Record<string, unknown>;
}

// ============================================
// TOP-LEVEL DEFINITION
// ============================================

/**
 * Complete definition for a summary type.
 *
 * This is the single source of truth that drives the entire
 * summary generation pipeline for a given typeId.
 */
export interface SummaryDefinition {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description */
  description: string;

  /**
   * Step category IDs this summary type is compatible with.
   * Maps to the categoryId keys in STEP_REGISTRY_BY_CATEGORY.
   *
   * e.g. ['interview'] means this summary works with interview-type conversations.
   */
  compatibleConversationTypes: string[];

  /**
   * Ordered list of section definitions.
   * Executed sequentially — later sections can reference earlier outputs
   * via variables.fromSections.
   */
  sections: SummarySectionDefinition[];

  /**
   * Main aggregation prompt config.
   */
  main: SummaryMainConfig;

  /**
   * Zod schema for the final summary output validation.
   */
  outputSchema: ZodSchema;
}

// ============================================
// REGISTRY TYPE
// ============================================

export interface SummaryRegistryEntry {
  config: SummaryDefinition;
}
