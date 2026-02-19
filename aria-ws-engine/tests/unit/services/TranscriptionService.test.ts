/**
 * TranscriptionService Unit Tests
 */

import { TranscriptionService, TranscriptionError } from '@services/speech/TranscriptionService';
import { createMockSTTConnector } from '../../mocks/connectors/MockSTTConnector';

describe('TranscriptionService', () => {
  function createService(transcript = 'Hello world') {
    const { connector, stream } = createMockSTTConnector(transcript);
    const service = new TranscriptionService(connector as any);
    return { service, connector, stream };
  }

  // ── Session Management ──

  describe('createSession', () => {
    it('creates a new transcription session', () => {
      const { service, connector } = createService();
      const session = service.createSession('session-1');

      expect(session.id).toBe('session-1');
      expect(session.isActive).toBe(true);
      expect(session.transcript).toBe('');
      expect(connector.createStream).toHaveBeenCalled();
    });

    it('destroys existing session before creating new one', () => {
      const { service } = createService();
      const first = service.createSession('session-1');
      expect(first.isActive).toBe(true);

      service.createSession('session-1');
      // First session should be cleaned up
      expect(first.isActive).toBe(false);
    });

    it('uses default encoding and sample rate', () => {
      const { service, connector } = createService();
      service.createSession('session-1');

      expect(connector.createStream).toHaveBeenCalledWith(
        expect.objectContaining({
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
        })
      );
    });

    it('accepts custom STT config', () => {
      const { service, connector } = createService();
      service.createSession('session-1', {
        languageCode: 'it-IT',
        sampleRateHertz: 16000,
      });

      expect(connector.createStream).toHaveBeenCalledWith(
        expect.objectContaining({
          languageCode: 'it-IT',
          sampleRateHertz: 16000,
        })
      );
    });
  });

  describe('getSession / hasSession', () => {
    it('returns session when it exists', () => {
      const { service } = createService();
      service.createSession('session-1');

      expect(service.getSession('session-1')).not.toBeNull();
      expect(service.hasSession('session-1')).toBe(true);
    });

    it('returns null for non-existent session', () => {
      const { service } = createService();
      expect(service.getSession('missing')).toBeNull();
      expect(service.hasSession('missing')).toBe(false);
    });
  });

  describe('destroySession', () => {
    it('destroys and cleans up session', () => {
      const { service, stream } = createService();
      service.createSession('session-1');

      service.destroySession('session-1');

      expect(stream.destroy).toHaveBeenCalled();
      expect(service.hasSession('session-1')).toBe(false);
    });

    it('does nothing for non-existent session', () => {
      const { service } = createService();
      expect(() => service.destroySession('missing')).not.toThrow();
    });
  });

  describe('destroyAllSessions', () => {
    it('destroys all sessions', () => {
      const { service } = createService();
      service.createSession('session-1');
      service.createSession('session-2');

      expect(service.getActiveSessionCount()).toBe(2);

      service.destroyAllSessions();

      expect(service.getActiveSessionCount()).toBe(0);
    });
  });

  // ── Audio Processing ──

  describe('writeAudio', () => {
    it('writes chunk to the stream', () => {
      const { service, stream } = createService();
      service.createSession('session-1');

      const chunk = Buffer.from('audio-data');
      service.writeAudio('session-1', chunk);

      expect(stream.write).toHaveBeenCalledWith(chunk);
    });

    it('does nothing for non-existent session', () => {
      const { service } = createService();
      expect(() => service.writeAudio('missing', Buffer.from('data'))).not.toThrow();
    });
  });

  describe('endSession', () => {
    it('returns final transcript', async () => {
      const { service } = createService('Transcribed text');
      service.createSession('session-1');

      const transcript = await service.endSession('session-1');

      expect(transcript).toBe('Transcribed text');
      expect(service.hasSession('session-1')).toBe(false);
    });

    it('throws for non-existent session', async () => {
      const { service } = createService();
      await expect(service.endSession('missing')).rejects.toThrow(TranscriptionError);
    });

    it('emits complete event', async () => {
      const { service } = createService('Test transcript');
      service.createSession('session-1');

      const completeSpy = jest.fn();
      service.on('complete', completeSpy);

      await service.endSession('session-1');

      expect(completeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          transcript: 'Test transcript',
        })
      );
    });
  });

  // ── Convenience Methods ──

  describe('transcribeBuffer', () => {
    it('creates temp session, writes audio, and returns transcript', async () => {
      const { service } = createService('Buffer transcript');
      const audio = Buffer.from('audio-data');

      const result = await service.transcribeBuffer(audio);

      expect(result).toBe('Buffer transcript');
    });
  });

  describe('getActiveSessionCount / getActiveSessionIds', () => {
    it('returns correct count and IDs', () => {
      const { service } = createService();
      service.createSession('a');
      service.createSession('b');
      service.createSession('c');

      expect(service.getActiveSessionCount()).toBe(3);
      expect(service.getActiveSessionIds()).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    });
  });

  // ── Event Handling ──

  describe('stream events', () => {
    it('emits interim event when stream sends interim result', () => {
      const { service, stream } = createService();
      service.createSession('session-1');

      const interimSpy = jest.fn();
      service.on('interim', interimSpy);

      stream._triggerInterim({ transcript: 'Partial...', confidence: 0.8 });

      expect(interimSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          transcript: 'Partial...',
          confidence: 0.8,
        })
      );
    });

    it('emits final event and updates transcript on final result', () => {
      const { service, stream } = createService();
      service.createSession('session-1');

      const finalSpy = jest.fn();
      service.on('final', finalSpy);

      stream._triggerFinal({ transcript: 'Complete sentence.', confidence: 0.95 });

      expect(finalSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          transcript: 'Complete sentence.',
        })
      );
    });

    it('emits error event on stream error', () => {
      const { service, stream } = createService();
      service.createSession('session-1');

      const errorSpy = jest.fn();
      service.on('error', errorSpy);

      stream._triggerError(new Error('Stream failed'));

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          error: expect.any(Error),
        })
      );
    });
  });
});
