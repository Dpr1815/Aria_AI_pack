/**
 * Step Labels & Schema Helper
 *
 * Functions for retrieving step labels and input schemas.
 *
 * @module modules/steps/helpers
 */

import { STEP_REGISTRY } from '../definitions';

/**
 * Get step label for a specific language
 *
 * Falls back to English if the requested language is not available.
 *
 * @param stepId - The step ID
 * @param language - Language code (e.g., 'en-US', 'it-IT')
 * @returns The localized step label
 */
export const getStepLabel = (stepId: string, language: string): string => {
  const def = STEP_REGISTRY[stepId];
  if (!def) return stepId;

  // Try exact match first (e.g., 'en-US')
  if (def.labels[language]) {
    return def.labels[language];
  }

  // Try language prefix (e.g., 'en' from 'en-US')
  const langPrefix = language.split('-')[0];
  const matchingKey = Object.keys(def.labels).find((key) => key.startsWith(langPrefix));
  if (matchingKey) {
    return def.labels[matchingKey];
  }

  // Fallback to English
  return def.labels['en-US'] || stepId;
};
