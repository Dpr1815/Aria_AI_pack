/**
 * Unit tests for Interview Statistics Aggregator
 */

import { interviewAggregator } from '../../../../src/modules/statistics/definitions/interview/aggregator';
import { AggregatorInput } from '../../../../src/modules/statistics/types';

describe('interviewAggregator', () => {
  // ============================================
  // HELPERS — build summary data
  // ============================================

  function makeSummary(sections: Record<string, unknown>): AggregatorInput['summaries'][number] {
    return { data: { sections } };
  }

  // ============================================
  // Basic behaviour
  // ============================================

  it('should return totalSummariesAnalyzed', () => {
    const input: AggregatorInput = { summaries: [makeSummary({}), makeSummary({})] };
    const result = interviewAggregator(input);

    expect(result.totalSummariesAnalyzed).toBe(2);
  });

  it('should return empty sections when no section data present', () => {
    const result = interviewAggregator({ summaries: [makeSummary({})] });

    expect(result.sections).toEqual({});
  });

  it('should handle zero summaries', () => {
    const result = interviewAggregator({ summaries: [] });

    expect(result.totalSummariesAnalyzed).toBe(0);
  });

  // ============================================
  // Background section
  // ============================================

  describe('background section', () => {
    it('should aggregate background scores', () => {
      const summaries = [
        makeSummary({
          background: {
            score: 8,
            relevanceToRole: 7,
            yearsOfExperience: 5,
            strengths: ['leadership', 'communication'],
            areasForImprovement: ['time management'],
          },
        }),
        makeSummary({
          background: {
            score: 6,
            relevanceToRole: 9,
            yearsOfExperience: 3,
            strengths: ['leadership', 'technical'],
            areasForImprovement: ['time management', 'delegation'],
          },
        }),
      ];

      const result = interviewAggregator({ summaries });

      expect(result.sections.background).toBeDefined();
      const bg = result.sections.background!;
      expect(bg.averageScore).toBe(7);
      expect(bg.scoreDistribution.min).toBe(6);
      expect(bg.scoreDistribution.max).toBe(8);
      expect(bg.averageRelevanceToRole).toBe(8);
      expect(bg.averageYearsOfExperience).toBe(4);
      expect(bg.topStrengths).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: 'leadership', count: 2 }),
        ])
      );
      expect(bg.topAreasForImprovement).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: 'time management', count: 2 }),
        ])
      );
    });
  });

  // ============================================
  // Behavioral section
  // ============================================

  describe('behavioral section', () => {
    it('should aggregate behavioral scores', () => {
      const summaries = [
        makeSummary({
          behavioral: {
            score: 7,
            culturalFitScore: 8,
            communicationScore: 9,
            teamworkScore: 6,
            strengths: ['empathy'],
            areasForImprovement: ['assertiveness'],
          },
        }),
      ];

      const result = interviewAggregator({ summaries });
      const beh = result.sections.behavioral!;

      expect(beh.averageScore).toBe(7);
      expect(beh.averageCulturalFitScore).toBe(8);
      expect(beh.averageCommunicationScore).toBe(9);
      expect(beh.averageTeamworkScore).toBe(6);
    });
  });

  // ============================================
  // Assessment section
  // ============================================

  describe('assessment section', () => {
    it('should aggregate assessment scores', () => {
      const summaries = [
        makeSummary({ assessment: { candidateScore: 85, problemSolvingScore: 90 } }),
        makeSummary({ assessment: { candidateScore: 75, problemSolvingScore: 80 } }),
      ];

      const result = interviewAggregator({ summaries });
      const assess = result.sections.assessment!;

      expect(assess.averageScore).toBe(80);
      expect(assess.averageProblemSolvingScore).toBe(85);
      expect(assess.scoreDistribution.min).toBe(75);
      expect(assess.scoreDistribution.max).toBe(85);
    });
  });

  // ============================================
  // Linguistic section
  // ============================================

  describe('linguistic section', () => {
    it('should aggregate linguistic sub-scores', () => {
      const summaries = [
        makeSummary({
          linguistic: {
            candidateScore: 7,
            skillsAssessment: { listening: 8, comprehension: 6, grammarAndVocabulary: 9 },
          },
        }),
        makeSummary({
          linguistic: {
            candidateScore: 9,
            skillsAssessment: { listening: 10, comprehension: 8, grammarAndVocabulary: 7 },
          },
        }),
      ];

      const result = interviewAggregator({ summaries });
      const ling = result.sections.linguistic!;

      expect(ling.averageScore).toBe(8);
      expect(ling.averageListening).toBe(9);
      expect(ling.averageComprehension).toBe(7);
      expect(ling.averageGrammarAndVocabulary).toBe(8);
    });
  });

  // ============================================
  // WorkplaceSafety section
  // ============================================

  describe('workplaceSafety section', () => {
    it('should aggregate workplace safety scores', () => {
      const summaries = [
        makeSummary({
          workplaceSafety: {
            score: 9,
            relevanceToRole: 8,
            strengths: ['awareness'],
            areasForImprovement: ['documentation'],
          },
        }),
      ];

      const result = interviewAggregator({ summaries });
      const ws = result.sections.workplaceSafety!;

      expect(ws.averageScore).toBe(9);
      expect(ws.averageRelevanceToRole).toBe(8);
    });
  });

  // ============================================
  // Work / Scenario section
  // ============================================

  describe('work (scenario) section', () => {
    it('should aggregate work/scenario scores', () => {
      const summaries = [
        makeSummary({ work: { candidateScore: 70, professionality: 80 } }),
        makeSummary({ work: { candidateScore: 90, professionality: 60 } }),
      ];

      const result = interviewAggregator({ summaries });
      const work = result.sections.work!;

      expect(work.averageScore).toBe(80);
      expect(work.averageProfessionality).toBe(70);
    });
  });

  // ============================================
  // Multiple sections
  // ============================================

  it('should aggregate multiple sections from same summaries', () => {
    const summaries = [
      makeSummary({
        background: { score: 8 },
        behavioral: { score: 7 },
      }),
    ];

    const result = interviewAggregator({ summaries });

    expect(result.sections.background).toBeDefined();
    expect(result.sections.behavioral).toBeDefined();
  });

  // ============================================
  // Edge cases
  // ============================================

  describe('edge cases', () => {
    it('should skip non-finite numeric values', () => {
      const summaries = [
        makeSummary({ background: { score: NaN, relevanceToRole: Infinity } }),
        makeSummary({ background: { score: 8 } }),
      ];

      const result = interviewAggregator({ summaries });
      const bg = result.sections.background!;

      expect(bg.averageScore).toBe(8); // NaN/Infinity skipped
    });

    it('should skip empty strings in string arrays', () => {
      const summaries = [
        makeSummary({
          background: { score: 5, strengths: ['good', '', '  '] },
        }),
      ];

      const result = interviewAggregator({ summaries });
      const bg = result.sections.background!;

      // Only 'good' should be counted (empty strings filtered)
      expect(bg.topStrengths).toHaveLength(1);
      expect(bg.topStrengths[0].value).toBe('good');
    });

    it('should compute correct median for even count', () => {
      const summaries = [
        makeSummary({ background: { score: 2 } }),
        makeSummary({ background: { score: 4 } }),
        makeSummary({ background: { score: 6 } }),
        makeSummary({ background: { score: 8 } }),
      ];

      const result = interviewAggregator({ summaries });
      const bg = result.sections.background!;

      expect(bg.scoreDistribution.median).toBe(5); // (4+6)/2
      expect(bg.scoreDistribution.average).toBe(5);
    });

    it('should compute correct median for odd count', () => {
      const summaries = [
        makeSummary({ background: { score: 1 } }),
        makeSummary({ background: { score: 3 } }),
        makeSummary({ background: { score: 5 } }),
      ];

      const result = interviewAggregator({ summaries });

      expect(result.sections.background!.scoreDistribution.median).toBe(3);
    });

    it('should normalize and count string frequencies case-insensitively', () => {
      const summaries = [
        makeSummary({ background: { score: 5, strengths: ['Leadership'] } }),
        makeSummary({ background: { score: 5, strengths: ['leadership'] } }),
        makeSummary({ background: { score: 5, strengths: ['LEADERSHIP'] } }),
      ];

      const result = interviewAggregator({ summaries });
      const bg = result.sections.background!;

      expect(bg.topStrengths).toHaveLength(1);
      expect(bg.topStrengths[0].count).toBe(3);
    });
  });
});
