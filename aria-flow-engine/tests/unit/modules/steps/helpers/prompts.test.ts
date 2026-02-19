/**
 * Unit tests for steps/helpers/prompts
 */

jest.mock('../../../../../src/modules/steps/definitions', () => ({
  STEP_REGISTRY: {} as any,
  STEP_INPUT_SCHEMAS: {},
  STEP_REGISTRY_BY_CATEGORY: {},
}));

import { STEP_REGISTRY } from '../../../../../src/modules/steps/definitions';
import {
  getConversationPromptId,
  getSystemPromptId,
  getBasePromptKey,
  hasPrompts,
  getSupportedLanguages,
  isLanguageSupported,
} from '../../../../../src/modules/steps/helpers/prompts';

const registry = STEP_REGISTRY as Record<string, any>;

beforeEach(() => {
  for (const key of Object.keys(registry)) {
    delete registry[key];
  }
});

describe('getConversationPromptId', () => {
  it('should throw for unknown step', () => {
    expect(() => getConversationPromptId('unknown', 'en-US')).toThrow();
  });

  it('should return prompt ID with English suffix', () => {
    registry.intro = { id: 'intro', prompts: { conversation: 'intro' } };
    expect(getConversationPromptId('intro', 'en-US')).toBe('intro_en');
  });

  it('should return prompt ID with Italian suffix', () => {
    registry.intro = { id: 'intro', prompts: { conversation: 'intro' } };
    expect(getConversationPromptId('intro', 'it-IT')).toBe('intro_it');
  });

  it('should handle en-GB mapping to en', () => {
    registry.intro = { id: 'intro', prompts: { conversation: 'intro' } };
    expect(getConversationPromptId('intro', 'en-GB')).toBe('intro_en');
  });

  it('should fall back to prefix for unknown language code', () => {
    registry.intro = { id: 'intro', prompts: { conversation: 'intro' } };
    expect(getConversationPromptId('intro', 'ja-JP')).toBe('intro_ja');
  });
});

describe('getSystemPromptId', () => {
  it('should return undefined for unknown step', () => {
    expect(getSystemPromptId('unknown')).toBeUndefined();
  });

  it('should return conversation key without suffix when no language', () => {
    registry.intro = { id: 'intro', prompts: { conversation: 'intro-conv' } };
    expect(getSystemPromptId('intro')).toBe('intro-conv');
  });

  it('should return conversation key with suffix when language provided', () => {
    registry.intro = { id: 'intro', prompts: { conversation: 'intro-conv' } };
    expect(getSystemPromptId('intro', 'it-IT')).toBe('intro-conv_it');
  });

  it('should return undefined when step has no prompts', () => {
    registry.intro = { id: 'intro', prompts: {} };
    expect(getSystemPromptId('intro')).toBeUndefined();
  });
});

describe('getBasePromptKey', () => {
  it('should return undefined for unknown step', () => {
    expect(getBasePromptKey('unknown')).toBeUndefined();
  });

  it('should return the conversation prompt key', () => {
    registry.intro = { id: 'intro', prompts: { conversation: 'intro-conv' } };
    expect(getBasePromptKey('intro')).toBe('intro-conv');
  });
});

describe('hasPrompts', () => {
  it('should return false for unknown step', () => {
    expect(hasPrompts('unknown')).toBe(false);
  });

  it('should return true when conversation prompts exist', () => {
    registry.intro = { id: 'intro', prompts: { conversation: 'intro' } };
    expect(hasPrompts('intro')).toBe(true);
  });

  it('should return false when no conversation prompt', () => {
    registry.intro = { id: 'intro', prompts: {} };
    expect(hasPrompts('intro')).toBe(false);
  });
});

describe('getSupportedLanguages', () => {
  it('should return all supported language codes', () => {
    const languages = getSupportedLanguages();
    expect(languages).toContain('en-US');
    expect(languages).toContain('en-GB');
    expect(languages).toContain('it-IT');
    expect(languages).toContain('de-DE');
    expect(languages).toContain('fr-FR');
    expect(languages).toContain('es-ES');
    expect(languages).toContain('pt-BR');
    expect(languages).toContain('pt-PT');
    expect(languages.length).toBeGreaterThanOrEqual(8);
  });
});

describe('isLanguageSupported', () => {
  it('should return true for exact matches', () => {
    expect(isLanguageSupported('en-US')).toBe(true);
    expect(isLanguageSupported('it-IT')).toBe(true);
  });

  it('should return true for valid 2-letter prefix format', () => {
    expect(isLanguageSupported('ja-JP')).toBe(true);
  });

  it('should return false for invalid format', () => {
    expect(isLanguageSupported('invalid')).toBe(false);
  });
});
