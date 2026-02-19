/**
 * String Cleaner
 *
 * Cleans and sanitizes text for TTS processing.
 * Removes special characters, emojis, and normalizes whitespace.
 */

// ============================================
// Types
// ============================================

export interface CleanOptions {
  /** Remove emojis (default: true) */
  removeEmojis?: boolean;
  /** Remove URLs (default: true) */
  removeUrls?: boolean;
  /** Remove email addresses (default: true) */
  removeEmails?: boolean;
  /** Remove hashtags (default: true) */
  removeHashtags?: boolean;
  /** Remove mentions (@username) (default: true) */
  removeMentions?: boolean;
  /** Preserve line breaks (default: false) */
  preserveLineBreaks?: boolean;
  /** Replace numbers with words (default: false) */
  replaceNumbers?: boolean;
  /** Maximum length (default: no limit) */
  maxLength?: number;
}

// ============================================
// Regex Patterns
// ============================================

// Emoji pattern source (shared between global and non-global variants)
const EMOJI_PATTERN =
  '[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|[\u{FE0F}]';

// Global variant — for .replace() and .match() (needs to find ALL occurrences)
const EMOJI_REGEX = new RegExp(EMOJI_PATTERN, 'gu');

// Non-global variant — for .test() (stateless, no lastIndex side-effect)
const EMOJI_TEST_REGEX = new RegExp(EMOJI_PATTERN, 'u');

// URL regex
const URL_REGEX = /https?:\/\/[^\s]+/gi;

// Email regex
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// Hashtag regex
const HASHTAG_REGEX = /#[a-zA-Z0-9_]+/gi;

// Mention regex
const MENTION_REGEX = /@[a-zA-Z0-9_]+/gi;

// Special characters to remove (keep basic punctuation)
const SPECIAL_CHARS_REGEX = /[^\w\s.,!?;:'"()\-–—€$£¥%°@#&*/\\[\]{}|<>+=~`^]/gi;

// Multiple whitespace
const MULTI_SPACE_REGEX = /\s+/g;

// Multiple punctuation
const MULTI_PUNCT_REGEX = /([.!?]){2,}/g;

// ============================================
// Main Function
// ============================================

/**
 * Clean text for TTS processing.
 *
 * @param text - Input text to clean
 * @param options - Cleaning options
 * @returns Cleaned text
 *
 * @example
 * ```typescript
 * const clean = cleanString("Hello! 👋 Check out https://example.com");
 * // "Hello! Check out"
 * ```
 */
export function cleanString(text: string, options: CleanOptions = {}): string {
  const {
    removeEmojis = true,
    removeUrls = true,
    removeEmails = true,
    removeHashtags = true,
    removeMentions = true,
    preserveLineBreaks = false,
    replaceNumbers = false,
    maxLength,
  } = options;

  if (!text) {
    return '';
  }

  let result = text;

  // Remove URLs first (before other processing)
  if (removeUrls) {
    result = result.replace(URL_REGEX, '');
  }

  // Remove emails
  if (removeEmails) {
    result = result.replace(EMAIL_REGEX, '');
  }

  // Remove hashtags
  if (removeHashtags) {
    result = result.replace(HASHTAG_REGEX, '');
  }

  // Remove mentions
  if (removeMentions) {
    result = result.replace(MENTION_REGEX, '');
  }

  // Remove emojis
  if (removeEmojis) {
    result = result.replace(EMOJI_REGEX, '');
  }

  // Handle line breaks
  if (!preserveLineBreaks) {
    result = result.replace(/[\r\n]+/g, ' ');
  }

  // Replace numbers with words if requested
  if (replaceNumbers) {
    result = replaceNumbersWithWords(result);
  }

  // Remove remaining special characters (keep letters, numbers, basic punctuation)
  result = removeSpecialCharacters(result);

  // Normalize whitespace
  result = result.replace(MULTI_SPACE_REGEX, ' ');

  // Normalize multiple punctuation
  result = result.replace(MULTI_PUNCT_REGEX, '$1');

  // Trim
  result = result.trim();

  // Apply max length if specified
  if (maxLength && result.length > maxLength) {
    result = truncateAtWord(result, maxLength);
  }

  return result;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Remove special characters while preserving allowed ones.
 * Keeps: letters, numbers, spaces, basic punctuation, currency symbols, accented characters.
 */
function removeSpecialCharacters(text: string): string {
  // Allow: word chars, spaces, common punctuation, currency, accented chars
  return text.replace(
    /[^\w\s.,!?;:'"()\-–—€$£¥%°àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝ]/gi,
    ''
  );
}

/**
 * Truncate text at word boundary.
 */
function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Replace common numbers with words (basic implementation).
 */
function replaceNumbersWithWords(text: string): string {
  const numberWords: Record<string, string> = {
    '0': 'zero',
    '1': 'one',
    '2': 'two',
    '3': 'three',
    '4': 'four',
    '5': 'five',
    '6': 'six',
    '7': 'seven',
    '8': 'eight',
    '9': 'nine',
    '10': 'ten',
    '100': 'hundred',
    '1000': 'thousand',
  };

  let result = text;

  // Replace standalone numbers
  Object.entries(numberWords).forEach(([num, word]) => {
    const regex = new RegExp(`\\b${num}\\b`, 'g');
    result = result.replace(regex, word);
  });

  return result;
}

// ============================================
// Additional Utility Functions
// ============================================

/**
 * Remove only emojis from text.
 */
export function removeEmojis(text: string): string {
  return text.replace(EMOJI_REGEX, '');
}

/**
 * Remove only URLs from text.
 */
export function removeUrls(text: string): string {
  return text.replace(URL_REGEX, '');
}

/**
 * Check if text contains emojis.
 * Uses non-global regex to avoid stateful lastIndex side-effects.
 */
export function containsEmojis(text: string): boolean {
  return EMOJI_TEST_REGEX.test(text);
}

/**
 * Extract emojis from text.
 */
export function extractEmojis(text: string): string[] {
  return text.match(EMOJI_REGEX) || [];
}

/**
 * Normalize quotes and dashes.
 */
export function normalizeQuotesAndDashes(text: string): string {
  return (
    text
      // Normalize quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Normalize dashes
      .replace(/[–—]/g, '-')
  );
}

/**
 * Clean text specifically for TTS (strict mode).
 * More aggressive cleaning for better TTS output.
 */
export function cleanForTTS(text: string): string {
  let result = cleanString(text, {
    removeEmojis: true,
    removeUrls: true,
    removeEmails: true,
    removeHashtags: true,
    removeMentions: true,
    preserveLineBreaks: false,
  });

  // Additional TTS-specific cleaning
  result = normalizeQuotesAndDashes(result);

  // Remove parenthetical content that might confuse TTS
  result = result.replace(/\([^)]*\)/g, '');

  // Remove asterisks (often used for emphasis in text)
  result = result.replace(/\*/g, '');

  // Ensure proper spacing after punctuation
  result = result.replace(/([.!?])([A-Za-z])/g, '$1 $2');

  return result.trim();
}

// ============================================
// Defaults Export
// ============================================

export const CLEAN_DEFAULTS: CleanOptions = {
  removeEmojis: true,
  removeUrls: true,
  removeEmails: true,
  removeHashtags: true,
  removeMentions: true,
  preserveLineBreaks: false,
  replaceNumbers: false,
} as const;
