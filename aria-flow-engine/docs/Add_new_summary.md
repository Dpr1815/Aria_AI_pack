# How to Add a New Summary Type

## Overview

The summary system is **config-driven**. Adding a new summary type requires zero changes to `SummaryService` — you define a config, write Zod schemas, add prompt templates, and register it.

**Pipeline:**
```
Sections (sequential) → Main Aggregation → Final Output
```

Each section maps to a conversation step, calls an LLM prompt with resolved variables, and validates the output with a Zod schema. The main prompt aggregates all section results into the final summary.

---

## Quick Start (4 Steps)

### 1. Create Output Schemas

Create Zod schemas for each section output and the final output:

```typescript
// src/modules/summaries/templates/onboarding/schema.ts

import { z } from 'zod';

// Section output schemas
export const OnboardingProgressSectionSchema = z.object({
  score: z.number().min(0).max(10),
  completedModules: z.array(z.string()),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
});

export const OnboardingFeedbackSectionSchema = z.object({
  satisfactionScore: z.number().min(0).max(10),
  highlights: z.array(z.string()),
  suggestions: z.array(z.string()),
});

// Final summary output schema
export const OnboardingSummaryDataSchema = z.object({
  overallScore: z.number().min(0).max(10),
  readinessLevel: z.enum(['not_ready', 'partially_ready', 'ready']),
  recommendations: z.array(z.string()),
});
```

### 2. Create Summary Config

Define sections and the main aggregation prompt:

```typescript
// src/modules/summaries/templates/onboarding/config.ts

import { SummaryTypeConfig } from '../../types';
import {
  OnboardingProgressSectionSchema,
  OnboardingFeedbackSectionSchema,
  OnboardingSummaryDataSchema,
} from './schema';

export const onboardingSummaryConfig: SummaryTypeConfig = {
  id: 'onboarding',
  name: 'Onboarding Summary',
  description: 'Summary of an onboarding session including progress and feedback',

  // Sections execute sequentially — later sections can reference earlier results
  sections: [
    {
      key: 'progress',                              // Must match a step ID in the step registry
      promptId: 'onboarding_summary_progress',      // Base template ID (_en/_it appended at runtime)
      required: false,                               // Skipped if step not in agent's stepOrder
      variables: {
        fromStepCard: ['module_list', 'expected_outcomes'], // Pulled from AgentStepDocument.inputs
        injectConversation: true,                           // Inject filtered conversation text
      },
      outputSchema: OnboardingProgressSectionSchema,
    },
    {
      key: 'feedback',
      promptId: 'onboarding_summary_feedback',
      required: false,
      variables: {
        fromStepCard: ['feedback_areas'],
        injectConversation: true,
        fromSections: {                              // Chain from earlier section
          progressScore: 'progress.score',           // 'sectionKey.fieldPath'
        },
      },
      outputSchema: OnboardingFeedbackSectionSchema,
    },
  ],

  main: {
    promptId: 'onboarding_summary_main',
    variables: {
      injectSectionResults: true,                    // All section outputs as JSON blob
      injectTimeAnalysis: false,
      fromContext: {                                  // From agent/session data
        agentLabel: 'agent.label',
        language: 'agent.voice.languageCode',
      },
    },
  },

  outputSchema: OnboardingSummaryDataSchema,
};
```

### 3. Create Prompt Templates

Add prompts for each section and the main aggregation:

```typescript
// src/prompts/templates/summary/onboarding-summary.prompt.ts

// One prompt per section per language:
onboarding_summary_progress_en: {
  id: 'onboarding_summary_progress_en',
  template: `Analyze the onboarding progress...
    Modules: {{module_list}}
    Expected outcomes: {{expected_outcomes}}
    Conversation: {{conversation}}
    Return JSON with: score, completedModules, strengths, areasForImprovement`,
  variables: ['module_list', 'expected_outcomes', 'conversation'],
  category: 'summary',
  responseFormat: 'json_object',
  temperature: 0,
  maxTokens: 2000,
},

onboarding_summary_main_en: {
  id: 'onboarding_summary_main_en',
  template: `Synthesize the following onboarding results...
    Section results: {{sectionResults}}
    Return JSON with: overallScore, readinessLevel, recommendations`,
  variables: ['sectionResults'],
  category: 'summary',
  responseFormat: 'json_object',
  temperature: 0,
  maxTokens: 2000,
},

// Repeat for _it (Italian) versions
```

Register these in `src/prompts/templates/summary/index.ts`.

### 4. Register in Summary Registry

```typescript
// src/modules/summaries/templates/onboarding/index.ts
export { onboardingSummaryConfig } from './config';
export * from './schema';
```

```typescript
// src/modules/summaries/registry.ts

import { onboardingSummaryConfig } from './templates/onboarding';

const summaryRegistry: Record<string, SummaryTypeDefinition> = {
  [interviewSummaryConfig.id]: { config: interviewSummaryConfig },
  [onboardingSummaryConfig.id]: { config: onboardingSummaryConfig }, // Add this line
};
```

---

## That's it! SummaryService handles the rest.

---

## How the Pipeline Works

```
1. Service resolves agent steps and conversations
2. For each section in config.sections (in order):
   a. Find the matching AgentStepDocument by section.key
   b. Resolve variables:
      - fromStepCard → pull from step's .inputs
      - fromAssessmentCard → pull from assessment document
      - fromSections → pull from previously executed section outputs
      - injectConversation → gather messages for this step (using expandsTo)
      - static → inject as-is
   c. Build prompt: `${section.promptId}_${languageSuffix}`
   d. Call LLM (JSON mode)
   e. Validate output against section.outputSchema
   f. Store result for use by later sections
3. Build main prompt with all section results as JSON blob
4. Call LLM for final aggregation
5. Validate against config.outputSchema
6. Persist to database
```

---

## Section Variable Config Reference

| Field | Type | Purpose |
| --- | --- | --- |
| `fromStepCard` | `string[]` | Keys to pull from `AgentStepDocument.inputs` |
| `fromAssessmentCard` | `string[]` | Keys to pull from assessment document |
| `injectConversation` | boolean (default: `true`) | Inject filtered conversation text for this step |
| `injectSessiondata` | boolean (default: `true`) | Inject session card data |
| `conversationVariableName` | string (default: `'conversation'`) | Variable name for conversation text |
| `static` | `Record<string, unknown>` | Fixed values injected as-is |
| `fromSections` | `Record<string, string>` | Pull from earlier section outputs (`'sectionKey.fieldPath'`) |

## Main Variable Config Reference

| Field | Type | Purpose |
| --- | --- | --- |
| `injectSectionResults` | boolean (default: `true`) | Inject all section outputs as JSON |
| `sectionResultsVariableName` | string (default: `'sectionResults'`) | Variable name for the blob |
| `injectTimeAnalysis` | boolean (default: `true`) | Inject session time analysis data |
| `fromContext` | `Record<string, string>` | Pull from agent/session context (e.g., `'agent.label'`) |
| `static` | `Record<string, unknown>` | Fixed values |

## Available Context Paths (for `fromContext`)

- `agent.label`
- `agent.voice.languageCode`
- `agent.stepOrder`
- `session.createdAt`
- `session.updatedAt`

---

## Language Support

Prompt templates are suffixed at runtime:
- `en-US` / `en-GB` → `_en`
- `it-IT` → `_it`
- `de-DE` → `_de`
- `fr-FR` → `_fr`
- `es-ES` → `_es`
- `pt-BR` / `pt-PT` → `_pt`

The language is resolved from `agent.voice.languageCode`.
