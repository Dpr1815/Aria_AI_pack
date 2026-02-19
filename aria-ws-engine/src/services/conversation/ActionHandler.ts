/**
 * Action Handler
 *
 * Builds the action context and delegates execution to the registry.
 * The ConversationService calls this — it never interacts with the registry directly.
 *
 * Actions are identified by string keys (e.g. "STEP_COMPLETED", "START_TEST").
 * The registry resolves the key to an executor function.
 */

import type { ActionResult, ActionContext, ActionServices } from '@types';
import type { AgentDocument, SessionDocument } from '@models';
import type {
  SessionRepository,
  ConversationRepository,
  AgentPromptRepository,
  AgentAssessmentRepository,
  AgentStepRepository,
} from '@repositories';

import { executeAction, getActionTiming } from './actions/registry';
import type { ActionTiming } from './actions/registry';

// ============================================
// Dependencies
// ============================================

export interface ActionHandlerDeps {
  sessionRepo: SessionRepository;
  conversationRepo: ConversationRepository;
  promptRepo: AgentPromptRepository;
  assessmentRepo?: AgentAssessmentRepository;
  stepRepo?: AgentStepRepository;
}

// ============================================
// Action Handler
// ============================================

export class ActionHandler {
  constructor(private deps: ActionHandlerDeps) {}

  /**
   * Execute an action by its string key.
   * The conversationService is passed at call time to avoid circular dependency.
   */
  async execute(
    actionType: string,
    session: SessionDocument,
    agent: AgentDocument,
    conversationService: ActionServices['conversationService']
  ): Promise<ActionResult> {
    const context = this.buildContext(session, agent, conversationService);
    return executeAction(actionType, undefined, context);
  }

  /**
   * Get the timing configuration for an action type.
   * Used by the WS handler to decide message delivery order.
   */
  getTiming(actionType: string): ActionTiming {
    return getActionTiming(actionType) ?? 'after_response';
  }

  // ============================================
  // Private
  // ============================================

  private buildContext(
    session: SessionDocument,
    agent: AgentDocument,
    conversationService: ActionServices['conversationService']
  ): ActionContext {
    const services: ActionServices = {
      sessionRepo: this.deps.sessionRepo,
      conversationRepo: this.deps.conversationRepo,
      promptRepo: this.deps.promptRepo,
      conversationService,
      assessmentRepo: this.deps.assessmentRepo,
      stepRepo: this.deps.stepRepo,
    };

    return { session, agent, services };
  }
}

// ============================================
// Factory
// ============================================

export function createActionHandler(deps: ActionHandlerDeps): ActionHandler {
  return new ActionHandler(deps);
}
