/**
 * Unit tests for steps/registry
 */

import { z } from 'zod';

jest.mock('../../../../src/modules/steps/definitions', () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number().optional(),
  });

  const effectSchema = testSchema.strict();

  const STEP_REGISTRY: Record<string, any> = {
    intro: {
      id: 'intro',
      labels: { 'en-US': 'Introduction' },
      selectable: true,
      position: 'first',
      inputSchema: testSchema,
    },
    work: {
      id: 'work',
      labels: { 'en-US': 'Work Assessment' },
      selectable: true,
      position: 'flexible',
      expandsTo: ['introWork', 'work', 'conclusionWork'],
      inputSchema: testSchema,
    },
    introWork: {
      id: 'introWork',
      labels: { 'en-US': 'Work Intro' },
      selectable: false,
      position: 'flexible',
      parentStep: 'work',
      inputSchema: testSchema,
    },
    conclusion: {
      id: 'conclusion',
      labels: { 'en-US': 'Conclusion' },
      selectable: true,
      position: 'last',
      inputSchema: effectSchema,
    },
  };

  const STEP_INPUT_SCHEMAS: Record<string, any> = {
    intro: testSchema,
    work: testSchema,
  };

  const STEP_REGISTRY_BY_CATEGORY: Record<string, any> = {
    interview: { intro: STEP_REGISTRY.intro, conclusion: STEP_REGISTRY.conclusion },
    assessment: { work: STEP_REGISTRY.work },
  };

  return { STEP_REGISTRY, STEP_INPUT_SCHEMAS, STEP_REGISTRY_BY_CATEGORY };
});

import {
  getStepDefinition,
  getStepDefinitionOrThrow,
  getStepInputSchema,
  validateStepInputs,
  isValidStep,
  getAllStepIds,
  expandStepOrder,
  getStepCategories,
  getStepTypesByCategory,
  buildStepSkeleton,
} from '../../../../src/modules/steps/registry';

describe('getStepDefinition', () => {
  it('should return step definition', () => {
    const def = getStepDefinition('intro');
    expect(def).toBeDefined();
    expect(def!.id).toBe('intro');
  });

  it('should return undefined for unknown step', () => {
    expect(getStepDefinition('nonexistent')).toBeUndefined();
  });
});

describe('getStepDefinitionOrThrow', () => {
  it('should return definition for valid step', () => {
    expect(getStepDefinitionOrThrow('intro').id).toBe('intro');
  });

  it('should throw for unknown step', () => {
    expect(() => getStepDefinitionOrThrow('nonexistent')).toThrow();
  });
});

describe('getStepInputSchema / validateStepInputs', () => {
  it('should return schema for known step', () => {
    expect(getStepInputSchema('intro')).toBeDefined();
  });

  it('should return undefined for step without schema', () => {
    expect(getStepInputSchema('nonexistent')).toBeUndefined();
  });

  it('should validate valid inputs', () => {
    const result = validateStepInputs('intro', { name: 'John' });
    expect(result.success).toBe(true);
  });

  it('should report validation errors', () => {
    const result = validateStepInputs('intro', { name: 123 });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('should return success when no schema exists', () => {
    const result = validateStepInputs('nonexistent', {});
    expect(result.success).toBe(true);
  });
});

describe('isValidStep / getAllStepIds', () => {
  it('should return true for registered steps', () => {
    expect(isValidStep('intro')).toBe(true);
  });

  it('should return false for unknown steps', () => {
    expect(isValidStep('nonexistent')).toBe(false);
  });

  it('should return all step IDs', () => {
    const ids = getAllStepIds();
    expect(ids).toContain('intro');
    expect(ids).toContain('work');
    expect(ids).toContain('conclusion');
  });
});

describe('expandStepOrder', () => {
  it('should expand steps with expandsTo', () => {
    const result = expandStepOrder(['intro', 'work', 'conclusion']);
    expect(result).toEqual(['intro', 'introWork', 'work', 'conclusionWork', 'conclusion']);
  });

  it('should keep steps without expansion as-is', () => {
    expect(expandStepOrder(['intro'])).toEqual(['intro']);
  });

  it('should handle unknown steps', () => {
    expect(expandStepOrder(['unknown'])).toEqual(['unknown']);
  });
});

describe('getStepCategories', () => {
  it('should return all category IDs', () => {
    const categories = getStepCategories();
    expect(categories).toContain('interview');
    expect(categories).toContain('assessment');
  });
});

describe('getStepTypesByCategory', () => {
  it('should return selectable steps as DTOs', () => {
    const types = getStepTypesByCategory('interview');
    expect(types).toBeDefined();
    // Only selectable steps: intro and conclusion
    expect(types!.length).toBe(2);
    expect(types!.every((t) => t.inputSkeleton !== undefined)).toBe(true);
  });

  it('should return undefined for unknown category', () => {
    expect(getStepTypesByCategory('nonexistent')).toBeUndefined();
  });
});

describe('buildStepSkeleton', () => {
  it('should build skeleton from Zod schema', () => {
    const skeleton = buildStepSkeleton('intro');
    expect(skeleton).toEqual({ name: '', age: 0 });
  });

  it('should return empty object for unknown step', () => {
    expect(buildStepSkeleton('nonexistent')).toEqual({});
  });

  it('should handle ZodEffects (strict schemas)', () => {
    const skeleton = buildStepSkeleton('conclusion');
    expect(skeleton).toEqual({ name: '', age: 0 });
  });
});
