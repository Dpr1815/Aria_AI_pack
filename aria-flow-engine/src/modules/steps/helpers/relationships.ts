/**
 * Step Relationships Helper
 *
 * Functions for handling step relationships (parent/child, expansion).
 *
 * @module modules/steps/helpers
 */

import { STEP_REGISTRY } from '../definitions';

/**
 * Check if step is a report step
 *
 * @param stepId - The step ID
 * @returns True if step is a report step
 */
export const isReportStep = (stepId: string): boolean => {
  return STEP_REGISTRY[stepId]?.isReport === true;
};

/**
 * Check if step is a sub-step (has a parent)
 *
 * @param stepId - The step ID
 * @returns True if step is a sub-step
 */
export const isSubStep = (stepId: string): boolean => {
  return STEP_REGISTRY[stepId]?.parentStep !== undefined;
};

/**
 * Get parent step ID for a sub-step
 *
 * @param stepId - The step ID
 * @returns Parent step ID or undefined
 */
export const getParentStep = (stepId: string): string | undefined => {
  return STEP_REGISTRY[stepId]?.parentStep;
};

/**
 * Get all sub-steps for a parent step
 *
 * @param parentStepId - The parent step ID
 * @returns Array of sub-step IDs
 */
export const getSubSteps = (parentStepId: string): string[] => {
  return Object.values(STEP_REGISTRY)
    .filter((step) => step.parentStep === parentStepId)
    .map((step) => step.id);
};

/**
 * Expand a step to its sub-steps (or return itself if no expansion)
 *
 * @param stepId - The step ID
 * @returns Array of expanded step IDs
 */
export const expandStep = (stepId: string): string[] => {
  const def = STEP_REGISTRY[stepId];
  return def?.expandsTo ?? [stepId];
};

/**
 * Check if a step expands to sub-steps
 *
 * @param stepId - The step ID
 * @returns True if step expands to sub-steps
 */
export const hasExpansion = (stepId: string): boolean => {
  const expandsTo = STEP_REGISTRY[stepId]?.expandsTo;
  return !!(expandsTo && expandsTo.length > 0);
};

/**
 * Get all report steps for a parent step
 *
 * @param parentStepId - The parent step ID
 * @returns Array of report step IDs
 */
export const getReportStepsForParent = (parentStepId: string): string[] => {
  return Object.values(STEP_REGISTRY)
    .filter((step) => step.parentStep === parentStepId && step.isReport === true)
    .map((step) => step.id);
};

/**
 * Get all conversational (non-report) sub-steps for a parent
 *
 * @param parentStepId - The parent step ID
 * @returns Array of conversational sub-step IDs
 */
export const getConversationalSubSteps = (parentStepId: string): string[] => {
  return Object.values(STEP_REGISTRY)
    .filter((step) => step.parentStep === parentStepId && step.isReport !== true)
    .map((step) => step.id);
};

/**
 * Get position constraint for a step
 *
 * @param stepId - The step ID
 * @returns Position constraint or 'flexible' as default
 */
export const getStepPosition = (stepId: string): 'first' | 'last' | 'flexible' => {
  return STEP_REGISTRY[stepId]?.position ?? 'flexible';
};

/**
 * Check if step must be first in sequence
 *
 * @param stepId - The step ID
 * @returns True if step has 'first' position
 */
export const isFirstPositionStep = (stepId: string): boolean => {
  return STEP_REGISTRY[stepId]?.position === 'first';
};

/**
 * Check if step must be last in sequence
 *
 * @param stepId - The step ID
 * @returns True if step has 'last' position
 */
export const isLastPositionStep = (stepId: string): boolean => {
  return STEP_REGISTRY[stepId]?.position === 'last';
};

/**
 * Check if step is selectable by users
 *
 * @param stepId - The step ID
 * @returns True if step is selectable
 */
export const isSelectable = (stepId: string): boolean => {
  return STEP_REGISTRY[stepId]?.selectable === true;
};

/**
 * Get all selectable steps
 *
 * @returns Array of selectable step definitions
 */
export const getSelectableSteps = () => {
  return Object.values(STEP_REGISTRY).filter((step) => step.selectable);
};

/**
 * Get all selectable step IDs
 *
 * @returns Array of selectable step IDs
 */
export const getSelectableStepIds = (): string[] => {
  return getSelectableSteps().map((step) => step.id);
};

/**
 * Get the root parent for a nested sub-step
 *
 * Traverses up the parent chain to find the top-level selectable step.
 *
 * @param stepId - The step ID
 * @returns Root parent step ID or the stepId itself if it has no parent
 */
export const getRootParent = (stepId: string): string => {
  let current = stepId;
  let parent = getParentStep(current);

  while (parent) {
    current = parent;
    parent = getParentStep(current);
  }

  return current;
};

/**
 * Get all steps in the expansion chain for a step
 *
 * Returns the step itself plus all its sub-steps (recursively).
 *
 * @param stepId - The step ID
 * @returns Array of all step IDs in the expansion chain
 */
export const getExpansionChain = (stepId: string): string[] => {
  const def = STEP_REGISTRY[stepId];
  if (!def?.expandsTo?.length) {
    return [stepId];
  }

  const chain: string[] = [];
  for (const subStepId of def.expandsTo) {
    chain.push(...getExpansionChain(subStepId));
  }

  return chain;
};
