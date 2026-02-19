/**
 * AI Validation Unit Tests
 */

import {
  parseAIResponse,
  safeParseAIResponse,
  parseAIResponseFromString,
  hasAction,
  formatAIValidationError,
  parseSummary,
  SectionResultSchema,
} from '@validations/ai.validation';

describe('parseAIResponse', () => {
  it('parses valid response with action', () => {
    const result = parseAIResponse({ text: 'Hello!', action: 'STEP_COMPLETED' });
    expect(result.text).toBe('Hello!');
    expect(result.action).toBe('STEP_COMPLETED');
  });

  it('parses response without action', () => {
    const result = parseAIResponse({ text: 'Hello!' });
    expect(result.text).toBe('Hello!');
    expect(result.action).toBeUndefined();
  });

  it('normalizes empty action string to undefined', () => {
    const result = parseAIResponse({ text: 'Hello!', action: '' });
    expect(result.action).toBeUndefined();
  });

  it('normalizes whitespace-only action to undefined', () => {
    const result = parseAIResponse({ text: 'Hello!', action: '   ' });
    expect(result.action).toBeUndefined();
  });

  it('trims action string', () => {
    const result = parseAIResponse({ text: 'Hello!', action: ' STEP_COMPLETED ' });
    expect(result.action).toBe('STEP_COMPLETED');
  });

  it('throws on missing text', () => {
    expect(() => parseAIResponse({ action: 'STEP_COMPLETED' })).toThrow();
  });

  it('throws on empty text', () => {
    expect(() => parseAIResponse({ text: '' })).toThrow();
  });
});

describe('safeParseAIResponse', () => {
  it('returns success for valid response', () => {
    const result = safeParseAIResponse({ text: 'Hi!', action: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text).toBe('Hi!');
      expect(result.data.action).toBeUndefined(); // normalized
    }
  });

  it('returns error for invalid response', () => {
    const result = safeParseAIResponse({ text: '' });
    expect(result.success).toBe(false);
  });
});

describe('parseAIResponseFromString', () => {
  it('parses valid JSON string', () => {
    const json = JSON.stringify({ text: 'Hello!', action: 'STEP_COMPLETED' });
    const result = parseAIResponseFromString(json);
    expect(result.text).toBe('Hello!');
    expect(result.action).toBe('STEP_COMPLETED');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseAIResponseFromString('not json')).toThrow('Invalid JSON');
  });

  it('throws on valid JSON but invalid schema', () => {
    expect(() => parseAIResponseFromString(JSON.stringify({ foo: 'bar' }))).toThrow();
  });
});

describe('hasAction', () => {
  it('returns true when action is present', () => {
    expect(hasAction({ text: 'Hi', action: 'STEP_COMPLETED' })).toBe(true);
  });

  it('returns false when action is undefined', () => {
    expect(hasAction({ text: 'Hi' })).toBe(false);
  });

  it('returns false when action is empty string', () => {
    expect(hasAction({ text: 'Hi', action: '' })).toBe(false);
  });
});

describe('SectionResultSchema', () => {
  it('accepts valid section result', () => {
    const result = SectionResultSchema.safeParse({
      analysis: 'Good performance overall',
      score: 85,
      highlights: ['Quick thinking'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects score above 100', () => {
    const result = SectionResultSchema.safeParse({
      analysis: 'Good',
      score: 150,
    });
    expect(result.success).toBe(false);
  });

  it('rejects score below 0', () => {
    const result = SectionResultSchema.safeParse({
      analysis: 'Good',
      score: -5,
    });
    expect(result.success).toBe(false);
  });
});

describe('parseSummary', () => {
  it('parses valid summary', () => {
    const summary = parseSummary({
      sections: {
        technical: { analysis: 'Good coding skills', score: 80 },
        behavioral: { analysis: 'Strong communicator' },
      },
      overallScore: 85,
    });
    expect(summary.sections.technical.score).toBe(80);
    expect(summary.overallScore).toBe(85);
  });

  it('throws on invalid summary', () => {
    expect(() => parseSummary({ sections: 'invalid' })).toThrow();
  });
});

describe('formatAIValidationError', () => {
  it('formats errors with path', () => {
    const result = safeParseAIResponse({ text: '' });
    if (!result.success) {
      const formatted = formatAIValidationError(result.error);
      expect(formatted).toContain('AI Response Validation Failed');
    }
  });
});
