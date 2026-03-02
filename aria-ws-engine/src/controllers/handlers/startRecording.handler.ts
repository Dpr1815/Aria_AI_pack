/**
 * Start Recording Handler
 *
 * Handles the 'startRecording' message type.
 * Initializes the STT streaming session.
 */

import type { WebSocket } from 'ws';
import { ErrorCode, type ClientMessage, type HandlerContext } from '@types';
import { sendSafeError } from './ws.utils';
import { createLogger } from '@utils';

const logger = createLogger('StartRecordingHandler');

export async function execute(
  ws: WebSocket,
  _message: ClientMessage,
  context: HandlerContext
): Promise<void> {
  const { services, connectionState } = context;

  try {
    connectionState.lastActivityAt = new Date();

    // Destroy existing transcription session if any
    if (connectionState.transcriptionSessionId) {
      services.transcription.destroySession(connectionState.transcriptionSessionId);
      connectionState.transcriptionSessionId = null;
    }

    // Get language from agent voice config
    const languageCode = connectionState.agent?.voice?.languageCode ?? 'en-US';

    // Generate unique session ID
    const transcriptionSessionId = `${connectionState.sessionId}-${Date.now()}`;

    // Create transcription session
    services.transcription.createSession(transcriptionSessionId, {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode,
    });

    connectionState.transcriptionSessionId = transcriptionSessionId;
  } catch (error) {
    logger.error('Start recording error', error instanceof Error ? error : undefined);
    sendSafeError(ws, error, ErrorCode.START_RECORDING_ERROR);
  }
}
