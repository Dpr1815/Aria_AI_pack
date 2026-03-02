/**
 * Submit Data Handler
 *
 * Handles the 'submitData' message type.
 * Stores data in session and processes with LLM via ConversationService.
 *
 * Flow:
 * 1. Validate session
 * 2. Forward to ConversationService.processDataSubmission
 * 3. Deliver response with action timing
 */

import type { WebSocket } from 'ws';
import { ErrorCode, type SubmitDataMessage, type ClientMessage, type HandlerContext } from '@types';
import { sendError, sendSafeError, deliverResponse } from './ws.utils';
import { createLogger } from '@utils';

const logger = createLogger('SubmitDataHandler');

export async function execute(
  ws: WebSocket,
  message: ClientMessage,
  context: HandlerContext
): Promise<void> {
  const { services, connectionState } = context;
  const submitMessage = message as SubmitDataMessage;

  try {
    connectionState.lastActivityAt = new Date();

    if (!connectionState.sessionId || !connectionState.agent) {
      sendError(ws, 'Session not initialized. Please reconnect.', ErrorCode.NO_SESSION);
      return;
    }

    const { dataType, payload, latency } = submitMessage;

    // Process via ConversationService (stores data + calls LLM)
    const result = await services.conversation.processDataSubmission(
      connectionState.sessionId,
      dataType,
      payload,
      latency
    );

    // Deliver response with action timing
    const voiceConfig = connectionState.agent.voice;
    const lipSyncEnabled = connectionState.agent.features.lipSync;
    await deliverResponse(ws, result, voiceConfig, services.synthesis, lipSyncEnabled);

    // Apply voice override if action changed the voice (e.g. START/STOP_LINGUISTIC)
    if (result.voiceOverride && connectionState.agent) {
      connectionState.agent = { ...connectionState.agent, voice: result.voiceOverride };
    }

    if (result.isComplete) {
      connectionState.session = null;
    }
  } catch (error) {
    logger.error('Submit data error', error instanceof Error ? error : undefined);
    sendSafeError(ws, error, ErrorCode.SUBMIT_DATA_ERROR);
  }
}
