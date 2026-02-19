/**
 * WebSocket Validation Unit Tests
 */

import {
  parseClientMessage,
  safeParseClientMessage,
  parseDataPayload,
  formatValidationError,
  InitMessageSchema,
  AudioMessageSchema,
  StopRecordingMessageSchema,
  SubmitDataMessageSchema,
  TestSolutionPayloadSchema,
  FormResponsePayloadSchema,
} from '@validations/websocket.validation';
import { z } from 'zod';

describe('Client Message Schemas', () => {
  describe('InitMessageSchema', () => {
    it('accepts valid init message', () => {
      const result = InitMessageSchema.safeParse({
        type: 'init',
        accessToken: 'my-token-123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty accessToken', () => {
      const result = InitMessageSchema.safeParse({
        type: 'init',
        accessToken: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing accessToken', () => {
      const result = InitMessageSchema.safeParse({ type: 'init' });
      expect(result.success).toBe(false);
    });
  });

  describe('AudioMessageSchema', () => {
    it('accepts valid audio message', () => {
      const result = AudioMessageSchema.safeParse({
        type: 'audio',
        data: 'base64audiodata',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty data', () => {
      const result = AudioMessageSchema.safeParse({
        type: 'audio',
        data: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('StopRecordingMessageSchema', () => {
    it('accepts message without latency', () => {
      const result = StopRecordingMessageSchema.safeParse({
        type: 'stopRecording',
      });
      expect(result.success).toBe(true);
    });

    it('accepts message with latency', () => {
      const result = StopRecordingMessageSchema.safeParse({
        type: 'stopRecording',
        latency: 150,
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative latency', () => {
      const result = StopRecordingMessageSchema.safeParse({
        type: 'stopRecording',
        latency: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SubmitDataMessageSchema', () => {
    it('accepts valid submit data message', () => {
      const result = SubmitDataMessageSchema.safeParse({
        type: 'submitData',
        dataType: 'formResponse',
        payload: { answer: 42 },
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty dataType', () => {
      const result = SubmitDataMessageSchema.safeParse({
        type: 'submitData',
        dataType: '',
        payload: {},
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('parseClientMessage', () => {
  it('parses valid init message', () => {
    const msg = parseClientMessage({ type: 'init', accessToken: 'token' });
    expect(msg.type).toBe('init');
  });

  it('parses valid startRecording message', () => {
    const msg = parseClientMessage({ type: 'startRecording' });
    expect(msg.type).toBe('startRecording');
  });

  it('parses valid audio message', () => {
    const msg = parseClientMessage({ type: 'audio', data: 'abc123' });
    expect(msg.type).toBe('audio');
  });

  it('throws on invalid message', () => {
    expect(() => parseClientMessage({ type: 'invalid' })).toThrow();
  });

  it('throws on missing type', () => {
    expect(() => parseClientMessage({ accessToken: 'token' })).toThrow();
  });
});

describe('safeParseClientMessage', () => {
  it('returns success for valid message', () => {
    const result = safeParseClientMessage({ type: 'startRecording' });
    expect(result.success).toBe(true);
  });

  it('returns error for invalid message', () => {
    const result = safeParseClientMessage({ type: 'bad' });
    expect(result.success).toBe(false);
  });
});

describe('parseDataPayload', () => {
  it('validates testSolution payload', () => {
    const result = parseDataPayload('testSolution', {
      solution: 'console.log("hello")',
      language: 'javascript',
    });
    expect(result).toHaveProperty('solution');
  });

  it('validates formResponse payload', () => {
    const result = parseDataPayload('formResponse', {
      fields: { name: 'John' },
    });
    expect(result).toHaveProperty('fields');
  });

  it('passes through unknown data types', () => {
    const payload = { custom: 'data' };
    expect(parseDataPayload('customType', payload)).toBe(payload);
  });

  it('throws on invalid testSolution payload', () => {
    expect(() => parseDataPayload('testSolution', { solution: '' })).toThrow();
  });
});

describe('formatValidationError', () => {
  it('formats Zod errors into readable string', () => {
    const result = InitMessageSchema.safeParse({ type: 'init' });
    if (!result.success) {
      const formatted = formatValidationError(result.error);
      expect(formatted).toContain('accessToken');
    }
  });
});
