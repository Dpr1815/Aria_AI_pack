/**
 * Step Prompts Helper
 *
 * Functions for retrieving prompt template IDs for steps.
 *
 * @module modules/steps/helpers
 */

import { STEP_REGISTRY, STEP_REGISTRY_BY_CATEGORY } from '../definitions';
import { NotFoundError } from '../../../utils/errors';
import { isTemplateRegistered } from '../../../prompts';

/**
 * Language suffix mapping
 */
const LANGUAGE_SUFFIX_MAP: Record<string, string> = {
  'en-US': 'en',
  'en-GB': 'en',
  'it-IT': 'it',
  'de-DE': 'de',
  'fr-FR': 'fr',
  'es-ES': 'es',
  'pt-BR': 'pt',
  'pt-PT': 'pt',
};

/**
 * Get language suffix from language code
 *
 * @param language - Language code (e.g., 'en-US', 'it-IT')
 * @returns Language suffix (e.g., 'en', 'it')
 */
const getLanguageSuffix = (language: string): string => {
  // Try exact match first
  if (LANGUAGE_SUFFIX_MAP[language]) {
    return LANGUAGE_SUFFIX_MAP[language];
  }

  // Try prefix match (e.g., 'en' from 'en-US')
  const prefix = language.split('-')[0].toLowerCase();
  return prefix;
};

/**
 * Get conversation prompt template ID for a step and language
 *
 * @example
 * getConversationPromptId('intro', 'en-US') // returns 'intro_en'
 * getConversationPromptId('background', 'it-IT') // returns 'background_it'
 *
 * @param stepId - The step ID
 * @param language - Language code (e.g., 'en-US', 'it-IT')
 * @returns The conversation prompt template ID
 * @throws Error if step definition not found
 */
export const getConversationPromptId = (stepId: string, language: string): string => {
  const def = STEP_REGISTRY[stepId];
  if (!def) {
    throw new NotFoundError('StepDefinition', stepId);
  }

  const langSuffix = getLanguageSuffix(language);
  return `${def.prompts.conversation}_${langSuffix}`;
};

/**
 * Get system prompt template ID for a step with language suffix
 *
 * Used by agent-generator for building conversation prompts.
 *
 * @example
 * getSystemPromptId('intro', 'en-US') // returns 'intro_en'
 * getSystemPromptId('intro') // returns 'intro'
 *
 * @param stepId - The step ID
 * @param language - Optional language code for suffix
 * @returns The system prompt template ID or undefined if step not found
 */
export const getSystemPromptId = (stepId: string, language?: string): string | undefined => {
  const conversation = STEP_REGISTRY[stepId]?.prompts?.conversation;
  if (!conversation) return undefined;

  if (language) {
    const langSuffix = getLanguageSuffix(language);
    return `${conversation}_${langSuffix}`;
  }

  return conversation;
};

/**
 * Get the base conversation prompt key (without language suffix)
 *
 * @param stepId - The step ID
 * @returns The base conversation prompt key or undefined
 */
export const getBasePromptKey = (stepId: string): string | undefined => {
  return STEP_REGISTRY[stepId]?.prompts?.conversation;
};

/**
 * Check if a step has conversation prompts defined
 *
 * @param stepId - The step ID
 * @returns True if step has conversation prompts
 */
export const hasPrompts = (stepId: string): boolean => {
  return !!STEP_REGISTRY[stepId]?.prompts?.conversation;
};

/**
 * Get all supported language codes
 *
 * @returns Array of supported language codes
 */
export const getSupportedLanguages = (): string[] => {
  return Object.keys(LANGUAGE_SUFFIX_MAP);
};

/**
 * Check if a language is supported
 *
 * @param language - Language code to check
 * @returns True if language is supported
 */
export const isLanguageSupported = (language: string): boolean => {
  return language in LANGUAGE_SUFFIX_MAP || language.split('-')[0].length === 2;
};

/**
 * Get languages that have conversation prompt templates for every step in a category
 *
 * @param categoryId - Category ID (e.g., 'interview', 'learningDevelopment')
 * @returns Array of language codes that are fully supported for the category
 */
export const getAvailableLanguages = (categoryId: string): string[] => {
  const categorySteps = STEP_REGISTRY_BY_CATEGORY[categoryId];
  if (!categorySteps) return [];

  const baseKeys = Object.values(categorySteps)
    .map((step) => step.prompts?.conversation)
    .filter(Boolean) as string[];

  if (baseKeys.length === 0) return [];

  return Object.entries(LANGUAGE_SUFFIX_MAP)
    .filter(([_lang, suffix]) =>
      baseKeys.every((key) => isTemplateRegistered(`${key}_${suffix}`))
    )
    .map(([lang]) => lang);
};
