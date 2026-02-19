/**
 * WebSocket Utilities
 *
 * Shared helpers for all WS handlers.
 * Eliminates duplication of send/error/synthesis streaming logic.
 */

import type { WebSocket } from 'ws';
import type {
  AudioResponseMessage,
  LipSyncMessage,
  ResponseMessage,
  StepChangedMessage,
  ConversationCompleteMessage,
  ProcessingStartMessage,
  ProcessingEndMessage,
  ServerMessage,
  HandlerContext,
} from '@types';
import type { VoiceConfig, SynthesisChunk } from '@types';
import type { ProcessResult } from '@types';
import { createLogger } from '@utils';

const logger = createLogger('WebSocketUtils');

// ============================================
// Core Send
// ============================================

export function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function sendError(ws: WebSocket, error: string, code?: string, recoverable = true): void {
  send(ws, { type: 'error', error, code, recoverable });
}

// ============================================
// Processing Indicators
// ============================================

export function sendProcessingStart(ws: WebSocket, stage: ProcessingStartMessage['stage']): void {
  send(ws, { type: 'processingStart', stage });
}

export function sendProcessingEnd(ws: WebSocket, stage: ProcessingEndMessage['stage']): void {
  send(ws, { type: 'processingEnd', stage });
}

// ============================================
// Response Delivery (with action timing)
// ============================================

/**
 * Deliver a ProcessResult to the client, respecting action timing.
 *
 * Flow:
 * 1. Send main response text + audio (respecting before/after timing with action effects)
 * 2. If followUpText exists (e.g. new step opening after STEP_COMPLETED),
 *    send it as a second response + audio stream.
 */
export async function deliverResponse(
  ws: WebSocket,
  result: ProcessResult,
  voiceConfig: VoiceConfig,
  synthesisService: HandlerContext['services']['synthesis'],
  lipSyncEnabled: boolean
): Promise<void> {
  const timing = result.actionTiming ?? 'after_response';

  if (timing === 'before_response') {
    sendActionEffects(ws, result);
    await sendResponseWithAudio(
      ws,
      result.text,
      result.currentStep,
      result.isComplete,
      result.action,
      voiceConfig,
      synthesisService,
      lipSyncEnabled
    );
  } else {
    await sendResponseWithAudio(
      ws,
      result.text,
      result.currentStep,
      result.isComplete,
      result.action,
      voiceConfig,
      synthesisService,
      lipSyncEnabled
    );
    sendActionEffects(ws, result);
  }

  // Follow-up: AI opening for the new step (e.g. after STEP_COMPLETED)
  // Use voice override if the action changed the voice (e.g. START_LINGUISTIC)
  if (result.followUpText) {
    await sendResponseWithAudio(
      ws,
      result.followUpText,
      result.currentStep,
      result.isComplete,
      undefined,
      result.voiceOverride ?? voiceConfig,
      synthesisService,
      lipSyncEnabled
    );
  }
}

/**
 * Send a text response message + stream TTS audio for it.
 */
async function sendResponseWithAudio(
  ws: WebSocket,
  text: string,
  currentStep: string,
  isComplete: boolean,
  action: string | undefined,
  voiceConfig: VoiceConfig,
  synthesisService: HandlerContext['services']['synthesis'],
  lipSyncEnabled: boolean
): Promise<void> {
  const responseMsg: ResponseMessage = {
    type: 'response',
    content: text,
    currentStep,
    isComplete,
    action,
  };
  send(ws, responseMsg);

  if (text) {
    await streamSynthesis(ws, text, voiceConfig, synthesisService, lipSyncEnabled);
  }
}

/**
 * Send action side-effects to the client (step change, completion, client payload).
 */
function sendActionEffects(ws: WebSocket, result: ProcessResult): void {
  if (result.stepAdvanced && result.currentStep) {
    const stepMsg: StepChangedMessage = {
      type: 'stepChanged',
      from: '',
      to: result.currentStep,
    };
    send(ws, stepMsg);
  }

  if (result.isComplete) {
    const completeMsg: ConversationCompleteMessage = {
      type: 'conversationComplete',
    };
    send(ws, completeMsg);
  }

  if (result.clientPayload) {
    send(ws, {
      type: 'response',
      content: '',
      currentStep: result.currentStep,
      isComplete: result.isComplete,
      ...result.clientPayload,
    } as ResponseMessage);
  }
}

// ============================================
// TTS Synthesis Streaming
// ============================================

/**
 * Stream TTS synthesis with lip sync data to the client.
 * Sends interleaved lipSync + audio chunk messages.
 *
 * SynthesisService fires all TTS requests in parallel internally,
 * so chunks arrive as fast as possible while maintaining order.
 */
export async function streamSynthesis(
  ws: WebSocket,
  text: string,
  voiceConfig: VoiceConfig,
  synthesisService: HandlerContext['services']['synthesis'],
  lipSyncEnabled = true
): Promise<void> {
  try {
    sendProcessingStart(ws, 'tts');

    const stream = synthesisService.synthesize(text, voiceConfig, lipSyncEnabled);

    for await (const chunk of stream) {
      sendSynthesisChunk(ws, chunk);
    }

    sendProcessingEnd(ws, 'tts');
  } catch (error) {
    logger.error('Synthesis streaming error', error instanceof Error ? error : undefined);
    sendProcessingEnd(ws, 'tts');
  }
}

/**
 * Send a single synthesis chunk (lip sync + audio).
 */
function sendSynthesisChunk(ws: WebSocket, chunk: SynthesisChunk): void {
  if (chunk.visemes.length > 0) {
    const lipSyncMsg: LipSyncMessage = {
      type: 'lipSync',
      cues: chunk.visemes,
      duration: chunk.duration,
      text: chunk.text,
      chunkIndex: chunk.chunkIndex,
      totalChunks: chunk.totalChunks,
      isFirst: chunk.isFirst,
      isLast: chunk.isLast,
    };
    send(ws, lipSyncMsg);
  }

  const audioMsg: AudioResponseMessage = {
    type: 'audio',
    data: chunk.audio.toString('base64'),
    chunkIndex: chunk.chunkIndex,
    totalChunks: chunk.totalChunks,
    isFirstChunk: chunk.isFirst,
    isLastChunk: chunk.isLast,
    sampleRate: chunk.sampleRate,
    duration: chunk.duration,
    text: chunk.text,
  };
  send(ws, audioMsg);
}
