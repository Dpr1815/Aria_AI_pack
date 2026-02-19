/**
 * Unit tests for Model Capabilities
 */

import { getModelCapabilities, ModelCapabilities } from '../../../../src/connectors/llm/model-capabilities';

describe('getModelCapabilities', () => {
  // ============================================
  // Standard models
  // ============================================

  describe('standard models', () => {
    const expectedStandard: ModelCapabilities = {
      supportsReasoning: false,
      supportsSamplingParams: true,
      tokenLimitParam: 'max_tokens',
    };

    it('should return STANDARD for gpt-4.1 models', () => {
      expect(getModelCapabilities('gpt-4.1-nano')).toEqual(expectedStandard);
      expect(getModelCapabilities('gpt-4.1-mini')).toEqual(expectedStandard);
      expect(getModelCapabilities('gpt-4.1')).toEqual(expectedStandard);
    });

    it('should return STANDARD for gpt-4o models', () => {
      expect(getModelCapabilities('gpt-4o')).toEqual(expectedStandard);
      expect(getModelCapabilities('gpt-4o-mini')).toEqual(expectedStandard);
    });

    it('should return STANDARD for gpt-4 models', () => {
      expect(getModelCapabilities('gpt-4')).toEqual(expectedStandard);
      expect(getModelCapabilities('gpt-4-turbo')).toEqual(expectedStandard);
    });

    it('should return STANDARD for gpt-3.5 models', () => {
      expect(getModelCapabilities('gpt-3.5-turbo')).toEqual(expectedStandard);
    });
  });

  // ============================================
  // Reasoning models
  // ============================================

  describe('reasoning models', () => {
    const expectedReasoning: ModelCapabilities = {
      supportsReasoning: true,
      supportsSamplingParams: false,
      tokenLimitParam: 'max_completion_tokens',
    };

    it('should return REASONING for gpt-5 models', () => {
      expect(getModelCapabilities('gpt-5')).toEqual(expectedReasoning);
      expect(getModelCapabilities('gpt-5-turbo')).toEqual(expectedReasoning);
    });

    it('should return REASONING for o3 models', () => {
      expect(getModelCapabilities('o3')).toEqual(expectedReasoning);
      expect(getModelCapabilities('o3-mini')).toEqual(expectedReasoning);
    });

    it('should return REASONING for o4 models', () => {
      expect(getModelCapabilities('o4')).toEqual(expectedReasoning);
      expect(getModelCapabilities('o4-mini')).toEqual(expectedReasoning);
    });
  });

  // ============================================
  // Prefix matching
  // ============================================

  describe('prefix matching', () => {
    it('should match gpt-4.1 before gpt-4 (more specific prefix first)', () => {
      const result = getModelCapabilities('gpt-4.1-nano');
      expect(result.supportsSamplingParams).toBe(true);
    });

    it('should return STANDARD for unknown models', () => {
      const result = getModelCapabilities('claude-3-opus');

      expect(result).toEqual({
        supportsReasoning: false,
        supportsSamplingParams: true,
        tokenLimitParam: 'max_tokens',
      });
    });

    it('should return STANDARD for empty string', () => {
      const result = getModelCapabilities('');

      expect(result.supportsReasoning).toBe(false);
    });
  });
});
