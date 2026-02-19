/**
 * Sentence Splitter
 *
 * Splits text into sentences for chunked TTS processing.
 * Handles abbreviations, decimal numbers, and merges short sentences.
 *
 * STREAMING OPTIMIZATION:
 * The first chunk is NEVER merged with subsequent sentences, regardless
 * of length. This minimizes time-to-first-audio: a short first sentence
 * like "Ciao, Paolo." synthesizes in ~200ms instead of waiting for a
 * merged 150+ char block. The parallel TTS pipeline then fills in the rest.
 */

// ============================================
// Types
// ============================================

export interface SplitterOptions {
  /** Minimum characters per chunk (default: 30) */
  minChunkLength?: number;
  /** Maximum characters per chunk (default: 500) */
  maxChunkLength?: number;
  /** Merge sentences shorter than this (default: 100) — skipped for first chunk */
  mergeThreshold?: number;
  /** Language for abbreviation handling (default: 'en') */
  language?: string;
}

export interface SplitResult {
  chunks: string[];
  totalLength: number;
  chunkCount: number;
}

// ============================================
// Constants
// ============================================

const DEFAULT_MIN_CHUNK_LENGTH = 30;
const DEFAULT_MAX_CHUNK_LENGTH = 500;
const DEFAULT_MERGE_THRESHOLD = 100;

// Common abbreviations that shouldn't end sentences
const ABBREVIATIONS = new Set([
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'sr',
  'jr',
  'rev',
  'vs',
  'etc',
  'eg',
  'ie',
  'al',
  'cf',
  'inc',
  'ltd',
  'co',
  'corp',
  'ft',
  'in',
  'lb',
  'oz',
  'pt',
  'qt',
  'gal',
  'mi',
  'km',
  'cm',
  'mm',
  'am',
  'pm',
  'hr',
  'min',
  'sec',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
  'no',
  'nos',
  'vol',
  'vols',
  'pg',
  'pp',
  'est',
  'approx',
  'dept',
  'govt',
  // Italian common abbreviations
  'sig',
  'dott',
  'ing',
  'avv',
  'arch',
  'geom',
  'rag',
]);

const SENTENCE_SPLIT_REGEX = /(?<=[.!?])\s+(?=[A-Z\u00C0-\u00DC])/;

// ============================================
// Main Function
// ============================================

/**
 * Split text into sentences suitable for TTS processing.
 *
 * The first sentence is always emitted as its own chunk (never merged)
 * to minimize time-to-first-audio in streaming scenarios.
 */
export function splitIntoSentences(text: string, options: SplitterOptions = {}): string[] {
  const {
    minChunkLength = DEFAULT_MIN_CHUNK_LENGTH,
    maxChunkLength = DEFAULT_MAX_CHUNK_LENGTH,
    mergeThreshold = DEFAULT_MERGE_THRESHOLD,
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const protectedText = protectAbbreviations(normalizedText);

  let sentences = protectedText
    .split(SENTENCE_SPLIT_REGEX)
    .map((s) => restoreAbbreviations(s.trim()))
    .filter((s) => s.length > 0);

  if (sentences.length === 0) {
    sentences = [normalizedText];
  }

  // Extract first sentence BEFORE merging — never merge it
  const firstSentence = sentences[0];
  const rest = sentences.slice(1);

  // Merge short sentences in the REMAINING chunks only
  const mergedRest = mergeShortSentences(rest, mergeThreshold);

  // Split long sentences
  const allChunks = [firstSentence, ...mergedRest];
  const finalChunks = splitLongSentences(allChunks, maxChunkLength);

  // Filter out truly empty chunks but use a low minimum
  // (first chunk can be short — that's the point)
  return finalChunks.filter((s) => s.length >= Math.min(minChunkLength, 5));
}

/**
 * Split text and return detailed result.
 */
export function splitIntoSentencesDetailed(
  text: string,
  options: SplitterOptions = {}
): SplitResult {
  const chunks = splitIntoSentences(text, options);
  return {
    chunks,
    totalLength: text.length,
    chunkCount: chunks.length,
  };
}

// ============================================
// Helper Functions
// ============================================

function protectAbbreviations(text: string): string {
  let result = text;

  ABBREVIATIONS.forEach((abbr) => {
    const regex = new RegExp(`\\b(${abbr})\\.`, 'gi');
    result = result.replace(regex, `$1<DOT>`);
  });

  result = result.replace(/(\d)\.(\d)/g, '$1<DOT>$2');
  result = result.replace(/\.{3}/g, '<ELLIPSIS>');
  result = result.replace(/\.(com|org|net|edu|gov|io)/gi, '<DOT>$1');

  return result;
}

function restoreAbbreviations(text: string): string {
  return text.replace(/<DOT>/g, '.').replace(/<ELLIPSIS>/g, '...');
}

function mergeShortSentences(sentences: string[], threshold: number): string[] {
  if (sentences.length === 0) return [];

  const result: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length === 0) {
      current = sentence;
    } else if (current.length < threshold || sentence.length < threshold) {
      current = `${current} ${sentence}`;
    } else {
      result.push(current);
      current = sentence;
    }
  }

  if (current.length > 0) {
    result.push(current);
  }

  return result;
}

function splitLongSentences(sentences: string[], maxLength: number): string[] {
  const result: string[] = [];

  for (const sentence of sentences) {
    if (sentence.length <= maxLength) {
      result.push(sentence);
    } else {
      result.push(...splitLongSentence(sentence, maxLength));
    }
  }

  return result;
}

function splitLongSentence(sentence: string, maxLength: number): string[] {
  const result: string[] = [];
  let remaining = sentence;

  while (remaining.length > maxLength) {
    const splitPoint = findSplitPoint(remaining, maxLength);

    if (splitPoint === -1) {
      result.push(remaining.slice(0, maxLength).trim());
      remaining = remaining.slice(maxLength).trim();
    } else {
      result.push(remaining.slice(0, splitPoint).trim());
      remaining = remaining.slice(splitPoint).trim();
    }
  }

  if (remaining.length > 0) {
    result.push(remaining);
  }

  return result;
}

function findSplitPoint(text: string, maxLength: number): number {
  const searchRange = text.slice(0, maxLength);
  const splitChars = [';', ':', ',', ' - ', '—', ' '];

  for (const char of splitChars) {
    const lastIndex = searchRange.lastIndexOf(char);
    if (lastIndex > maxLength * 0.3) {
      return lastIndex + char.length;
    }
  }

  const lastSpace = searchRange.lastIndexOf(' ');
  return lastSpace > 0 ? lastSpace : -1;
}

// ============================================
// Utility Functions
// ============================================

export function estimateSpeakingDuration(text: string, wordsPerMinute = 150): number {
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  return (wordCount / wordsPerMinute) * 60;
}

export function countSentences(text: string): number {
  return splitIntoSentences(text).length;
}

export function getAverageSentenceLength(text: string): number {
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return 0;

  const totalLength = sentences.reduce((sum, s) => sum + s.length, 0);
  return totalLength / sentences.length;
}

export const SPLITTER_DEFAULTS = {
  minChunkLength: DEFAULT_MIN_CHUNK_LENGTH,
  maxChunkLength: DEFAULT_MAX_CHUNK_LENGTH,
  mergeThreshold: DEFAULT_MERGE_THRESHOLD,
} as const;
