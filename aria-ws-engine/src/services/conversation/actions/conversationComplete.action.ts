/**
 * Conversation Complete Action
 *
 * Marks the session as completed and notifies external systems.
 */

import type { ActionResult, ActionContext } from '@types';
import { createLogger } from '@utils';

const logger = createLogger('Action:ConversationComplete');

export interface ConversationCompletePayload {
  reason?: string;
}

export async function execute(
  payload: Record<string, unknown> | undefined,
  context: ActionContext
): Promise<ActionResult> {
  const { session, services } = context;
  const reason = (payload as ConversationCompletePayload)?.reason ?? 'natural_end';

  // Mark session as completed
  await services.sessionRepo.updateStatus(session._id, 'completed');

  logger.info(`Session ${session._id} completed — reason: ${reason}`);

  return {
    isComplete: true,
  };
}
