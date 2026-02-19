/**
 * Unit tests for Learning & Development Statistics Aggregator
 */

import { ldAggregator } from '../../../../src/modules/statistics/definitions/learningDevelopment/aggregator';
import { AggregatorInput } from '../../../../src/modules/statistics/types';

describe('ldAggregator', () => {
  function makeSummary(sections: Record<string, unknown>): AggregatorInput['summaries'][number] {
    return { data: { sections } };
  }

  // ============================================
  // Basic behaviour
  // ============================================

  it('should return totalSummariesAnalyzed', () => {
    const result = ldAggregator({ summaries: [makeSummary({}), makeSummary({}), makeSummary({})] });
    expect(result.totalSummariesAnalyzed).toBe(3);
  });

  it('should return empty sections when no section data present', () => {
    const result = ldAggregator({ summaries: [makeSummary({})] });
    expect(result.sections).toEqual({});
  });

  it('should handle zero summaries', () => {
    const result = ldAggregator({ summaries: [] });
    expect(result.totalSummariesAnalyzed).toBe(0);
  });

  // ============================================
  // Knowledge Transfer section
  // ============================================

  describe('knowledgeTransfer section', () => {
    it('should aggregate knowledge transfer scores', () => {
      const summaries = [
        makeSummary({
          knowledgeTransfer: {
            score: 8,
            comprehensionScore: 7,
            strengths: ['clarity', 'examples'],
            areasForImprovement: ['pacing'],
          },
        }),
        makeSummary({
          knowledgeTransfer: {
            score: 6,
            comprehensionScore: 9,
            strengths: ['clarity', 'structure'],
            areasForImprovement: ['engagement'],
          },
        }),
      ];

      const result = ldAggregator({ summaries });
      const kt = result.sections.knowledgeTransfer!;

      expect(kt.averageScore).toBe(7);
      expect(kt.averageComprehensionScore).toBe(8);
      expect(kt.scoreDistribution.min).toBe(6);
      expect(kt.scoreDistribution.max).toBe(8);
      expect(kt.topStrengths).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: 'clarity', count: 2 }),
        ])
      );
    });
  });

  // ============================================
  // Practical Application section
  // ============================================

  describe('practicalApplication section', () => {
    it('should aggregate practical application scores', () => {
      const summaries = [
        makeSummary({
          practicalApplication: {
            score: 9,
            scenarioPerformance: 8,
            problemSolvingScore: 7,
            strengths: ['creativity'],
            areasForImprovement: ['time management'],
          },
        }),
        makeSummary({
          practicalApplication: {
            score: 7,
            scenarioPerformance: 6,
            problemSolvingScore: 9,
            strengths: ['attention to detail'],
            areasForImprovement: ['time management'],
          },
        }),
      ];

      const result = ldAggregator({ summaries });
      const pa = result.sections.practicalApplication!;

      expect(pa.averageScore).toBe(8);
      expect(pa.averageScenarioPerformance).toBe(7);
      expect(pa.averageProblemSolvingScore).toBe(8);
      expect(pa.scoreDistribution.min).toBe(7);
      expect(pa.scoreDistribution.max).toBe(9);
      expect(pa.topAreasForImprovement).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: 'time management', count: 2 }),
        ])
      );
    });
  });

  // ============================================
  // Multiple sections
  // ============================================

  it('should aggregate multiple sections from same summaries', () => {
    const summaries = [
      makeSummary({
        knowledgeTransfer: { score: 7 },
        practicalApplication: { score: 8 },
      }),
    ];

    const result = ldAggregator({ summaries });

    expect(result.sections.knowledgeTransfer).toBeDefined();
    expect(result.sections.practicalApplication).toBeDefined();
  });

  // ============================================
  // Edge cases
  // ============================================

  describe('edge cases', () => {
    it('should skip non-finite numeric values', () => {
      const summaries = [
        makeSummary({ knowledgeTransfer: { score: NaN } }),
        makeSummary({ knowledgeTransfer: { score: 8 } }),
      ];

      const result = ldAggregator({ summaries });

      expect(result.sections.knowledgeTransfer!.averageScore).toBe(8);
    });

    it('should handle summaries where only some have section data', () => {
      const summaries = [
        makeSummary({ knowledgeTransfer: { score: 10 } }),
        makeSummary({}), // No knowledgeTransfer section
        makeSummary({ knowledgeTransfer: { score: 6 } }),
      ];

      const result = ldAggregator({ summaries });
      const kt = result.sections.knowledgeTransfer!;

      expect(kt.averageScore).toBe(8);
      expect(result.totalSummariesAnalyzed).toBe(3);
    });

    it('should compute correct median for even count', () => {
      const summaries = [
        makeSummary({ practicalApplication: { score: 2 } }),
        makeSummary({ practicalApplication: { score: 8 } }),
      ];

      const result = ldAggregator({ summaries });

      expect(result.sections.practicalApplication!.scoreDistribution.median).toBe(5);
    });

    it('should normalize and count frequencies case-insensitively', () => {
      const summaries = [
        makeSummary({ knowledgeTransfer: { score: 5, strengths: ['Clarity'] } }),
        makeSummary({ knowledgeTransfer: { score: 5, strengths: ['clarity'] } }),
      ];

      const result = ldAggregator({ summaries });
      const kt = result.sections.knowledgeTransfer!;

      expect(kt.topStrengths).toHaveLength(1);
      expect(kt.topStrengths[0].count).toBe(2);
    });
  });
});
