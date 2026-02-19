/**
 * Start Linguistic Action
 *
 * Advances to the next step (linguistic step) and switches the TTS/STT voice
 * to a native speaker for the step's target language.
 *
 * The next step must have a `target_language` field in its inputs
 * (e.g. "en-US", "it-IT") which is mapped to a Google TTS voice.
 */

import type { ActionResult, ActionContext } from '@types';
import * as StateMachine from '../StateMachine';
import { createLogger } from '@utils';

const logger = createLogger('Action:StartLinguistic');

/**
 * Linguistic Voice Map
 *
 * Maps target language codes to Google TTS voice configurations.
 * Used by START_LINGUISTIC to switch the conversation voice
 * to a native speaker for the target language.
 */

import type { VoiceConfig } from '@types';

/**
 * Default Google voices for linguistic mode, keyed by language code.
 * All use Chirp HD Female voices for consistency.
 */
const LINGUISTIC_VOICE_MAP: Record<string, VoiceConfig> = {
  'en-US': {
    languageCode: 'en-US',
    name: 'en-US-Chirp-HD-F',
    gender: 'FEMALE',
  },
  'en-GB': {
    languageCode: 'en-GB',
    name: 'en-GB-Chirp-HD-F',
    gender: 'FEMALE',
  },
  'it-IT': {
    languageCode: 'it-IT',
    name: 'it-IT-Chirp-HD-F',
    gender: 'FEMALE',
  },
  'es-ES': {
    languageCode: 'es-ES',
    name: 'es-ES-Chirp-HD-F',
    gender: 'FEMALE',
  },
  'fr-FR': {
    languageCode: 'fr-FR',
    name: 'fr-FR-Chirp-HD-F',
    gender: 'FEMALE',
  },
  'de-DE': {
    languageCode: 'de-DE',
    name: 'de-DE-Chirp-HD-F',
    gender: 'FEMALE',
  },
  'pt-BR': {
    languageCode: 'pt-BR',
    name: 'pt-BR-Chirp-HD-F',
    gender: 'FEMALE',
  },
  'ja-JP': {
    languageCode: 'ja-JP',
    name: 'ja-JP-Chirp-HD-F',
    gender: 'FEMALE',
  },
};

/**
 * Get the Google TTS voice config for a target language.
 * Returns null if the language is not supported.
 */
export function getLinguisticVoice(targetLanguage: string): VoiceConfig | null {
  return LINGUISTIC_VOICE_MAP[targetLanguage] ?? null;
}

/**
 * Get all supported linguistic language codes.
 */
export function getSupportedLinguisticLanguages(): string[] {
  return Object.keys(LINGUISTIC_VOICE_MAP);
}

export async function execute(
  _payload: Record<string, unknown> | undefined,
  context: ActionContext
): Promise<ActionResult> {
  const { session, agent, services } = context;
  const currentStep = session.currentStep;

  const transition = StateMachine.calculateTransition(agent, currentStep);

  if (transition.isLast) {
    await services.sessionRepo.updateStatus(session._id, 'completed');
    return { isComplete: true };
  }

  const nextStep = transition.to!;

  // Load the next step to read target_language from its inputs
  if (!services.stepRepo) {
    logger.error('stepRepo not available — cannot resolve target language');
    return { error: 'Step repository not configured' };
  }

  const stepDoc = await services.stepRepo.findByAgentAndKey(agent._id, nextStep);
  const targetLanguage = (stepDoc?.inputs?.target_language as string) ?? null;

  if (!targetLanguage) {
    logger.warn(`No target_language found on step "${nextStep}" — advancing without voice change`);
  }

  // Resolve the voice for the target language
  const linguisticVoice = targetLanguage ? getLinguisticVoice(targetLanguage) : null;

  if (targetLanguage && !linguisticVoice) {
    logger.warn(`Unsupported target language: ${targetLanguage} — advancing without voice change`);
  }

  // Advance to the next step
  await services.sessionRepo.updateCurrentStep(session._id, nextStep);
  await services.conversationService.injectStepContext(session._id, nextStep, agent);

  logger.info(
    `Linguistic mode started → step "${nextStep}", language: ${targetLanguage ?? 'none'}`
  );

  return {
    nextStep,
    isComplete: false,
    triggerAIResponse: true,
    voiceOverride: linguisticVoice ?? undefined,
  };
}
