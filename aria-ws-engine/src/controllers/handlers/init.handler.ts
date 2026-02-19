/**
 * Init Handler
 *
 * Handles the 'init' message type.
 * Authenticates via access token, loads session, sends first AI message.
 *
 * Flow:
 * 1. Validate access token → get session
 * 2. Initialize conversation (loads agent, participant, calls LLM)
 * 3. Update connection state
 * 4. Send sessionReady to client
 * 5. Stream first AI message audio
 */

import type { WebSocket } from 'ws';
import {
  ErrorCode,
  type InitMessage,
  type ClientMessage,
  type HandlerContext,
  type SessionReadyMessage,
  type ResponseMessage,
} from '@types';
import { send, sendError, streamSynthesis } from './ws.utils';
import { createLogger } from '@utils';

const logger = createLogger('InitHandler');

export async function execute(
  ws: WebSocket,
  message: ClientMessage,
  context: HandlerContext
): Promise<void> {
  const { services, connectionState } = context;
  const initMessage = message as InitMessage;

  try {
    const authResult = await services.auth.validateAccessToken(initMessage.accessToken);

    if (!authResult.valid || !authResult.session) {
      sendError(ws, authResult.error ?? 'Authentication failed', ErrorCode.AUTH_FAILED, false);
      return;
    }

    const session = authResult.session;

    const initResult = await services.conversation.initialize(session._id);

    connectionState.isAuthenticated = true;
    connectionState.sessionId = session._id;
    connectionState.session = session;
    connectionState.agent = initResult.agent;
    connectionState.lastActivityAt = new Date();

    const readyMsg: SessionReadyMessage = {
      type: 'sessionReady',
      sessionId: session._id.toString(),
      currentStep: initResult.currentStep,
      isNewSession: initResult.isNewSession,
      agentConfig: {
        voice: initResult.agent.voice,
        features: initResult.agent.features,
        render: initResult.agent.render,
        stepCount: initResult.agent.stepOrder.length,
      },
    };
    send(ws, readyMsg);

    if (initResult.text) {
      const responseMsg: ResponseMessage = {
        type: 'response',
        content: initResult.text,
        currentStep: initResult.currentStep,
        isComplete: false,
      };
      send(ws, responseMsg);

      const voiceConfig = initResult.agent.voice;
      const lipSyncEnabled = initResult.agent.features.lipSync;
      await streamSynthesis(ws, initResult.text, voiceConfig, services.synthesis, lipSyncEnabled);
    }

    logger.info(`Init complete`, { sessionId: session._id.toString() });
  } catch (error) {
    logger.error('Init handler error', error instanceof Error ? error : undefined);
    sendError(ws, (error as Error).message, ErrorCode.INIT_ERROR);
  }
}
