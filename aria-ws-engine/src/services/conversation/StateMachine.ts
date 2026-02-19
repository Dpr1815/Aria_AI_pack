/**
 * State Machine
 *
 * Pure functions for conversation step navigation.
 * Uses AgentDocument.stepOrder (string[]) as the source of truth.
 * Linear flow only — no branching or optional steps.
 */

import type { AgentDocument } from '@models';

// ============================================
// Types
// ============================================

export interface StepInfo {
  key: string;
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
}

export interface StepTransition {
  from: string;
  to: string | null;
  isLast: boolean;
}

export interface NavigationResult {
  currentStep: string;
  nextStep: string | null;
  previousStep: string | null;
  isFirst: boolean;
  isLast: boolean;
}

// ============================================
// Step Access
// ============================================

/**
 * Get the ordered step keys directly from the agent.
 */
export function getStepOrder(agent: AgentDocument): string[] {
  return agent.stepOrder;
}

/**
 * Get step info with position details.
 */
export function getStepInfo(agent: AgentDocument, stepKey: string): StepInfo | null {
  const steps = agent.stepOrder;
  const index = steps.indexOf(stepKey);
  if (index === -1) return null;

  return {
    key: stepKey,
    index,
    total: steps.length,
    isFirst: index === 0,
    isLast: index === steps.length - 1,
  };
}

// ============================================
// Navigation
// ============================================

/**
 * Get the first step key.
 */
export function getFirstStep(agent: AgentDocument): string {
  const steps = agent.stepOrder;
  if (steps.length === 0) {
    throw new Error(`Agent ${agent._id} has no steps defined`);
  }
  return steps[0];
}

/**
 * Get the last step key.
 */
export function getLastStep(agent: AgentDocument): string {
  const steps = agent.stepOrder;
  if (steps.length === 0) {
    throw new Error(`Agent ${agent._id} has no steps defined`);
  }
  return steps[steps.length - 1];
}

/**
 * Get the next step after the current one. Returns null if on last step.
 */
export function getNextStep(agent: AgentDocument, currentStep: string): string | null {
  const steps = agent.stepOrder;
  const index = steps.indexOf(currentStep);

  if (index === -1 || index >= steps.length - 1) return null;
  return steps[index + 1];
}

/**
 * Get the previous step before the current one. Returns null if on first step.
 */
export function getPreviousStep(agent: AgentDocument, currentStep: string): string | null {
  const steps = agent.stepOrder;
  const index = steps.indexOf(currentStep);

  if (index <= 0) return null;
  return steps[index - 1];
}

/**
 * Get full navigation info for current step.
 */
export function getNavigation(agent: AgentDocument, currentStep: string): NavigationResult {
  const steps = agent.stepOrder;
  const index = steps.indexOf(currentStep);
  const total = steps.length;

  const isFirst = index === 0;
  const isLast = index === total - 1;

  return {
    currentStep,
    nextStep: isLast ? null : steps[index + 1],
    previousStep: isFirst ? null : steps[index - 1],
    isFirst,
    isLast,
  };
}

// ============================================
// Transitions
// ============================================

/**
 * Calculate step transition from current step.
 */
export function calculateTransition(agent: AgentDocument, currentStep: string): StepTransition {
  const nextStep = getNextStep(agent, currentStep);

  return {
    from: currentStep,
    to: nextStep,
    isLast: nextStep === null,
  };
}

/**
 * Get the next step key, or stay on current if already last.
 */
export function moveToNextStep(agent: AgentDocument, currentStep: string): string {
  return getNextStep(agent, currentStep) ?? currentStep;
}

// ============================================
// Validation
// ============================================

/**
 * Check if step exists in agent's step order.
 */
export function isValidStep(agent: AgentDocument, step: string): boolean {
  return agent.stepOrder.includes(step);
}

export function isFirstStep(agent: AgentDocument, step: string): boolean {
  return step === getFirstStep(agent);
}

export function isLastStep(agent: AgentDocument, step: string): boolean {
  return step === getLastStep(agent);
}

// ============================================
// Progress
// ============================================

/**
 * Get step index (0-based). Returns -1 if not found.
 */
export function getStepIndex(agent: AgentDocument, step: string): number {
  return agent.stepOrder.indexOf(step);
}

/**
 * Get total step count.
 */
export function getStepCount(agent: AgentDocument): number {
  return agent.stepOrder.length;
}

/**
 * Get number of remaining steps after current.
 */
export function getRemainingSteps(agent: AgentDocument, currentStep: string): number {
  const total = agent.stepOrder.length;
  const index = agent.stepOrder.indexOf(currentStep);
  if (index === -1) return total;
  return Math.max(0, total - index - 1);
}
