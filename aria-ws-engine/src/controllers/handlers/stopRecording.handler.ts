/**
 * Stop Recording Handler
 *
 * Handles the 'stopRecording' message type.
 * Finalizes transcription, processes with LLM, delivers response with action timing.
 *
 * Flow:
 * 1. End transcription stream → get transcript
 * 2. Send transcript to client
 * 3. Process with ConversationService
 * 4. Deliver response (respects action timing: before/after audio)
 */

import type { WebSocket } from 'ws';
import {
  ErrorCode,
  type StopRecordingMessage,
  type ClientMessage,
  type HandlerContext,
  type TranscriptMessage,
} from '@types';
import {
  send,
  sendError,
  sendSafeError,
  sendProcessingStart,
  sendProcessingEnd,
  deliverResponse,
} from './ws.utils';
import { createLogger } from '@utils';

const logger = createLogger('StopRecordingHandler');

export async function execute(
  ws: WebSocket,
  message: ClientMessage,
  context: HandlerContext
): Promise<void> {
  const { services, connectionState } = context;
  const stopMessage = message as StopRecordingMessage;

  try {
    connectionState.lastActivityAt = new Date();

    // 1. End transcription and get final transcript
    let transcript = '';
    if (connectionState.transcriptionSessionId) {
      sendProcessingStart(ws, 'stt');
      const transcriptionId = connectionState.transcriptionSessionId;
      connectionState.transcriptionSessionId = null; // prevent trailing audio chunks from hitting a dead session
      transcript = await services.transcription.endSession(transcriptionId);
      sendProcessingEnd(ws, 'stt');
    }

    transcript = transcript.trim();

    if (!transcript) {
      sendError(ws, 'Transcription empty. Please try speaking again.', ErrorCode.EMPTY_TRANSCRIPT);
      return;
    }

    // 2. Send transcript to client
    const transcriptMsg: TranscriptMessage = {
      type: 'transcript',
      transcript,
    };
    send(ws, transcriptMsg);

    // 3. Validate session
    if (!connectionState.sessionId || !connectionState.agent) {
      sendError(ws, 'Session not initialized. Please reconnect.', ErrorCode.NO_SESSION);
      return;
    }

    // 4. Process with ConversationService
    sendProcessingStart(ws, 'llm');
    const result = await services.conversation.processUserInput(
      connectionState.sessionId,
      transcript,
      stopMessage.latency
    );
    sendProcessingEnd(ws, 'llm');

    // 5. Deliver response with action timing
    const voiceConfig = connectionState.agent.voice;
    const lipSyncEnabled = connectionState.agent.features.lipSync;
    await deliverResponse(ws, result, voiceConfig, services.synthesis, lipSyncEnabled);

    // 6. Apply voice override if action changed the voice (e.g. START/STOP_LINGUISTIC)
    if (result.voiceOverride && connectionState.agent) {
      connectionState.agent = { ...connectionState.agent, voice: result.voiceOverride };
    }

    // 7. Update connection state if step changed or completed
    if (result.isComplete) {
      connectionState.session = null; // Session is done
    }

    logger.info('Stop recording complete', { step: result.currentStep });
  } catch (error) {
    logger.error('Stop recording error', error instanceof Error ? error : undefined);

    // Cleanup transcription on error
    if (connectionState.transcriptionSessionId) {
      services.transcription.destroySession(connectionState.transcriptionSessionId);
      connectionState.transcriptionSessionId = null;
    }

    sendSafeError(ws, error, ErrorCode.STOP_RECORDING_ERROR);
  }
}
