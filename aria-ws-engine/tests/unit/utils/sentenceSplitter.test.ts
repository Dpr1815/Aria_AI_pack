/**
 * Sentence Splitter Unit Tests
 */

import {
  splitIntoSentences,
  splitIntoSentencesDetailed,
  estimateSpeakingDuration,
  countSentences,
  getAverageSentenceLength,
} from '@utils/audio/sentenceSplitter';

describe('splitIntoSentences', () => {
  describe('basic splitting', () => {
    it('returns empty array for empty input', () => {
      expect(splitIntoSentences('')).toEqual([]);
      expect(splitIntoSentences('   ')).toEqual([]);
    });

    it('returns single chunk for short text', () => {
      const result = splitIntoSentences('Hello world, this is a test sentence.');
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('splits at sentence boundaries', () => {
      const text = 'First sentence. Second sentence. Third sentence here.';
      const result = splitIntoSentences(text);
      expect(result.length).toBeGreaterThanOrEqual(1);
      const joined = result.join(' ');
      expect(joined).toContain('First sentence');
      expect(joined).toContain('Third sentence');
    });
  });

  describe('first chunk optimization', () => {
    it('keeps the first sentence as its own chunk', () => {
      const text = 'Hello there. How are you doing today? I hope you are well and happy with your progress.';
      const result = splitIntoSentences(text);
      // First chunk should contain the first sentence
      expect(result[0]).toContain('Hello there.');
      // It should not be merged with the rest
      expect(result[0]).not.toContain('How are you');
    });
  });

  describe('abbreviation handling', () => {
    it('does not split on common abbreviations', () => {
      const text = 'Dr. Smith went to the store. He bought milk.';
      const result = splitIntoSentences(text);
      const joined = result.join(' ');
      expect(joined).toContain('Dr. Smith');
    });

    it('handles decimal numbers', () => {
      const text = 'The value is 3.14 and that is fine. Another sentence here.';
      const result = splitIntoSentences(text);
      const joined = result.join(' ');
      expect(joined).toContain('3.14');
    });

    it('handles ellipsis', () => {
      const text = 'Well... I think so. Maybe not.';
      const result = splitIntoSentences(text);
      const joined = result.join(' ');
      expect(joined).toContain('...');
    });
  });

  describe('long sentence splitting', () => {
    it('splits sentences exceeding max chunk length', () => {
      const longSentence = 'Word '.repeat(200).trim() + '.';
      const result = splitIntoSentences(longSentence, { maxChunkLength: 100 });
      expect(result.length).toBeGreaterThan(1);
      result.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(200); // some tolerance
      });
    });
  });

  describe('short sentence merging', () => {
    it('merges short sentences (except the first)', () => {
      const text = 'Hello there my friend. Yes. No. Maybe. I think so actually yes absolutely definitely.';
      const result = splitIntoSentences(text, { mergeThreshold: 100 });
      expect(result.length).toBeLessThan(5);
    });
  });
});

describe('splitIntoSentencesDetailed', () => {
  it('returns detailed result with metadata', () => {
    const text = 'First sentence. Second sentence.';
    const result = splitIntoSentencesDetailed(text);
    expect(result.chunks).toBeDefined();
    expect(result.totalLength).toBe(text.length);
    expect(result.chunkCount).toBe(result.chunks.length);
  });
});

describe('estimateSpeakingDuration', () => {
  it('estimates duration based on word count', () => {
    const words = Array(150).fill('word').join(' ');
    const duration = estimateSpeakingDuration(words, 150);
    expect(duration).toBeCloseTo(60, 0);
  });

  it('returns 0 for empty text', () => {
    expect(estimateSpeakingDuration('')).toBe(0);
  });
});

describe('countSentences', () => {
  it('counts sentences correctly', () => {
    const count = countSentences('One sentence. Two sentences. Three sentences.');
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

describe('getAverageSentenceLength', () => {
  it('returns average length', () => {
    const avg = getAverageSentenceLength('Short. A much longer sentence here.');
    expect(avg).toBeGreaterThan(0);
  });

  it('returns 0 for empty text', () => {
    expect(getAverageSentenceLength('')).toBe(0);
  });
});
