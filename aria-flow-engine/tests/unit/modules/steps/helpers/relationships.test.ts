/**
 * Unit tests for steps/helpers/relationships
 */

jest.mock('../../../../../src/modules/steps/definitions', () => ({
  STEP_REGISTRY: {} as any,
  STEP_INPUT_SCHEMAS: {},
  STEP_REGISTRY_BY_CATEGORY: {},
}));

import { STEP_REGISTRY } from '../../../../../src/modules/steps/definitions';
import {
  isReportStep,
  isSubStep,
  getParentStep,
  getSubSteps,
  expandStep,
  hasExpansion,
  getReportStepsForParent,
  getConversationalSubSteps,
  getStepPosition,
  isFirstPositionStep,
  isLastPositionStep,
  isSelectable,
  getSelectableSteps,
  getSelectableStepIds,
  getRootParent,
  getExpansionChain,
} from '../../../../../src/modules/steps/helpers/relationships';

const registry = STEP_REGISTRY as Record<string, any>;

beforeEach(() => {
  for (const key of Object.keys(registry)) {
    delete registry[key];
  }
});

describe('isReportStep', () => {
  it('should return false for unknown step', () => {
    expect(isReportStep('unknown')).toBe(false);
  });

  it('should return true for report steps', () => {
    registry.report = { id: 'report', isReport: true };
    expect(isReportStep('report')).toBe(true);
  });

  it('should return false for non-report steps', () => {
    registry.work = { id: 'work' };
    expect(isReportStep('work')).toBe(false);
  });
});

describe('isSubStep / getParentStep', () => {
  it('should return false/undefined for steps without parent', () => {
    registry.intro = { id: 'intro' };
    expect(isSubStep('intro')).toBe(false);
    expect(getParentStep('intro')).toBeUndefined();
  });

  it('should detect sub-steps', () => {
    registry.introWork = { id: 'introWork', parentStep: 'work' };
    expect(isSubStep('introWork')).toBe(true);
    expect(getParentStep('introWork')).toBe('work');
  });
});

describe('getSubSteps', () => {
  it('should return sub-steps for a parent', () => {
    registry.introWork = { id: 'introWork', parentStep: 'work' };
    registry.work = { id: 'work', parentStep: 'work' };
    registry.conclusionWork = { id: 'conclusionWork', parentStep: 'work' };
    registry.intro = { id: 'intro' };

    const subs = getSubSteps('work');
    expect(subs).toContain('introWork');
    expect(subs).toContain('work');
    expect(subs).toContain('conclusionWork');
    expect(subs).not.toContain('intro');
  });

  it('should return empty for step with no sub-steps', () => {
    registry.intro = { id: 'intro' };
    expect(getSubSteps('intro')).toEqual([]);
  });
});

describe('expandStep / hasExpansion', () => {
  it('should return self for step without expansion', () => {
    registry.intro = { id: 'intro' };
    expect(expandStep('intro')).toEqual(['intro']);
    expect(hasExpansion('intro')).toBe(false);
  });

  it('should return expanded steps', () => {
    registry.work = { id: 'work', expandsTo: ['introWork', 'work', 'conclusionWork'] };
    expect(expandStep('work')).toEqual(['introWork', 'work', 'conclusionWork']);
    expect(hasExpansion('work')).toBe(true);
  });

  it('should return self for unknown step', () => {
    expect(expandStep('unknown')).toEqual(['unknown']);
    expect(hasExpansion('unknown')).toBe(false);
  });

  it('should return false for empty expandsTo', () => {
    registry.step = { id: 'step', expandsTo: [] };
    expect(hasExpansion('step')).toBe(false);
  });
});

describe('getReportStepsForParent / getConversationalSubSteps', () => {
  beforeEach(() => {
    registry.introWork = { id: 'introWork', parentStep: 'work' };
    registry.mainWork = { id: 'mainWork', parentStep: 'work' };
    registry.reportWork = { id: 'reportWork', parentStep: 'work', isReport: true };
  });

  it('should return only report sub-steps', () => {
    expect(getReportStepsForParent('work')).toEqual(['reportWork']);
  });

  it('should return only conversational sub-steps', () => {
    const result = getConversationalSubSteps('work');
    expect(result).toContain('introWork');
    expect(result).toContain('mainWork');
    expect(result).not.toContain('reportWork');
  });
});

describe('getStepPosition / isFirstPositionStep / isLastPositionStep', () => {
  it('should return flexible by default', () => {
    registry.bg = { id: 'bg' };
    expect(getStepPosition('bg')).toBe('flexible');
    expect(isFirstPositionStep('bg')).toBe(false);
    expect(isLastPositionStep('bg')).toBe(false);
  });

  it('should return first position', () => {
    registry.intro = { id: 'intro', position: 'first' };
    expect(getStepPosition('intro')).toBe('first');
    expect(isFirstPositionStep('intro')).toBe(true);
    expect(isLastPositionStep('intro')).toBe(false);
  });

  it('should return last position', () => {
    registry.conclusion = { id: 'conclusion', position: 'last' };
    expect(getStepPosition('conclusion')).toBe('last');
    expect(isFirstPositionStep('conclusion')).toBe(false);
    expect(isLastPositionStep('conclusion')).toBe(true);
  });

  it('should return flexible for unknown step', () => {
    expect(getStepPosition('unknown')).toBe('flexible');
  });
});

describe('isSelectable / getSelectableSteps / getSelectableStepIds', () => {
  beforeEach(() => {
    registry.intro = { id: 'intro', selectable: true };
    registry.work = { id: 'work', selectable: true };
    registry.introWork = { id: 'introWork', selectable: false };
    registry.conclusion = { id: 'conclusion', selectable: true };
  });

  it('should check if step is selectable', () => {
    expect(isSelectable('intro')).toBe(true);
    expect(isSelectable('introWork')).toBe(false);
    expect(isSelectable('unknown')).toBe(false);
  });

  it('should return all selectable steps', () => {
    const steps = getSelectableSteps();
    expect(steps).toHaveLength(3);
  });

  it('should return all selectable step IDs', () => {
    const ids = getSelectableStepIds();
    expect(ids).toEqual(expect.arrayContaining(['intro', 'work', 'conclusion']));
    expect(ids).not.toContain('introWork');
  });
});

describe('getRootParent', () => {
  it('should return self when no parent', () => {
    registry.intro = { id: 'intro' };
    expect(getRootParent('intro')).toBe('intro');
  });

  it('should traverse to root parent', () => {
    registry.grandchild = { id: 'grandchild', parentStep: 'child' };
    registry.child = { id: 'child', parentStep: 'root' };
    registry.root = { id: 'root' };
    expect(getRootParent('grandchild')).toBe('root');
  });

  it('should return direct parent when one level deep', () => {
    registry.sub = { id: 'sub', parentStep: 'parent' };
    registry.parent = { id: 'parent' };
    expect(getRootParent('sub')).toBe('parent');
  });
});

describe('getExpansionChain', () => {
  it('should return self when no expansion', () => {
    registry.intro = { id: 'intro' };
    expect(getExpansionChain('intro')).toEqual(['intro']);
  });

  it('should return all steps in expansion', () => {
    registry.parent = { id: 'parent', expandsTo: ['child1', 'child2'] };
    registry.child1 = { id: 'child1' };
    registry.child2 = { id: 'child2' };
    expect(getExpansionChain('parent')).toEqual(['child1', 'child2']);
  });

  it('should recursively expand nested expansions', () => {
    registry.root = { id: 'root', expandsTo: ['mid'] };
    registry.mid = { id: 'mid', expandsTo: ['leaf1', 'leaf2'] };
    registry.leaf1 = { id: 'leaf1' };
    registry.leaf2 = { id: 'leaf2' };
    expect(getExpansionChain('root')).toEqual(['leaf1', 'leaf2']);
  });
});
