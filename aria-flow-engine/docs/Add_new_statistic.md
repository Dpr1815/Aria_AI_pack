# How to Add a New Statistics Type

## Overview

The statistics system is **config-driven**. Adding a new statistics type requires zero changes to `StatisticsService` — you define a config, write a pure aggregator function, add a Zod output schema, and register it.

**Pipeline:**
```
Summaries (filtered by typeId) → Pure Aggregator Function → Zod Validation → Persist
```

The service fetches all summaries matching `requiredSummaryTypeId` for the agent, passes them to your aggregator function, validates the output against your Zod schema, and persists the result.

Aggregators are **pure functions** — no I/O, no database calls, no LLM calls. They receive pre-fetched data and return computed metrics. This makes them deterministic and easily testable.

---

## Quick Start (4 Steps)

### 1. Create Output Schema

Create a Zod schema that validates your aggregator's output:

```typescript
// src/modules/statistics/definitions/onboarding/schema.ts

import { z } from 'zod';

const ScoreDistributionSchema = z.object({
  min: z.number(),
  max: z.number(),
  average: z.number(),
  median: z.number(),
});

const OnboardingProgressAggregateSchema = z.object({
  averageScore: z.number(),
  scoreDistribution: ScoreDistributionSchema,
  averageCompletionRate: z.number(),
  topStrengths: z.array(z.object({ value: z.string(), count: z.number() })),
});

export const OnboardingStatisticsDataSchema = z.object({
  totalSummariesAnalyzed: z.number(),
  sections: z.object({
    progress: OnboardingProgressAggregateSchema.optional(),
    feedback: z.object({
      averageSatisfaction: z.number(),
      scoreDistribution: ScoreDistributionSchema,
    }).optional(),
  }),
});

export type OnboardingStatisticsData = z.infer<typeof OnboardingStatisticsDataSchema>;
```

### 2. Create Aggregator Function

Write a **pure function** that computes aggregate metrics from summaries:

```typescript
// src/modules/statistics/definitions/onboarding/aggregator.ts

import { AggregatorInput } from '../../types';
import { OnboardingStatisticsData } from './schema';

// Helper: safely extract a numeric value from nested data
function getNumber(data: Record<string, unknown>, path: string): number | undefined {
  const value = path.split('.').reduce<unknown>((obj, key) => {
    if (obj !== null && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
    return undefined;
  }, data);
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100;
}

export function onboardingAggregator(input: AggregatorInput): OnboardingStatisticsData {
  const { summaries } = input;

  // Collect scores from each summary's data.sections.progress.score
  const progressScores = summaries
    .map((s) => getNumber(s.data, 'sections.progress.score'))
    .filter((v): v is number => v !== undefined);

  return {
    totalSummariesAnalyzed: summaries.length,
    sections: {
      progress: progressScores.length > 0
        ? {
            averageScore: average(progressScores),
            scoreDistribution: {
              min: Math.min(...progressScores),
              max: Math.max(...progressScores),
              average: average(progressScores),
              median: /* your median logic */ 0,
            },
            averageCompletionRate: average(
              summaries
                .map((s) => getNumber(s.data, 'sections.progress.completionRate'))
                .filter((v): v is number => v !== undefined)
            ),
            topStrengths: [], // Compute frequency counts from string arrays
          }
        : undefined,
    },
  };
}
```

### 3. Create Statistics Config

Define the config that ties everything together:

```typescript
// src/modules/statistics/definitions/onboarding/config.ts

import { StatisticsTypeConfig } from '../../types';
import { OnboardingStatisticsDataSchema } from './schema';
import { onboardingAggregator } from './aggregator';

export const ONBOARDING_STATISTICS_ID = 'onboarding';

export const onboardingStatisticsConfig: StatisticsTypeConfig = {
  id: ONBOARDING_STATISTICS_ID,
  name: 'Onboarding Statistics',
  description: 'Aggregated metrics across all onboarding summaries for an agent.',
  requiredSummaryTypeId: 'onboarding',  // Must match a registered summary type ID
  aggregate: onboardingAggregator,
  outputSchema: OnboardingStatisticsDataSchema,
};
```

### 4. Register in Statistics Registry

```typescript
// src/modules/statistics/definitions/onboarding/index.ts
export { ONBOARDING_STATISTICS_ID, onboardingStatisticsConfig } from './config';
export { onboardingAggregator } from './aggregator';
export * from './schema';
```

```typescript
// src/modules/statistics/definitions/index.ts

import { INTERVIEW_STATISTICS_ID, interviewStatisticsConfig } from './interview';
import { ONBOARDING_STATISTICS_ID, onboardingStatisticsConfig } from './onboarding'; // Add

export { INTERVIEW_STATISTICS_ID } from './interview';
export { ONBOARDING_STATISTICS_ID } from './onboarding'; // Add
```

```typescript
// src/modules/statistics/registry.ts — add one line

const statisticsRegistry: Record<string, StatisticsTypeDefinition> = {
  [INTERVIEW_STATISTICS_ID]: { config: interviewStatisticsConfig },
  [ONBOARDING_STATISTICS_ID]: { config: onboardingStatisticsConfig }, // Add this line
};
```

---

## That's it! StatisticsService handles the rest.

---

## How the Pipeline Works

```
1. Service receives a request to calculate statistics for an agent
2. Resolve the statistics type config from the registry by typeId
3. Fetch all summaries for this agent where summary.typeId === config.requiredSummaryTypeId
4. Build AggregatorInput: { summaries: [{ data: {...} }, ...] }
5. Call config.aggregate(input) — your pure function
6. Validate output against config.outputSchema (Zod .parse())
7. Persist the validated result to the agent-statistics collection
```

---

## Config Field Reference

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Unique statistics type identifier |
| `name` | `string` | Yes | Human-readable name |
| `description` | `string` | Yes | Description of what this type aggregates |
| `requiredSummaryTypeId` | `string` | Yes | Summary type ID whose outputs are consumed |
| `aggregate` | `StatisticsAggregator` | Yes | Pure function: `(input: AggregatorInput) => Record<string, unknown>` |
| `outputSchema` | `ZodSchema` | Yes | Zod schema to validate the aggregator's return value |

---

## AggregatorInput Shape

```typescript
interface AggregatorInput {
  /** All summaries for the agent matching requiredSummaryTypeId. */
  summaries: { data: Record<string, unknown> }[];
}
```

Each summary's `data` field contains the output produced by the summary pipeline. The structure depends on the summary type's `outputSchema`. For interview summaries, `data` includes a `sections` object keyed by step key (e.g., `data.sections.background`, `data.sections.behavioral`).

---

## Aggregator Best Practices

1. **Keep it pure** — No database calls, no API calls, no side effects. Only process the `input` argument.
2. **Handle missing data** — Not all summaries will have all sections. Always check for `undefined`/`null` before accessing nested values.
3. **Use helper functions** — Extract common patterns (average, median, frequency counts, score distributions) into reusable helpers.
4. **Normalize strings** — When counting frequencies, trim and lowercase strings to avoid duplicates.
5. **Return typed output** — Type the return value of your aggregator as your inferred schema type for compile-time safety.

---

## File Structure

```
src/modules/statistics/definitions/onboarding/
  ├── config.ts        # StatisticsTypeConfig + type ID constant
  ├── aggregator.ts    # Pure aggregation function
  ├── schema.ts        # Zod output schema + type exports
  └── index.ts         # Barrel exports
```
