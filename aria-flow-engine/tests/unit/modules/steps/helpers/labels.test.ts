/**
 * Unit tests for steps/helpers/labels
 */

jest.mock('../../../../../src/modules/steps/definitions', () => ({
  STEP_REGISTRY: {} as any,
  STEP_INPUT_SCHEMAS: {},
  STEP_REGISTRY_BY_CATEGORY: {},
}));

import { STEP_REGISTRY } from '../../../../../src/modules/steps/definitions';
import { getStepLabel } from '../../../../../src/modules/steps/helpers/labels';

const registry = STEP_REGISTRY as Record<string, any>;

beforeEach(() => {
  for (const key of Object.keys(registry)) {
    delete registry[key];
  }
});

describe('getStepLabel', () => {
  it('should return stepId for unknown step', () => {
    expect(getStepLabel('unknown', 'en-US')).toBe('unknown');
  });

  it('should return exact language match', () => {
    registry.intro = { id: 'intro', labels: { 'en-US': 'Introduction', 'it-IT': 'Introduzione' } };
    expect(getStepLabel('intro', 'en-US')).toBe('Introduction');
    expect(getStepLabel('intro', 'it-IT')).toBe('Introduzione');
  });

  it('should fall back to language prefix match', () => {
    registry.intro = { id: 'intro', labels: { 'en-US': 'Introduction' } };
    // 'en-GB' not exact match, but 'en' prefix matches 'en-US'
    expect(getStepLabel('intro', 'en-GB')).toBe('Introduction');
  });

  it('should fall back to en-US when no match', () => {
    registry.intro = { id: 'intro', labels: { 'en-US': 'Introduction', 'it-IT': 'Introduzione' } };
    expect(getStepLabel('intro', 'ja-JP')).toBe('Introduction');
  });

  it('should return stepId when no en-US fallback either', () => {
    registry.intro = { id: 'intro', labels: { 'it-IT': 'Introduzione' } };
    expect(getStepLabel('intro', 'de-DE')).toBe('intro');
  });
});
