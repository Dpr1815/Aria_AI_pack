/**
 * ws.utils Unit Tests
 */

import type { ProcessResult } from '@types';
import {
  send,
  sendError,
  sendSafeError,
  sendProcessingStart,
  sendProcessingEnd,
  deliverResponse,
  streamSynthesis,
} from '@controllers/handlers/ws.utils';
import { AppError } from '@utils';

function createMockWs() {
  const ws: any = {
    OPEN: 1,
    readyState: 1,
    send: jest.fn(),
  };
  return ws;
}

function parseSent(ws: any, callIndex = 0): any {
  return JSON.parse(ws.send.mock.calls[callIndex][0]);
}

function allSent(ws: any): any[] {
  return ws.send.mock.calls.map((c: any) => JSON.parse(c[0]));
}

const voiceConfig = { languageCode: 'en-US', name: 'en-US-Journey-D', gender: 'MALE' as const };

describe('ws.utils', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── send ──

  describe('send', () => {
    it('sends JSON when socket is OPEN', () => {
      const ws = createMockWs();
      send(ws, { type: 'response', content: 'hi', currentStep: 'a', isComplete: false } as any);

      expect(ws.send).toHaveBeenCalledTimes(1);
      expect(parseSent(ws)).toMatchObject({ type: 'response', content: 'hi' });
    });

    it('does not send when socket is not OPEN', () => {
      const ws = createMockWs();
      ws.readyState = 3; // CLOSED
      send(ws, { type: 'response' } as any);

      expect(ws.send).not.toHaveBeenCalled();
    });
  });

  // ── sendError ──

  describe('sendError', () => {
    it('sends error message with code and recoverable flag', () => {
      const ws = createMockWs();
      sendError(ws, 'Something broke', 'ERR_TEST', false);

      const msg = parseSent(ws);
      expect(msg.type).toBe('error');
      expect(msg.error).toBe('Something broke');
      expect(msg.code).toBe('ERR_TEST');
      expect(msg.recoverable).toBe(false);
    });

    it('defaults recoverable to true', () => {
      const ws = createMockWs();
      sendError(ws, 'Oops', 'ERR');

      expect(parseSent(ws).recoverable).toBe(true);
    });
  });

  // ── sendSafeError ──

  describe('sendSafeError', () => {
    it('sends operational error message as-is', () => {
      const ws = createMockWs();
      const error = new AppError('Bad input', 400, 'BAD_INPUT', true);
      sendSafeError(ws, error, 'ERR_INPUT');

      expect(parseSent(ws).error).toBe('Bad input');
    });

    it('sends generic message for non-operational errors', () => {
      const ws = createMockWs();
      sendSafeError(ws, new Error('secret internal detail'), 'ERR');

      expect(parseSent(ws).error).toBe('An unexpected error occurred');
    });

    it('uses custom generic message when provided', () => {
      const ws = createMockWs();
      sendSafeError(ws, new TypeError('oops'), 'ERR', 'Something went wrong');

      expect(parseSent(ws).error).toBe('Something went wrong');
    });
  });

  // ── processing indicators ──

  describe('processing indicators', () => {
    it('sends processingStart with stage', () => {
      const ws = createMockWs();
      sendProcessingStart(ws, 'llm');

      expect(parseSent(ws)).toEqual({ type: 'processingStart', stage: 'llm' });
    });

    it('sends processingEnd with stage', () => {
      const ws = createMockWs();
      sendProcessingEnd(ws, 'tts');

      expect(parseSent(ws)).toEqual({ type: 'processingEnd', stage: 'tts' });
    });
  });

  // ── deliverResponse ──

  describe('deliverResponse', () => {
    const mockSynthesis = {
      synthesize: jest.fn().mockReturnValue((async function* () {})()),
    };

    function baseResult(overrides: Partial<ProcessResult> = {}): ProcessResult {
      return {
        text: 'Hello!',
        currentStep: 'greeting',
        isComplete: false,
        ...overrides,
      };
    }

    it('sends response message', async () => {
      const ws = createMockWs();
      await deliverResponse(ws, baseResult(), voiceConfig, mockSynthesis as any, false);

      const messages = allSent(ws);
      const response = messages.find((m) => m.type === 'response');
      expect(response).toMatchObject({ content: 'Hello!', currentStep: 'greeting' });
    });

    it('sends stepChanged when step advanced', async () => {
      const ws = createMockWs();
      const result = baseResult({ stepAdvanced: true, currentStep: 'interview' });
      await deliverResponse(ws, result, voiceConfig, mockSynthesis as any, false);

      const messages = allSent(ws);
      const stepMsg = messages.find((m) => m.type === 'stepChanged');
      expect(stepMsg).toMatchObject({ type: 'stepChanged', to: 'interview' });
    });

    it('sends conversationComplete when session is complete', async () => {
      const ws = createMockWs();
      const result = baseResult({ isComplete: true });
      await deliverResponse(ws, result, voiceConfig, mockSynthesis as any, false);

      const messages = allSent(ws);
      expect(messages.find((m) => m.type === 'conversationComplete')).toBeDefined();
    });

    it('does not send stepChanged when step did not advance', async () => {
      const ws = createMockWs();
      await deliverResponse(ws, baseResult(), voiceConfig, mockSynthesis as any, false);

      const messages = allSent(ws);
      expect(messages.find((m) => m.type === 'stepChanged')).toBeUndefined();
    });

    it('sends action effects BEFORE response when timing is before_response', async () => {
      const ws = createMockWs();
      const result = baseResult({
        action: 'STEP_COMPLETED',
        actionTiming: 'before_response',
        stepAdvanced: true,
        currentStep: 'interview',
      });
      await deliverResponse(ws, result, voiceConfig, mockSynthesis as any, false);

      const messages = allSent(ws);
      const stepIdx = messages.findIndex((m) => m.type === 'stepChanged');
      const respIdx = messages.findIndex((m) => m.type === 'response');
      expect(stepIdx).toBeLessThan(respIdx);
    });

    it('sends action effects AFTER response when timing is after_response', async () => {
      const ws = createMockWs();
      const result = baseResult({
        action: 'STEP_COMPLETED',
        actionTiming: 'after_response',
        stepAdvanced: true,
        currentStep: 'interview',
      });
      await deliverResponse(ws, result, voiceConfig, mockSynthesis as any, false);

      const messages = allSent(ws);
      const stepIdx = messages.findIndex((m) => m.type === 'stepChanged');
      const respIdx = messages.findIndex((m) => m.type === 'response');
      expect(respIdx).toBeLessThan(stepIdx);
    });

    it('sends follow-up text as second response when present', async () => {
      const ws = createMockWs();
      const result = baseResult({
        followUpText: 'Welcome to the next step!',
        currentStep: 'interview',
      });
      await deliverResponse(ws, result, voiceConfig, mockSynthesis as any, false);

      const responses = allSent(ws).filter((m) => m.type === 'response');
      expect(responses).toHaveLength(2);
      expect(responses[0].content).toBe('Hello!');
      expect(responses[1].content).toBe('Welcome to the next step!');
    });

    it('sends clientPayload as a response message', async () => {
      const ws = createMockWs();
      const result = baseResult({
        clientPayload: { testConfig: { duration: 120 } },
      });
      await deliverResponse(ws, result, voiceConfig, mockSynthesis as any, false);

      const messages = allSent(ws);
      const payloadMsg = messages.find((m) => m.testConfig);
      expect(payloadMsg).toBeDefined();
      expect(payloadMsg.testConfig).toEqual({ duration: 120 });
    });
  });

  // ── streamSynthesis ──

  describe('streamSynthesis', () => {
    it('streams audio and lipSync chunks', async () => {
      const ws = createMockWs();
      const chunk = {
        audio: Buffer.from('audio-data'),
        visemes: [{ value: 'A', time: 0 }],
        duration: 1.5,
        text: 'Hello',
        chunkIndex: 0,
        totalChunks: 1,
        isFirst: true,
        isLast: true,
        sampleRate: 24000,
      };

      const synthesis = {
        synthesize: jest.fn().mockReturnValue(
          (async function* () {
            yield chunk;
          })()
        ),
      };

      await streamSynthesis(ws, 'Hello', voiceConfig, synthesis as any, true);

      const messages = allSent(ws);
      expect(messages.find((m) => m.type === 'processingStart')).toMatchObject({ stage: 'tts' });
      expect(messages.find((m) => m.type === 'lipSync')).toBeDefined();
      expect(messages.find((m) => m.type === 'audio')).toBeDefined();
      expect(messages.find((m) => m.type === 'processingEnd')).toMatchObject({ stage: 'tts' });
    });

    it('skips lipSync message when visemes are empty', async () => {
      const ws = createMockWs();
      const chunk = {
        audio: Buffer.from('data'),
        visemes: [],
        duration: 1,
        text: 'Hi',
        chunkIndex: 0,
        totalChunks: 1,
        isFirst: true,
        isLast: true,
        sampleRate: 24000,
      };

      const synthesis = {
        synthesize: jest.fn().mockReturnValue(
          (async function* () {
            yield chunk;
          })()
        ),
      };

      await streamSynthesis(ws, 'Hi', voiceConfig, synthesis as any, true);

      const messages = allSent(ws);
      expect(messages.find((m) => m.type === 'lipSync')).toBeUndefined();
      expect(messages.find((m) => m.type === 'audio')).toBeDefined();
    });

    it('sends processingEnd even when synthesis throws', async () => {
      const ws = createMockWs();
      const synthesis = {
        synthesize: jest.fn().mockReturnValue(
          (async function* () {
            throw new Error('TTS failed');
          })()
        ),
      };

      await streamSynthesis(ws, 'Hi', voiceConfig, synthesis as any, true);

      const messages = allSent(ws);
      expect(messages.find((m) => m.type === 'processingEnd')).toBeDefined();
    });
  });
});
