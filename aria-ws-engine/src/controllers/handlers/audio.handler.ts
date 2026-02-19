/**
 * Audio Handler
 *
 * Handles the 'audio' message type.
 * Pipes incoming audio chunks to the active transcription session.
 * Called frequently during recording — must be fast.
 */

import type { WebSocket } from 'ws';
import { ErrorCode, type AudioMessage, type ClientMessage, type HandlerContext } from '@types';
import { sendError } from './ws.utils';
import { createLogger } from '@utils';

const logger = createLogger('AudioHandler');

const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

function isValidBase64(str: string): boolean {
  return str.length > 0 && str.length % 4 === 0 && BASE64_REGEX.test(str);
}

export async function execute(
  ws: WebSocket,
  message: ClientMessage,
  context: HandlerContext
): Promise<void> {
  const { services, connectionState } = context;

  if (!connectionState.transcriptionSessionId) return;

  const { data } = message as AudioMessage;

  if (!isValidBase64(data)) {
    sendError(ws, 'Invalid base64 audio data', ErrorCode.INVALID_AUDIO);
    return;
  }

  try {
    const audioBuffer = Buffer.from(data, 'base64');
    services.transcription.writeAudio(connectionState.transcriptionSessionId, audioBuffer);
    connectionState.lastActivityAt = new Date();
  } catch (error) {
    // Log but don't send error — one bad chunk shouldn't break recording
    logger.error('Audio chunk error', error instanceof Error ? error : undefined);
  }
}
