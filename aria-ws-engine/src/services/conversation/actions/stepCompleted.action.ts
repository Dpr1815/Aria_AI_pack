/**
 * Step Completed Action
 *
 * Advances the conversation to the next step.
 * Injects context into the new step and triggers an AI response
 * so each step always begins with an AI message.
 *
 * If this is the last step, marks the session as completed instead.
 */

import type { ActionResult, ActionContext } from '@types';
import * as StateMachine from '../StateMachine';

export async function execute(
  _payload: Record<string, unknown> | undefined,
  context: ActionContext
): Promise<ActionResult> {
  const { session, agent, services } = context;
  const currentStep = session.currentStep;

  const transition = StateMachine.calculateTransition(agent, currentStep);

  // Last step → complete the conversation
  if (transition.isLast) {
    await services.sessionRepo.updateStatus(session._id, 'completed');
    return { isComplete: true };
  }

  const nextStep = transition.to!;

  // Update session to new step
  await services.sessionRepo.updateCurrentStep(session._id, nextStep);

  // Inject context into the new step (participant name + last assistant message)
  await services.conversationService.injectStepContext(session._id, nextStep, agent);

  // Trigger AI response so the new step begins with an AI message
  return {
    nextStep,
    isComplete: false,
    triggerAIResponse: true,
  };
}
