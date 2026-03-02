/**
 * SSA Statistics Aggregator
 *
 * Pure function that computes aggregate metrics from soft skill assessment summaries.
 * Each summary's `data` field contains a `sections` object keyed by step key
 * (e.g. data.sections.ssaRolePlay, data.sections.ssaScenarioQuestions, data.sections.ssaOpenQuestions).
 */

import { AggregatorInput } from '../../types';
import { FrequencyItem, SSAStatisticsData, ScoreDistribution } from './schema';

// ============================================
// HELPERS
// ============================================

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current !== null && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function collectNumericValues(summaries: AggregatorInput['summaries'], path: string): number[] {
  return summaries.reduce<number[]>((values, summary) => {
    const value = getNestedValue(summary.data, path);
    if (typeof value === 'number' && Number.isFinite(value)) {
      values.push(value);
    }
    return values;
  }, []);
}

function collectStringArrays(summaries: AggregatorInput['summaries'], path: string): string[] {
  return summaries.reduce<string[]>((values, summary) => {
    const value = getNestedValue(summary.data, path);
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.length > 0) {
          values.push(item);
        }
      }
    }
    return values;
  }, []);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100
    : sorted[mid];
}

function computeDistribution(values: number[]): ScoreDistribution {
  if (values.length === 0) {
    return { min: 0, max: 0, average: 0, median: 0 };
  }
  return {
    min: values.reduce((m, v) => (v < m ? v : m), values[0]),
    max: values.reduce((m, v) => (v > m ? v : m), values[0]),
    average: average(values),
    median: median(values),
  };
}

function topFrequencies(items: string[], limit: number = 10): FrequencyItem[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const normalized = item.trim().toLowerCase();
    if (normalized.length > 0) {
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function hasSectionData(summaries: AggregatorInput['summaries'], sectionPath: string): boolean {
  return summaries.some((s) => {
    const section = getNestedValue(s.data, sectionPath);
    return section !== null && section !== undefined && typeof section === 'object';
  });
}

// ============================================
// PATH HELPER
// ============================================

function sectionPath(sectionKey: string, field: string): string {
  return `sections.${sectionKey}.${field}`;
}

// ============================================
// SECTION AGGREGATORS
// ============================================

function aggregateRolePlay(summaries: AggregatorInput['summaries']) {
  const key = 'ssaRolePlay';
  const scores = collectNumericValues(summaries, sectionPath(key, 'score'));
  return {
    averageScore: average(scores),
    scoreDistribution: computeDistribution(scores),
    averageTurningPointHandling: average(
      collectNumericValues(summaries, sectionPath(key, 'turningPointHandling'))
    ),
    topStrengths: topFrequencies(collectStringArrays(summaries, sectionPath(key, 'strengths'))),
    topAreasForImprovement: topFrequencies(
      collectStringArrays(summaries, sectionPath(key, 'areasForImprovement'))
    ),
  };
}

function aggregateScenarioQuestions(summaries: AggregatorInput['summaries']) {
  const key = 'ssaScenarioQuestions';
  const scores = collectNumericValues(summaries, sectionPath(key, 'score'));
  return {
    averageScore: average(scores),
    scoreDistribution: computeDistribution(scores),
    averageSituationalAwareness: average(
      collectNumericValues(summaries, sectionPath(key, 'situationalAwareness'))
    ),
    topStrengths: topFrequencies(collectStringArrays(summaries, sectionPath(key, 'strengths'))),
    topAreasForImprovement: topFrequencies(
      collectStringArrays(summaries, sectionPath(key, 'areasForImprovement'))
    ),
  };
}

function aggregateOpenQuestions(summaries: AggregatorInput['summaries']) {
  const key = 'ssaOpenQuestions';
  const scores = collectNumericValues(summaries, sectionPath(key, 'score'));
  return {
    averageScore: average(scores),
    scoreDistribution: computeDistribution(scores),
    averageSelfAwareness: average(
      collectNumericValues(summaries, sectionPath(key, 'selfAwareness'))
    ),
    topStrengths: topFrequencies(collectStringArrays(summaries, sectionPath(key, 'strengths'))),
    topAreasForImprovement: topFrequencies(
      collectStringArrays(summaries, sectionPath(key, 'areasForImprovement'))
    ),
  };
}

// ============================================
// MAIN AGGREGATOR
// ============================================

const SECTION_AGGREGATORS: Record<
  string,
  (summaries: AggregatorInput['summaries']) => Record<string, unknown>
> = {
  ssaRolePlay: aggregateRolePlay,
  ssaScenarioQuestions: aggregateScenarioQuestions,
  ssaOpenQuestions: aggregateOpenQuestions,
};

export function ssaAggregator(input: AggregatorInput): SSAStatisticsData {
  const { summaries } = input;

  const sections: Record<string, Record<string, unknown>> = {};

  for (const [sectionKey, aggregateFn] of Object.entries(SECTION_AGGREGATORS)) {
    if (hasSectionData(summaries, `sections.${sectionKey}`)) {
      sections[sectionKey] = aggregateFn(summaries);
    }
  }

  return {
    totalSummariesAnalyzed: summaries.length,
    sections,
  } as SSAStatisticsData;
}
