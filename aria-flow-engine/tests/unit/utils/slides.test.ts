/**
 * Unit tests for slides utility
 */

import { buildSlidesFromStepOrder } from '../../../src/utils/slides';

// Mock @modules
jest.mock('@modules', () => ({
  ...jest.requireActual('@modules'),
  getParentStep: jest.fn(),
}));

import { getParentStep } from '@modules';

const mockGetParentStep = getParentStep as jest.MockedFunction<typeof getParentStep>;

describe('buildSlidesFromStepOrder', () => {
  beforeEach(() => {
    mockGetParentStep.mockReturnValue(undefined);
  });

  it('should assign sequential slide numbers when no parent steps', () => {
    const result = buildSlidesFromStepOrder(['intro', 'background', 'conclusion']);

    expect(result).toEqual({
      intro: 1,
      background: 2,
      conclusion: 3,
    });
  });

  it('should group sub-steps under the same slide as their parent', () => {
    mockGetParentStep.mockImplementation((key) => {
      if (key === 'introWork' || key === 'work' || key === 'conclusionWork') return 'work';
      return undefined;
    });

    const result = buildSlidesFromStepOrder([
      'intro',
      'introWork',
      'work',
      'conclusionWork',
      'behavioral',
      'conclusion',
    ]);

    expect(result).toEqual({
      intro: 1,
      introWork: 2,
      work: 2,
      conclusionWork: 2,
      behavioral: 3,
      conclusion: 4,
    });
  });

  it('should handle the example from the docstring', () => {
    mockGetParentStep.mockImplementation((key) => {
      if (['introWork', 'work', 'conclusionWork', 'reportScenario'].includes(key)) return 'work';
      if (['behavioral', 'reportBehavioral'].includes(key)) return 'behavioral';
      return undefined;
    });

    const result = buildSlidesFromStepOrder([
      'intro',
      'introWork',
      'work',
      'conclusionWork',
      'reportScenario',
      'behavioral',
      'reportBehavioral',
      'conclusion',
    ]);

    expect(result).toEqual({
      intro: 1,
      introWork: 2,
      work: 2,
      conclusionWork: 2,
      reportScenario: 2,
      behavioral: 3,
      reportBehavioral: 3,
      conclusion: 4,
    });
  });

  it('should return empty object for empty step order', () => {
    expect(buildSlidesFromStepOrder([])).toEqual({});
  });

  it('should handle single step', () => {
    expect(buildSlidesFromStepOrder(['intro'])).toEqual({ intro: 1 });
  });
});
