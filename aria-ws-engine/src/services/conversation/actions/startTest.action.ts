/**
 * Start Test Action
 *
 * Signals the client to present a test/assessment interface.
 * Fetches assessment configuration from the database and returns it
 * as part of the action result so the WS handler can forward it to the client.
 */

import type { ActionResult, ActionContext } from '@types';

export async function execute(
  payload: Record<string, unknown> | undefined,
  context: ActionContext
): Promise<ActionResult> {
  const { agent, services } = context;

  // Fetch assessment config if it exists for this agent
  let assessmentConfig: Record<string, unknown> | undefined;

  if (services.assessmentRepo) {
    const assessment = await services.assessmentRepo.findByAgentId(agent._id);
    if (assessment) {
      assessmentConfig = {
        testContent: assessment.testContent,
        language: assessment.language,
        durationSeconds: assessment.durationSeconds,
      };
    }
  }

  return {
    isComplete: false,
    clientPayload: {
      action: {
        type: 'openAssessment',
        payload: {
          assessment: assessmentConfig,
          ...payload,
        },
      },
    },
  };
}
