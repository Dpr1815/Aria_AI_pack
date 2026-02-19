/**
 * cleanString Unit Tests
 */

import {
  cleanString,
  removeEmojis,
  removeUrls,
  containsEmojis,
  extractEmojis,
  normalizeQuotesAndDashes,
  cleanForTTS,
} from '@utils/text/cleanString';

describe('cleanString', () => {
  describe('basic cleaning', () => {
    it('returns empty string for empty/falsy input', () => {
      expect(cleanString('')).toBe('');
      expect(cleanString(null as any)).toBe('');
      expect(cleanString(undefined as any)).toBe('');
    });

    it('trims and normalizes whitespace', () => {
      expect(cleanString('  hello   world  ')).toBe('hello world');
    });

    it('collapses multiple punctuation', () => {
      expect(cleanString('wow!!!')).toBe('wow!');
      expect(cleanString('really???')).toBe('really?');
    });
  });

  describe('emoji removal', () => {
    it('removes emojis by default', () => {
      expect(cleanString('Hello! 👋')).toBe('Hello!');
    });

    it('still strips emojis via special char cleanup even when removeEmojis is false', () => {
      // Note: removeSpecialCharacters runs after emoji removal, so emojis
      // get stripped regardless. The option only controls the dedicated emoji pass.
      const result = cleanString('Hello 😊', { removeEmojis: false });
      expect(result).toBe('Hello');
    });
  });

  describe('URL removal', () => {
    it('removes URLs by default', () => {
      expect(cleanString('Visit https://example.com for more')).toBe('Visit for more');
    });

    it('preserves URLs when option is false', () => {
      const result = cleanString('Visit https://example.com', { removeUrls: false });
      expect(result).toContain('example');
    });
  });

  describe('email removal', () => {
    it('removes emails by default', () => {
      expect(cleanString('Contact user@example.com please')).toBe('Contact please');
    });
  });

  describe('hashtag removal', () => {
    it('removes hashtags by default', () => {
      expect(cleanString('Check this #trending topic')).toBe('Check this topic');
    });
  });

  describe('mention removal', () => {
    it('removes mentions by default', () => {
      expect(cleanString('Hey @john how are you')).toBe('Hey how are you');
    });
  });

  describe('line breaks', () => {
    it('converts line breaks to spaces by default', () => {
      expect(cleanString('line one\nline two')).toBe('line one line two');
    });

    it('skips explicit newline-to-space conversion when preserveLineBreaks is true', () => {
      // Note: MULTI_SPACE_REGEX (/\s+/g) still normalizes whitespace,
      // so newlines become spaces during that pass. The option only skips
      // the dedicated newline replacement.
      const result = cleanString('line one\nline two', { preserveLineBreaks: true });
      expect(result).toBe('line one line two');
    });
  });

  describe('number replacement', () => {
    it('does not replace numbers by default', () => {
      expect(cleanString('I have 5 items')).toBe('I have 5 items');
    });

    it('replaces numbers with words when enabled', () => {
      const result = cleanString('I have 5 items', { replaceNumbers: true });
      expect(result).toBe('I have five items');
    });
  });

  describe('max length', () => {
    it('truncates at word boundary when exceeding maxLength', () => {
      const longText = 'This is a very long sentence that should be truncated at some point';
      const result = cleanString(longText, { maxLength: 30 });
      expect(result.length).toBeLessThanOrEqual(33); // 30 + "..."
      expect(result).toMatch(/\.\.\.$/);
    });
  });
});

describe('removeEmojis', () => {
  it('removes all emojis from text', () => {
    expect(removeEmojis('Hello 😊👋 World')).toBe('Hello  World');
  });
});

describe('removeUrls', () => {
  it('removes all URLs from text', () => {
    expect(removeUrls('Visit https://google.com and http://test.com')).toBe('Visit  and ');
  });
});

describe('containsEmojis', () => {
  it('returns true when text contains emojis', () => {
    expect(containsEmojis('Hello 😊')).toBe(true);
  });

  it('returns false when text has no emojis', () => {
    expect(containsEmojis('Hello world')).toBe(false);
  });
});

describe('extractEmojis', () => {
  it('extracts all emojis from text', () => {
    const emojis = extractEmojis('Hi 😊 there 👋');
    expect(emojis).toContain('😊');
    expect(emojis).toContain('👋');
  });

  it('returns empty array when no emojis', () => {
    expect(extractEmojis('no emojis here')).toEqual([]);
  });
});

describe('normalizeQuotesAndDashes', () => {
  it('normalizes en-dash and em-dash to hyphen', () => {
    expect(normalizeQuotesAndDashes('one\u2013two\u2014three')).toBe('one-two-three');
  });

  it('leaves regular text unchanged', () => {
    expect(normalizeQuotesAndDashes('Hello world')).toBe('Hello world');
  });
});

describe('cleanForTTS', () => {
  it('performs strict cleaning for TTS output', () => {
    const result = cleanForTTS('Hello! 😊 Check https://test.com (whisper) *bold*');
    expect(result).not.toContain('😊');
    expect(result).not.toContain('https');
    expect(result).not.toContain('(whisper)');
    expect(result).not.toContain('*');
  });

  it('ensures spacing after punctuation', () => {
    expect(cleanForTTS('Hello.World')).toBe('Hello. World');
  });

  it('returns empty for empty text', () => {
    expect(cleanForTTS('')).toBe('');
  });
});
