/**
 * SynthesisService Unit Tests
 */

import { SynthesisService, SynthesisError } from '@services/speech/SynthesisService';
import { createMockTTSConnector, createMockLipSyncConnector } from '../../mocks/connectors/MockTTSConnector';

describe('SynthesisService', () => {
  const voiceConfig = {
    languageCode: 'en-US',
    name: 'en-US-Journey-D',
    gender: 'MALE' as const,
  };

  function createService(
    ttsOverrides?: Partial<ReturnType<typeof createMockTTSConnector>>,
    lipSyncEnabled = false,
    config?: Record<string, unknown>
  ) {
    const tts = { ...createMockTTSConnector(), ...ttsOverrides };
    const lipSync = createMockLipSyncConnector(lipSyncEnabled);
    return {
      service: new SynthesisService(tts as any, lipSync as any, config as any),
      tts,
      lipSync,
    };
  }

  // ── synthesize (streaming) ──

  describe('synthesize', () => {
    it('yields chunks for valid text', async () => {
      const { service } = createService();
      const chunks: any[] = [];

      for await (const chunk of service.synthesize('Hello there friend.', voiceConfig)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks[0]).toHaveProperty('audio');
      expect(chunks[0]).toHaveProperty('text');
      expect(chunks[0]).toHaveProperty('chunkIndex');
      expect(chunks[0]).toHaveProperty('duration');
    });

    it('returns nothing for empty text', async () => {
      const { service } = createService();
      const chunks: any[] = [];

      for await (const chunk of service.synthesize('', voiceConfig)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(0);
    });

    it('calls TTS connector for each sentence chunk', async () => {
      const { service, tts } = createService();

      const chunks: any[] = [];
      for await (const chunk of service.synthesize(
        'First sentence here. Second sentence here.',
        voiceConfig
      )) {
        chunks.push(chunk);
      }

      expect(tts.synthesize).toHaveBeenCalled();
    });

    it('marks first and last chunks correctly', async () => {
      const { service } = createService();
      const chunks: any[] = [];

      for await (const chunk of service.synthesize(
        'First sentence here is long enough. Second sentence here is also quite long.',
        voiceConfig
      )) {
        chunks.push(chunk);
      }

      if (chunks.length > 1) {
        expect(chunks[0].isFirst).toBe(true);
        expect(chunks[0].isLast).toBe(false);
        expect(chunks[chunks.length - 1].isLast).toBe(true);
      }
    });

    it('generates lip sync data when enabled', async () => {
      const { service, lipSync } = createService(undefined, true);

      const chunks: any[] = [];
      for await (const chunk of service.synthesize('Hello there friend.', voiceConfig, true)) {
        chunks.push(chunk);
      }

      expect(lipSync.generate).toHaveBeenCalled();
      expect(chunks[0].visemes.length).toBeGreaterThan(0);
    });

    it('skips lip sync when disabled', async () => {
      const { service, lipSync } = createService(undefined, false);

      const chunks: any[] = [];
      for await (const chunk of service.synthesize('Hello there friend.', voiceConfig, false)) {
        chunks.push(chunk);
      }

      expect(lipSync.generate).not.toHaveBeenCalled();
      expect(chunks[0].visemes).toEqual([]);
    });
  });

  // ── synthesizeAll ──

  describe('synthesizeAll', () => {
    it('collects all chunks and returns result', async () => {
      const { service } = createService();
      const result = await service.synthesizeAll('Hello there my friend, how are you doing.', voiceConfig);

      expect(result.chunks.length).toBeGreaterThanOrEqual(1);
      expect(result.totalDuration).toBeGreaterThan(0);
      expect(result.text).toBe('Hello there my friend, how are you doing.');
    });
  });

  // ── synthesizeSingle ──

  describe('synthesizeSingle', () => {
    it('synthesizes a single chunk without splitting', async () => {
      const { service } = createService();
      const chunk = await service.synthesizeSingle('Hello!', voiceConfig);

      expect(chunk.chunkIndex).toBe(0);
      expect(chunk.totalChunks).toBe(1);
      expect(chunk.isFirst).toBe(true);
      expect(chunk.isLast).toBe(true);
    });

    it('throws on empty text after cleaning', async () => {
      const { service } = createService();
      await expect(service.synthesizeSingle('', voiceConfig)).rejects.toThrow(SynthesisError);
    });
  });

  // ── synthesizeAudioOnly ──

  describe('synthesizeAudioOnly', () => {
    it('returns raw audio buffer', async () => {
      const { service } = createService();
      const audio = await service.synthesizeAudioOnly('Hello!', voiceConfig);

      expect(Buffer.isBuffer(audio)).toBe(true);
      expect(audio.length).toBeGreaterThan(0);
    });
  });

  // ── Utility Methods ──

  describe('estimateDuration', () => {
    it('estimates duration based on word count', () => {
      const { service } = createService();
      const duration = service.estimateDuration('one two three four five');
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('getChunkCount', () => {
    it('returns chunk count for text', () => {
      const { service } = createService();
      const count = service.getChunkCount('First sentence. Second sentence.');
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('returns 0 for empty text', () => {
      const { service } = createService();
      expect(service.getChunkCount('')).toBe(0);
    });
  });

  describe('isLipSyncAvailable', () => {
    it('returns true when enabled and connector is ready', () => {
      const { service } = createService(undefined, true);
      expect(service.isLipSyncAvailable()).toBe(true);
    });

    it('returns false when disabled', () => {
      const { service } = createService(undefined, false);
      expect(service.isLipSyncAvailable()).toBe(false);
    });
  });

  describe('setLipSyncEnabled', () => {
    it('updates the lip sync setting', () => {
      const { service } = createService(undefined, true);
      expect(service.isLipSyncAvailable()).toBe(true);

      service.setLipSyncEnabled(false);
      expect(service.isLipSyncAvailable()).toBe(false);
    });
  });
});
