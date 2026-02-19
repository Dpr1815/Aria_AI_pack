/**
 * Model Capabilities
 *
 * Single source of truth for model-specific API parameter support.
 * Keeps the connector clean — no scattered string checks.
 *
 * To add a new model family, append one entry to MODEL_FAMILIES.
 *
 * @see https://platform.openai.com/docs/models
 */

// ============================================
// Types
// ============================================

export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

export interface ModelCapabilities {
  /** Whether the model uses internal reasoning tokens */
  readonly supportsReasoning: boolean;
  /** Whether the model accepts temperature / top_p / penalties */
  readonly supportsSamplingParams: boolean;
  /** API parameter name for output token limit */
  readonly tokenLimitParam: 'max_tokens' | 'max_completion_tokens';
}

// ============================================
// Capability Profiles
// ============================================

const STANDARD: ModelCapabilities = {
  supportsReasoning: false,
  supportsSamplingParams: true,
  tokenLimitParam: 'max_tokens',
};

const REASONING: ModelCapabilities = {
  supportsReasoning: true,
  supportsSamplingParams: false,
  tokenLimitParam: 'max_completion_tokens',
};

/**
 * Model family prefix → capabilities.
 * First match wins — more specific prefixes come first.
 */
const MODEL_FAMILIES: ReadonlyArray<readonly [prefix: string, capabilities: ModelCapabilities]> = [
  ['gpt-4.1', STANDARD],
  ['gpt-4o', STANDARD],
  ['gpt-4', STANDARD],
  ['gpt-3.5', STANDARD],
  ['gpt-5', REASONING],
  ['o3', REASONING],
  ['o4', REASONING],
];

// ============================================
// Public API
// ============================================

/**
 * Resolve API capabilities for a model identifier.
 * Returns standard (non-reasoning) profile for unrecognized models.
 */
export function getModelCapabilities(model: string): ModelCapabilities {
  for (const [prefix, capabilities] of MODEL_FAMILIES) {
    if (model.startsWith(prefix)) {
      return capabilities;
    }
  }
  return STANDARD;
}
