/**
 * Unit tests for steps/helpers/generation
 */

// Mock the definitions module that generation.ts imports from
jest.mock('../../../../../src/modules/steps/definitions', () => ({
  STEP_REGISTRY: {} as any,
  STEP_INPUT_SCHEMAS: {},
  STEP_REGISTRY_BY_CATEGORY: {},
}));

import { STEP_REGISTRY } from '../../../../../src/modules/steps/definitions';
import {
  getGenerationTemplateId,
  hasGenerationConfig,
  usesPipelineGeneration,
  getGenerationStages,
  getGenerationConfig,
  shouldIncludeSteps,
  getAdditionalDataRequirements,
  validateAdditionalData,
  validateStageRequirements,
  hasArtifacts,
  hasAssessmentArtifact,
  getAssessmentArtifactConfig,
  getStepsRequiringGeneration,
  deduplicateByGenerationTemplate,
} from '../../../../../src/modules/steps/helpers/generation';

const registry = STEP_REGISTRY as Record<string, any>;

beforeEach(() => {
  // Clear registry
  for (const key of Object.keys(registry)) {
    delete registry[key];
  }
});

describe('getGenerationTemplateId', () => {
  it('should return undefined for unknown step', () => {
    expect(getGenerationTemplateId('unknown')).toBeUndefined();
  });

  it('should return undefined when step has no generation config', () => {
    registry.intro = { id: 'intro' };
    expect(getGenerationTemplateId('intro')).toBeUndefined();
  });

  it('should return simple template string', () => {
    registry.bg = { id: 'bg', generation: { template: 'bg-gen' } };
    expect(getGenerationTemplateId('bg')).toBe('bg-gen');
  });

  it('should return conditional template based on additionalData', () => {
    registry.assess = {
      id: 'assess',
      generation: {
        templates: { coding: 'coding-gen', written: 'written-gen', default: 'default-gen' },
        templateSelector: 'assessment_type',
      },
    };
    expect(getGenerationTemplateId('assess', { assessment_type: 'coding' })).toBe('coding-gen');
  });

  it('should return default template when selector value not found', () => {
    registry.assess = {
      id: 'assess',
      generation: {
        templates: { coding: 'coding-gen', default: 'default-gen' },
        templateSelector: 'assessment_type',
      },
    };
    expect(getGenerationTemplateId('assess', { assessment_type: 'unknown' })).toBe('default-gen');
  });

  it('should return undefined for conditional template without additionalData', () => {
    registry.assess = {
      id: 'assess',
      generation: {
        templates: { coding: 'coding-gen' },
        templateSelector: 'assessment_type',
      },
    };
    expect(getGenerationTemplateId('assess')).toBeUndefined();
  });

  it('should return first stage template for pipeline generation', () => {
    registry.work = {
      id: 'work',
      generation: {
        stages: [
          { id: 's1', template: 'stage1-tpl' },
          { id: 's2', template: 'stage2-tpl' },
        ],
      },
    };
    expect(getGenerationTemplateId('work')).toBe('stage1-tpl');
  });

  it('should resolve conditional stage template', () => {
    registry.work = {
      id: 'work',
      generation: {
        stages: [
          {
            id: 's1',
            template: { coding: 'coding-stage', default: 'default-stage' },
            templateSelector: 'assessment_type',
          },
        ],
      },
    };
    expect(getGenerationTemplateId('work', { assessment_type: 'coding' })).toBe('coding-stage');
  });

  it('should return default stage template when selector not matched', () => {
    registry.work = {
      id: 'work',
      generation: {
        stages: [
          {
            id: 's1',
            template: { coding: 'coding-stage', default: 'default-stage' },
            templateSelector: 'assessment_type',
          },
        ],
      },
    };
    expect(getGenerationTemplateId('work', { assessment_type: 'unknown' })).toBe('default-stage');
  });

  it('should return undefined for empty generation config', () => {
    registry.empty = { id: 'empty', generation: {} };
    expect(getGenerationTemplateId('empty')).toBeUndefined();
  });
});

describe('hasGenerationConfig', () => {
  it('should return false for unknown step', () => {
    expect(hasGenerationConfig('unknown')).toBe(false);
  });

  it('should return false when step has no generation', () => {
    registry.intro = { id: 'intro' };
    expect(hasGenerationConfig('intro')).toBe(false);
  });

  it('should return true when step has generation', () => {
    registry.bg = { id: 'bg', generation: { template: 'tpl' } };
    expect(hasGenerationConfig('bg')).toBe(true);
  });
});

describe('usesPipelineGeneration', () => {
  it('should return false for unknown step', () => {
    expect(usesPipelineGeneration('unknown')).toBe(false);
  });

  it('should return false for simple template', () => {
    registry.bg = { id: 'bg', generation: { template: 'tpl' } };
    expect(usesPipelineGeneration('bg')).toBe(false);
  });

  it('should return true for pipeline with stages', () => {
    registry.work = {
      id: 'work',
      generation: { stages: [{ id: 's1', template: 't1' }] },
    };
    expect(usesPipelineGeneration('work')).toBe(true);
  });

  it('should return false for empty stages array', () => {
    registry.work = { id: 'work', generation: { stages: [] } };
    expect(usesPipelineGeneration('work')).toBe(false);
  });
});

describe('getGenerationStages', () => {
  it('should return empty array for unknown step', () => {
    expect(getGenerationStages('unknown')).toEqual([]);
  });

  it('should return stages array', () => {
    const stages = [{ id: 's1', template: 't1' }];
    registry.work = { id: 'work', generation: { stages } };
    expect(getGenerationStages('work')).toEqual(stages);
  });
});

describe('getGenerationConfig', () => {
  it('should return undefined for unknown step', () => {
    expect(getGenerationConfig('unknown')).toBeUndefined();
  });

  it('should return the generation config', () => {
    const gen = { template: 'tpl' };
    registry.bg = { id: 'bg', generation: gen };
    expect(getGenerationConfig('bg')).toEqual(gen);
  });
});

describe('shouldIncludeSteps', () => {
  it('should return false for unknown step', () => {
    expect(shouldIncludeSteps('unknown')).toBe(false);
  });

  it('should return false when includeSteps not set', () => {
    registry.bg = { id: 'bg', generation: { template: 'tpl' } };
    expect(shouldIncludeSteps('bg')).toBe(false);
  });

  it('should return true when includeSteps is true', () => {
    registry.bg = { id: 'bg', generation: { template: 'tpl', includeSteps: true } };
    expect(shouldIncludeSteps('bg')).toBe(true);
  });
});

describe('getAdditionalDataRequirements', () => {
  it('should return undefined for unknown step', () => {
    expect(getAdditionalDataRequirements('unknown')).toBeUndefined();
  });

  it('should return undefined when no additionalData config', () => {
    registry.intro = { id: 'intro' };
    expect(getAdditionalDataRequirements('intro')).toBeUndefined();
  });

  it('should return required and optional fields', () => {
    registry.assess = {
      id: 'assess',
      additionalData: { required: ['assessment_type'], optional: ['difficulty'] },
    };
    expect(getAdditionalDataRequirements('assess')).toEqual({
      required: ['assessment_type'],
      optional: ['difficulty'],
    });
  });

  it('should default optional to empty array', () => {
    registry.assess = {
      id: 'assess',
      additionalData: { required: ['assessment_type'] },
    };
    expect(getAdditionalDataRequirements('assess')).toEqual({
      required: ['assessment_type'],
      optional: [],
    });
  });
});

describe('validateAdditionalData', () => {
  it('should return valid when step has no requirements', () => {
    registry.intro = { id: 'intro' };
    expect(validateAdditionalData('intro')).toEqual({ valid: true, missingFields: [] });
  });

  it('should return valid when all required fields present', () => {
    registry.assess = {
      id: 'assess',
      additionalData: { required: ['assessment_type'] },
    };
    expect(validateAdditionalData('assess', { assessment_type: 'coding' })).toEqual({
      valid: true,
      missingFields: [],
    });
  });

  it('should return invalid with missing fields', () => {
    registry.assess = {
      id: 'assess',
      additionalData: { required: ['assessment_type', 'difficulty'] },
    };
    expect(validateAdditionalData('assess', { assessment_type: 'coding' })).toEqual({
      valid: false,
      missingFields: ['difficulty'],
    });
  });

  it('should treat null, undefined, empty string as missing', () => {
    registry.assess = {
      id: 'assess',
      additionalData: { required: ['a', 'b', 'c'] },
    };
    expect(validateAdditionalData('assess', { a: null, b: undefined, c: '' })).toEqual({
      valid: false,
      missingFields: ['a', 'b', 'c'],
    });
  });

  it('should treat missing additionalData as all fields missing', () => {
    registry.assess = {
      id: 'assess',
      additionalData: { required: ['field1'] },
    };
    expect(validateAdditionalData('assess')).toEqual({
      valid: false,
      missingFields: ['field1'],
    });
  });
});

describe('validateStageRequirements', () => {
  it('should return valid when no required variables', () => {
    expect(validateStageRequirements({ id: 's1', template: 't1' })).toEqual({
      valid: true,
      missingFields: [],
    });
  });

  it('should check required variables', () => {
    const result = validateStageRequirements(
      { id: 's1', template: 't1', requiredVariables: ['field1'] },
      { field1: 'value' }
    );
    expect(result).toEqual({ valid: true, missingFields: [] });
  });

  it('should report missing required variables', () => {
    const result = validateStageRequirements(
      { id: 's1', template: 't1', requiredVariables: ['missing'] },
      { other: 'value' }
    );
    expect(result).toEqual({ valid: false, missingFields: ['missing'] });
  });

  it('should include conditional variables based on selector', () => {
    const result = validateStageRequirements(
      {
        id: 's1',
        template: 't1',
        templateSelector: 'type',
        conditionalVariables: { coding: ['language', 'framework'] },
      },
      { type: 'coding', language: 'JS' }
    );
    expect(result).toEqual({ valid: false, missingFields: ['framework'] });
  });

  it('should not include conditional variables for non-matching selector', () => {
    const result = validateStageRequirements(
      {
        id: 's1',
        template: 't1',
        templateSelector: 'type',
        conditionalVariables: { coding: ['language'] },
      },
      { type: 'written' }
    );
    expect(result).toEqual({ valid: true, missingFields: [] });
  });
});

describe('hasArtifacts / hasAssessmentArtifact / getAssessmentArtifactConfig', () => {
  it('should return false for step without artifacts', () => {
    registry.intro = { id: 'intro' };
    expect(hasArtifacts('intro')).toBe(false);
    expect(hasAssessmentArtifact('intro')).toBe(false);
    expect(getAssessmentArtifactConfig('intro')).toBeUndefined();
  });

  it('should detect assessment artifact', () => {
    const assessmentConfig = { testContentField: 'test', durationField: 'duration' };
    registry.work = { id: 'work', artifacts: { assessment: assessmentConfig } };
    expect(hasArtifacts('work')).toBe(true);
    expect(hasAssessmentArtifact('work')).toBe(true);
    expect(getAssessmentArtifactConfig('work')).toEqual(assessmentConfig);
  });
});

describe('getStepsRequiringGeneration', () => {
  it('should filter to steps with generation config', () => {
    registry.intro = { id: 'intro' };
    registry.bg = { id: 'bg', generation: { template: 'tpl' } };
    registry.work = { id: 'work', generation: { stages: [{ id: 's1', template: 't1' }] } };

    expect(getStepsRequiringGeneration(['intro', 'bg', 'work'])).toEqual(['bg', 'work']);
  });

  it('should return empty for no generation steps', () => {
    registry.intro = { id: 'intro' };
    expect(getStepsRequiringGeneration(['intro'])).toEqual([]);
  });
});

describe('deduplicateByGenerationTemplate', () => {
  it('should deduplicate steps with same template', () => {
    registry.s1 = { id: 's1', generation: { template: 'shared-tpl' } };
    registry.s2 = { id: 's2', generation: { template: 'shared-tpl' } };

    expect(deduplicateByGenerationTemplate(['s1', 's2'])).toEqual(['s1']);
  });

  it('should keep steps with different templates', () => {
    registry.s1 = { id: 's1', generation: { template: 'tpl1' } };
    registry.s2 = { id: 's2', generation: { template: 'tpl2' } };

    expect(deduplicateByGenerationTemplate(['s1', 's2'])).toEqual(['s1', 's2']);
  });

  it('should skip steps without generation', () => {
    registry.intro = { id: 'intro' };
    registry.bg = { id: 'bg', generation: { template: 'tpl' } };

    expect(deduplicateByGenerationTemplate(['intro', 'bg'])).toEqual(['bg']);
  });

  it('should handle steps with unresolvable templates individually', () => {
    registry.s1 = { id: 's1', generation: {} };
    registry.s2 = { id: 's2', generation: {} };

    // Each gets unique key __step_<id> since template is undefined
    expect(deduplicateByGenerationTemplate(['s1', 's2'])).toEqual(['s1', 's2']);
  });
});
