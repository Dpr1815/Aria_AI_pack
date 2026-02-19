/**
 * Action Registry
 *
 * Maps action type strings to their executor functions + configuration.
 *
 * To add a new action:
 * 1. Create a file: myAction.action.ts with `export async function execute(...)`
 * 2. Import it here
 * 3. Add one entry to the registry with timing config
 *
 * No changes needed in ConversationService, ActionHandler, or types.
 */

import { ActionType, type ActionExecutor, type ActionResult, type ActionContext } from '@types';
import { createLogger } from '@utils';

import { execute as stepCompleted } from './stepCompleted.action';
import { execute as conversationComplete } from './conversationComplete.action';
import { execute as startTest } from './startTest.action';
import { execute as startLinguistic } from './startLinguistic.action';
import { execute as stopLinguistic } from './stopLinguistic.action';

const logger = createLogger('ActionRegistry');

// ============================================
// Action Config
// ============================================

/**
 * Timing determines when the action's client-facing effects are delivered
 * relative to the AI audio/text response:
 *
 * - 'before_response': Action runs BEFORE LLM call.
 *    Use for actions that need to modify context, fetch data for the AI, etc.
 *
 * - 'after_response': Action runs AFTER the AI message is saved.
 *    Client-facing effects (step change, test UI, completion) are delivered
 *    AFTER audio playback. This is the default for most actions.
 */
export type ActionTiming = 'before_response' | 'after_response';

export interface ActionConfig {
  execute: ActionExecutor;
  timing: ActionTiming;
}

// ============================================
// Registry
// ============================================

const actions: Record<string, ActionConfig> = {
  [ActionType.STEP_COMPLETED]: { execute: stepCompleted, timing: 'after_response' },
  [ActionType.CONVERSATION_COMPLETE]: { execute: conversationComplete, timing: 'after_response' },
  [ActionType.START_TEST]: { execute: startTest, timing: 'after_response' },
  [ActionType.START_LINGUISTIC]: { execute: startLinguistic, timing: 'after_response' },
  [ActionType.STOP_LINGUISTIC]: { execute: stopLinguistic, timing: 'after_response' },
};

// ============================================
// Execution
// ============================================

/**
 * Execute an action by type.
 * Returns a default empty result if the action type is not registered.
 */
export async function executeAction(
  type: string,
  payload: Record<string, unknown> | undefined,
  context: ActionContext
): Promise<ActionResult> {
  const config = actions[type];

  if (!config) {
    logger.warn(`Unknown action type: ${type}`);
    return {};
  }

  try {
    const result = await config.execute(payload, context);

    logger.info(`Executed ${type}`, {
      nextStep: result.nextStep,
      isComplete: result.isComplete,
    });

    return result;
  } catch (error) {
    logger.error(`Error executing ${type}`, error as Error);
    return { error: (error as Error).message };
  }
}

/**
 * Get the timing configuration for an action type.
 */
export function getActionTiming(type: string): ActionTiming | null {
  return actions[type]?.timing ?? null;
}

/**
 * Check if an action type is registered.
 */
export function isActionRegistered(type: string): boolean {
  return type in actions;
}

/**
 * Get all registered action type strings.
 */
export function getRegisteredActionTypes(): ActionType[] {
  return Object.keys(actions) as ActionType[];
}
