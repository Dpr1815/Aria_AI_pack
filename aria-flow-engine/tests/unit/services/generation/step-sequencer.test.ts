/**
 * Unit tests for StepSequencer
 */

import { StepSequencer } from '@services/generation/step-sequencer';
import { ValidationError } from '@utils/errors';

// Mock @modules
jest.mock('@modules', () => ({
  ...jest.requireActual('@modules'),
  getStepDefinition: jest.fn(),
  getStepLabel: jest.fn(),
  isFirstPositionStep: jest.fn(),
  isLastPositionStep: jest.fn(),
  hasGenerationConfig: jest.fn(),
  getParentStep: jest.fn(),
}));

import {
  getStepDefinition,
  getStepLabel,
  isFirstPositionStep,
  isLastPositionStep,
  hasGenerationConfig,
  getParentStep,
} from '@modules';

const mockGetStepDefinition = getStepDefinition as jest.MockedFunction<typeof getStepDefinition>;
const mockGetStepLabel = getStepLabel as jest.MockedFunction<typeof getStepLabel>;
const mockIsFirstPositionStep = isFirstPositionStep as jest.MockedFunction<typeof isFirstPositionStep>;
const mockIsLastPositionStep = isLastPositionStep as jest.MockedFunction<typeof isLastPositionStep>;
const mockHasGenerationConfig = hasGenerationConfig as jest.MockedFunction<typeof hasGenerationConfig>;
const mockGetParentStep = getParentStep as jest.MockedFunction<typeof getParentStep>;

describe('StepSequencer', () => {
  let sequencer: StepSequencer;

  beforeEach(() => {
    sequencer = new StepSequencer();

    // Default mock implementations (resetMocks: true clears them)
    mockGetStepDefinition.mockReturnValue(null as any);
    mockGetStepLabel.mockImplementation((key: string) => `Label: ${key}`);
    mockIsFirstPositionStep.mockReturnValue(false);
    mockIsLastPositionStep.mockReturnValue(false);
    mockHasGenerationConfig.mockReturnValue(false);
    mockGetParentStep.mockReturnValue(undefined);
  });

  // ============================================
  // validateStepOrderChange
  // ============================================

  describe('validateStepOrderChange', () => {
    it('should accept valid reorder with same steps', () => {
      expect(() =>
        sequencer.validateStepOrderChange(['a', 'b', 'c'], ['c', 'a', 'b'])
      ).not.toThrow();
    });

    it('should throw when step count changes', () => {
      expect(() =>
        sequencer.validateStepOrderChange(['a', 'b'], ['a', 'b', 'c'])
      ).toThrow('Step count mismatch');
    });

    it('should throw when unknown step is in new order', () => {
      expect(() =>
        sequencer.validateStepOrderChange(['a', 'b'], ['a', 'x'])
      ).toThrow('Unknown step "x"');
    });

    it('should throw when a step is missing from new order', () => {
      // ['a', 'b', 'c'] → ['a', 'b', 'x'] — same set size (3), but 'c' is missing
      expect(() =>
        sequencer.validateStepOrderChange(['a', 'b', 'c'], ['a', 'b', 'x'])
      ).toThrow('Unknown step "x"');
    });
  });

  // ============================================
  // validateInsertionPosition
  // ============================================

  describe('validateInsertionPosition', () => {
    it('should allow insertion at non-constrained positions', () => {
      expect(() =>
        sequencer.validateInsertionPosition('new-step', 2, ['intro', 'mid', 'conclusion'])
      ).not.toThrow();
    });

    it('should throw when inserting before a first-position step', () => {
      mockIsFirstPositionStep.mockImplementation((key) => key === 'intro');

      expect(() =>
        sequencer.validateInsertionPosition('new-step', 1, ['intro', 'mid', 'conclusion'])
      ).toThrow('Cannot insert before "intro"');
    });

    it('should throw when inserting after a last-position step', () => {
      mockIsLastPositionStep.mockImplementation((key) => key === 'conclusion');

      expect(() =>
        sequencer.validateInsertionPosition('new-step', 4, ['intro', 'mid', 'conclusion'])
      ).toThrow('Cannot insert after "conclusion"');
    });

    it('should allow inserting at the end when last step is not constrained', () => {
      expect(() =>
        sequencer.validateInsertionPosition('new-step', 4, ['a', 'b', 'c'])
      ).not.toThrow();
    });
  });

  // ============================================
  // expandSteps
  // ============================================

  describe('expandSteps', () => {
    it('should return steps as-is when no definitions have expandsTo', () => {
      const result = sequencer.expandSteps(['intro', 'background', 'conclusion']);

      expect(result).toEqual(['intro', 'background', 'conclusion']);
    });

    it('should expand steps with expandsTo sub-steps', () => {
      mockGetStepDefinition.mockImplementation((id) => {
        if (id === 'work') {
          return { expandsTo: ['work_scenario', 'work_roleplay'] } as any;
        }
        return null;
      });

      const result = sequencer.expandSteps(['intro', 'work', 'conclusion']);

      expect(result).toEqual(['intro', 'work_scenario', 'work_roleplay', 'conclusion']);
    });

    it('should maintain intro first and conclusion last', () => {
      mockGetStepDefinition.mockReturnValue(null as any);

      const result = sequencer.expandSteps(['conclusion', 'background', 'intro']);

      expect(result[0]).toBe('intro');
      expect(result[result.length - 1]).toBe('conclusion');
    });

    it('should deduplicate expanded steps', () => {
      mockGetStepDefinition.mockImplementation((id) => {
        if (id === 'parent1') return { expandsTo: ['shared_sub', 'sub1'] } as any;
        if (id === 'parent2') return { expandsTo: ['shared_sub', 'sub2'] } as any;
        return null;
      });

      const result = sequencer.expandSteps(['parent1', 'parent2']);

      expect(result).toEqual(['shared_sub', 'sub1', 'sub2']);
    });
  });

  // ============================================
  // getStepsRequiringGeneration
  // ============================================

  describe('getStepsRequiringGeneration', () => {
    it('should filter to steps with generation config', () => {
      mockHasGenerationConfig.mockImplementation((id) => id === 'background');

      const result = sequencer.getStepsRequiringGeneration(['intro', 'background', 'conclusion']);

      expect(result).toEqual(['background']);
    });

    it('should return empty array when no steps need generation', () => {
      const result = sequencer.getStepsRequiringGeneration(['intro', 'conclusion']);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // getStepsToRemove
  // ============================================

  describe('getStepsToRemove', () => {
    it('should return the step itself when it has no expandsTo', () => {
      const result = sequencer.getStepsToRemove('background', ['intro', 'background', 'conclusion']);

      expect(result).toEqual(['background']);
    });

    it('should return expanded sub-steps that exist in current order', () => {
      mockGetStepDefinition.mockReturnValue({
        expandsTo: ['work_scenario', 'work_roleplay', 'work_debrief'],
      } as any);

      const result = sequencer.getStepsToRemove('work', [
        'intro',
        'work_scenario',
        'work_roleplay',
        'conclusion',
      ]);

      expect(result).toEqual(['work_scenario', 'work_roleplay']);
    });

    it('should return empty array when step not in current order', () => {
      const result = sequencer.getStepsToRemove('missing', ['intro', 'conclusion']);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // buildStepSequence
  // ============================================

  describe('buildStepSequence', () => {
    it('should build sequence with correct order and nextStep', () => {
      const result = sequencer.buildStepSequence(['a', 'b', 'c']);

      expect(result).toEqual([
        { stepKey: 'a', order: 1, nextStep: 'b' },
        { stepKey: 'b', order: 2, nextStep: 'c' },
        { stepKey: 'c', order: 3, nextStep: null },
      ]);
    });

    it('should handle single step', () => {
      const result = sequencer.buildStepSequence(['only']);

      expect(result).toEqual([{ stepKey: 'only', order: 1, nextStep: null }]);
    });
  });

  // ============================================
  // buildStepsConfig
  // ============================================

  describe('buildStepsConfig', () => {
    it('should build config with labels, order, nextStep, and empty inputs', () => {
      const result = sequencer.buildStepsConfig(['a', 'b'], 'en');

      expect(result).toEqual({
        a: { label: 'Label: a', order: 1, nextStep: 'b', inputs: {} },
        b: { label: 'Label: b', order: 2, nextStep: null, inputs: {} },
      });
      expect(mockGetStepLabel).toHaveBeenCalledWith('a', 'en');
      expect(mockGetStepLabel).toHaveBeenCalledWith('b', 'en');
    });
  });

  // ============================================
  // mergeGeneratedInputs
  // ============================================

  describe('mergeGeneratedInputs', () => {
    it('should merge generated inputs into step configs', () => {
      const stepsConfig = {
        a: { label: 'A', order: 1, nextStep: 'b', inputs: {} },
        b: { label: 'B', order: 2, nextStep: null, inputs: {} },
      };
      const generatedInputs = {
        a: { question: 'What is your name?' },
      };

      const result = sequencer.mergeGeneratedInputs(stepsConfig, generatedInputs);

      expect(result.a.inputs).toEqual({ question: 'What is your name?' });
      expect(result.b.inputs).toEqual({});
    });

    it('should inherit inputs from parent step', () => {
      mockGetParentStep.mockImplementation((key) => (key === 'sub_a' ? 'parent' : undefined));

      const stepsConfig = {
        sub_a: { label: 'Sub A', order: 1, nextStep: null, inputs: {} },
      };
      const generatedInputs = {
        parent: { shared: 'data' },
      };

      const result = sequencer.mergeGeneratedInputs(stepsConfig, generatedInputs);

      expect(result.sub_a.inputs).toEqual({ shared: 'data' });
    });

    it('should merge additionalData for steps with additionalData config', () => {
      mockGetStepDefinition.mockImplementation((key) => {
        if (key === 'a') return { additionalData: { required: ['role'], optional: ['level'] } } as any;
        return null;
      });

      const stepsConfig = {
        a: { label: 'A', order: 1, nextStep: null, inputs: {} },
      };

      const result = sequencer.mergeGeneratedInputs(stepsConfig, {}, { role: 'dev', level: 'senior', extra: 'ignored' });

      expect(result.a.inputs).toEqual({ role: 'dev', level: 'senior' });
    });
  });

  // ============================================
  // getNextStepKey
  // ============================================

  describe('getNextStepKey', () => {
    it('should return next step key', () => {
      expect(sequencer.getNextStepKey('a', ['a', 'b', 'c'])).toBe('b');
    });

    it('should return null for last step', () => {
      expect(sequencer.getNextStepKey('c', ['a', 'b', 'c'])).toBeNull();
    });

    it('should return null for unknown step', () => {
      expect(sequencer.getNextStepKey('x', ['a', 'b'])).toBeNull();
    });
  });

  // ============================================
  // getNextStepLabel
  // ============================================

  describe('getNextStepLabel', () => {
    it('should return next step label', () => {
      const result = sequencer.getNextStepLabel(['a', 'b'], 'a', 'en');

      expect(result).toBe('Label: b');
      expect(mockGetStepLabel).toHaveBeenCalledWith('b', 'en');
    });

    it('should return empty string for last step', () => {
      expect(sequencer.getNextStepLabel(['a', 'b'], 'b', 'en')).toBe('');
    });

    it('should return empty string for unknown step', () => {
      expect(sequencer.getNextStepLabel(['a'], 'x', 'en')).toBe('');
    });
  });

  // ============================================
  // stepOrderEquals
  // ============================================

  describe('stepOrderEquals', () => {
    it('should return true for equal arrays', () => {
      expect(sequencer.stepOrderEquals(['a', 'b'], ['a', 'b'])).toBe(true);
    });

    it('should return false for different lengths', () => {
      expect(sequencer.stepOrderEquals(['a'], ['a', 'b'])).toBe(false);
    });

    it('should return false for different order', () => {
      expect(sequencer.stepOrderEquals(['a', 'b'], ['b', 'a'])).toBe(false);
    });

    it('should return true for empty arrays', () => {
      expect(sequencer.stepOrderEquals([], [])).toBe(true);
    });
  });

  // ============================================
  // findStepsWithChangedNextStep
  // ============================================

  describe('findStepsWithChangedNextStep', () => {
    it('should find steps whose next step changed', () => {
      const result = sequencer.findStepsWithChangedNextStep(
        ['a', 'b', 'c'],
        ['a', 'c', 'b']
      );

      // a: next was b, now c → changed
      // c: next was null, now b → changed
      // b: next was c, now null → changed
      expect(result).toContain('a');
      expect(result).toContain('c');
      expect(result).toContain('b');
    });

    it('should return empty array for identical orders', () => {
      const result = sequencer.findStepsWithChangedNextStep(['a', 'b', 'c'], ['a', 'b', 'c']);

      expect(result).toEqual([]);
    });

    it('should detect change when last step moves to middle', () => {
      const result = sequencer.findStepsWithChangedNextStep(
        ['a', 'b'],
        ['b', 'a']
      );

      expect(result).toContain('b'); // was null, now a
      expect(result).toContain('a'); // was b, now null
    });
  });
});
