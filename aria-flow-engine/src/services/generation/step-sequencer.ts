/**
 * Step Sequencer
 *
 * Handles step expansion, ordering, validation, and configuration building.
 * Uses STEP_REGISTRY as the single source of truth.
 *
 * This is the single authority for all pure step-ordering logic.
 * Repository-aware orchestration lives in AgentService.
 *
 * @module services/generation
 */

import { StepConfig } from '@validations';
import {
  getStepDefinition,
  getStepLabel,
  isFirstPositionStep,
  isLastPositionStep,
  hasGenerationConfig,
  getParentStep,
} from '@modules';
import { ValidationError } from '@utils';

/**
 * Step sequence item with navigation info
 */
export interface StepSequenceItem {
  stepKey: string;
  order: number;
  nextStep: string | null;
}

/**
 * Validation result for selected steps
 */
export interface StepValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Service responsible for step expansion, ordering, and validation
 */
export class StepSequencer {
  /**
   * Validate a step order change (reorder operation)
   *
   * Validates:
   * - Same steps (no additions/removals via reorder)
   *
   * Position constraints and sub-step grouping are validated by Zod schema.
   *
   * @throws ValidationError if validation fails
   */
  validateStepOrderChange(currentOrder: string[], newOrder: string[]): void {
    const currentSteps = new Set(currentOrder);
    const newSteps = new Set(newOrder);

    if (currentSteps.size !== newSteps.size) {
      throw new ValidationError(
        `Step count mismatch. Expected ${currentSteps.size} steps, got ${newSteps.size}. ` +
          `Use step add/remove endpoints to modify steps.`
      );
    }

    for (const step of newOrder) {
      if (!currentSteps.has(step)) {
        throw new ValidationError(
          `Unknown step "${step}" in stepOrder. Use step add endpoint to add new steps.`
        );
      }
    }

    for (const step of currentOrder) {
      if (!newSteps.has(step)) {
        throw new ValidationError(
          `Missing step "${step}" in stepOrder. Use step remove endpoint to remove steps.`
        );
      }
    }
  }
  /**
   * Validate that a step can be inserted at the given position
   *
   * Checks that insertion doesn't violate first/last position constraints.
   *
   * @throws ValidationError if position is invalid
   */
  validateInsertionPosition(stepKey: string, order: number, currentStepOrder: string[]): void {
    // Validate the inserted step's own position constraints
    if (isFirstPositionStep(stepKey) && order !== 1) {
      throw new ValidationError(`Step "${stepKey}" has position 'first' and must be inserted at position 1`);
    }

    const insertionLastPos = currentStepOrder.length + 1;
    if (isLastPositionStep(stepKey) && order < insertionLastPos) {
      throw new ValidationError(`Step "${stepKey}" has position 'last' and must be inserted at the end`);
    }

    // Validate that existing position-constrained steps are not displaced
    if (order === 1) {
      const firstStep = currentStepOrder[0];
      if (firstStep && isFirstPositionStep(firstStep)) {
        throw new ValidationError(`Cannot insert before "${firstStep}" - it must remain first`);
      }
    }

    const lastIndex = currentStepOrder.length;
    if (order > lastIndex) {
      const lastStep = currentStepOrder[lastIndex - 1];
      if (lastStep && isLastPositionStep(lastStep)) {
        throw new ValidationError(`Cannot insert after "${lastStep}" - it must remain last`);
      }
    }
  }

  // ============================================
  // STEP EXPANSION & ORDERING
  // ============================================

  /**
   * Expand selected steps into all required sub-steps
   *
   * Maintains order based on step definition position:
   * - position: 'first' steps expanded first
   * - position: 'flexible' steps in selection order
   * - position: 'last' steps expanded last
   */
  expandSteps(selectedSteps: string[]): string[] {
    const expanded: string[] = [];
    const seen = new Set<string>();

    for (const stepId of selectedSteps) {
      if (isFirstPositionStep(stepId)) {
        this.expandStep(stepId, expanded, seen);
      }
    }

    for (const stepId of selectedSteps) {
      if (isFirstPositionStep(stepId) || isLastPositionStep(stepId)) continue;
      this.expandStep(stepId, expanded, seen);
    }

    for (const stepId of selectedSteps) {
      if (isLastPositionStep(stepId)) {
        this.expandStep(stepId, expanded, seen);
      }
    }

    return expanded;
  }

  /**
   * Get conversational steps (excludes report steps)
   */
  getConversationalSteps(selectedSteps: string[]): string[] {
    return this.expandSteps(selectedSteps);
  }

  /**
   * Get steps that require content generation
   *
   * Filters to non-report steps with generation config.
   * Deduplication by template is handled by StepGeneratorService.
   */
  getStepsRequiringGeneration(selectedSteps: string[]): string[] {
    return this.expandSteps(selectedSteps).filter((stepId) => {
      return hasGenerationConfig(stepId);
    });
  }

  /**
   * Get all step keys to remove when removing a step
   *
   * If the step has expandsTo, returns all expanded sub-steps that exist in the current order.
   * Otherwise returns the step itself if it exists.
   */
  getStepsToRemove(stepKey: string, currentStepOrder: string[]): string[] {
    const def = getStepDefinition(stepKey);
    const stepsToRemove: string[] = [];

    if (def?.expandsTo?.length) {
      for (const subStep of def.expandsTo) {
        if (currentStepOrder.includes(subStep)) {
          stepsToRemove.push(subStep);
        }
      }
    } else if (currentStepOrder.includes(stepKey)) {
      stepsToRemove.push(stepKey);
    }

    return stepsToRemove;
  }

  // ============================================
  // STEP SEQUENCE & NAVIGATION
  // ============================================

  /**
   * Build step sequence with navigation info
   */
  buildStepSequence(selectedSteps: string[]): StepSequenceItem[] {
    return selectedSteps.map((stepKey, index) => ({
      stepKey,
      order: index + 1,
      nextStep: index < selectedSteps.length - 1 ? selectedSteps[index + 1] : null,
    }));
  }

  /**
   * Build step order array
   *
   * Returns ordered array of conversational step keys.
   */
  buildStepOrder(selectedSteps: string[]): string[] {
    return this.getConversationalSteps(selectedSteps);
  }

  /**
   * Build step configurations for storage
   *
   * Creates StepConfig objects with labels and order.
   * Inputs are empty - populated separately after generation.
   */
  buildStepsConfig(stepOrder: string[], language: string): Record<string, StepConfig> {
    const config: Record<string, StepConfig> = {};

    stepOrder.forEach((stepKey, index) => {
      config[stepKey] = {
        label: getStepLabel(stepKey, language),
        order: index + 1,
        nextStep: this.getNextStepKey(stepKey, stepOrder),
        inputs: {},
      };
    });

    return config;
  }

  /**
   * Merge generated inputs into step configurations
   *
   * Handles sub-steps that share generation templates with parent steps.
   */
  mergeGeneratedInputs(
    stepsConfig: Record<string, StepConfig>,
    generatedInputs: Record<string, Record<string, unknown>>,
    additionalData?: Record<string, unknown>
  ): Record<string, StepConfig> {
    const result: Record<string, StepConfig> = {};

    for (const [stepKey, config] of Object.entries(stepsConfig)) {
      const inputs = this.findInputsForStep(stepKey, generatedInputs);
      const stepAdditionalData = this.getAdditionalDataForStep(stepKey, additionalData);

      result[stepKey] = {
        ...config,
        inputs: {
          ...inputs,
          ...stepAdditionalData,
        },
      };
    }

    return result;
  }

  /**
   * Get the next step key in a step order
   *
   * @returns Next step key or null if current is last
   */
  getNextStepKey(currentKey: string, stepOrder: string[]): string | null {
    const currentIndex = stepOrder.indexOf(currentKey);
    if (currentIndex === -1 || currentIndex === stepOrder.length - 1) {
      return null;
    }
    return stepOrder[currentIndex + 1];
  }

  /**
   * Get next step label for prompt compilation
   *
   * @returns Next step's label, or empty string if last step
   */
  getNextStepLabel(stepOrder: string[], currentStepKey: string, language: string): string {
    const currentIndex = stepOrder.indexOf(currentStepKey);

    if (currentIndex === -1 || currentIndex >= stepOrder.length - 1) {
      return '';
    }

    const nextStepKey = stepOrder[currentIndex + 1];
    return getStepLabel(nextStepKey, language);
  }

  // ============================================
  // STEP ORDER UTILITIES
  // ============================================

  /**
   * Check if two step orders are equal
   */
  stepOrderEquals(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => val === b[idx]);
  }

  /**
   * Find steps whose next step changed between two orders
   *
   * Used to determine which prompts need recompilation after a reorder.
   */
  findStepsWithChangedNextStep(oldOrder: string[], newOrder: string[]): string[] {
    const changed: string[] = [];

    const oldNextMap = new Map<string, string | null>();
    oldOrder.forEach((key, idx) => {
      oldNextMap.set(key, idx < oldOrder.length - 1 ? oldOrder[idx + 1] : null);
    });

    newOrder.forEach((key, idx) => {
      const newNext = idx < newOrder.length - 1 ? newOrder[idx + 1] : null;
      const oldNext = oldNextMap.get(key);

      if (newNext !== oldNext) {
        changed.push(key);
      }
    });

    return changed;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Expand a single step into its sub-steps
   */
  private expandStep(stepId: string, expanded: string[], seen: Set<string>): void {
    if (seen.has(stepId)) return;

    const def = getStepDefinition(stepId);

    if (!def) {
      seen.add(stepId);
      expanded.push(stepId);
      return;
    }

    if (def.expandsTo?.length) {
      for (const subStepId of def.expandsTo) {
        if (!seen.has(subStepId)) {
          seen.add(subStepId);
          expanded.push(subStepId);
        }
      }
    } else {
      seen.add(stepId);
      expanded.push(stepId);
    }
  }

  /**
   * Find generated inputs for a step
   *
   * Handles sub-steps by checking parent step's generated inputs.
   */
  private findInputsForStep(
    stepKey: string,
    generatedInputs: Record<string, Record<string, unknown>>
  ): Record<string, unknown> {
    if (generatedInputs[stepKey]) {
      return generatedInputs[stepKey];
    }

    const parentStep = getParentStep(stepKey);
    if (parentStep && generatedInputs[parentStep]) {
      return generatedInputs[parentStep];
    }

    const def = getStepDefinition(stepKey);
    if (def?.parentStep) {
      for (const [otherKey, inputs] of Object.entries(generatedInputs)) {
        const otherDef = getStepDefinition(otherKey);
        if (otherDef?.parentStep === def.parentStep) {
          return inputs;
        }
      }
    }

    return {};
  }

  /**
   * Get additionalData fields relevant to a step
   *
   * Only includes fields declared in step's additionalData config.
   */
  private getAdditionalDataForStep(
    stepKey: string,
    additionalData?: Record<string, unknown>
  ): Record<string, unknown> {
    if (!additionalData) return {};

    const def = getStepDefinition(stepKey);
    if (!def?.additionalData) {
      const parentStep = getParentStep(stepKey);
      if (parentStep) {
        const parentDef = getStepDefinition(parentStep);
        if (!parentDef?.additionalData) return {};

        return this.extractDeclaredFields(parentDef.additionalData, additionalData);
      }
      return {};
    }

    return this.extractDeclaredFields(def.additionalData, additionalData);
  }

  /**
   * Extract only declared fields from additionalData
   */
  private extractDeclaredFields(
    config: { required: string[]; optional?: string[] },
    additionalData: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const allFields = [...config.required, ...(config.optional ?? [])];

    for (const field of allFields) {
      if (additionalData[field] !== undefined) {
        result[field] = additionalData[field];
      }
    }

    return result;
  }
}

// Singleton instance for backward compatibility
// Prefer constructor injection for new consumers
export const stepSequencer = new StepSequencer();
