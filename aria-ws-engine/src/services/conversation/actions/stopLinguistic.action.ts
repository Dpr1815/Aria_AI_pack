/**
 * Stop Linguistic Action
 *
 * Advances to the next step and reverts the TTS/STT voice
 * back to the agent's original voice configuration.
 */

import type { ActionResult, ActionContext } from '@types';
import * as StateMachine from '../StateMachine';
import { createLogger } from '@utils';

const logger = createLogger('Action:StopLinguistic');

export async function execute(
  _payload: Record<string, unknown> | undefined,
  context: ActionContext
): Promise<ActionResult> {
  const { session, agent, services } = context;
  const currentStep = session.currentStep;

  const transition = StateMachine.calculateTransition(agent, currentStep);

  if (transition.isLast) {
    await services.sessionRepo.updateStatus(session._id, 'completed');
    return { isComplete: true };
  }

  const nextStep = transition.to!;

  // Advance to the next step
  await services.sessionRepo.updateCurrentStep(session._id, nextStep);
  await services.conversationService.injectStepContext(session._id, nextStep, agent);

  logger.info(`Linguistic mode stopped → step "${nextStep}", reverting to agent voice`);

  // Revert to the agent's original voice (always fresh from DB in action context)
  return {
    nextStep,
    isComplete: false,
    triggerAIResponse: true,
    voiceOverride: agent.voice,
  };
}
