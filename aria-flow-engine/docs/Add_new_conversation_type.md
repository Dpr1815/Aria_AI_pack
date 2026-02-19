# How to Add a New Conversation Type

## What Is a Conversation Type?

A conversation type is the top-level organizational axis of the system. It defines a complete conversational experience — the steps an agent follows, how conversations are summarized, and how aggregate statistics are computed.

The existing conversation type is `interview`. Adding a new one (e.g., `onboarding`) means creating a new set of steps, a compatible summary definition, a statistics aggregator, and the prompt templates that power them all.

**Type chain:**
```
conversationTypeId → summaryTypeId → statisticsTypeId
```

These three IDs are stored on the agent and validated for compatibility at creation/update time.

---

## Checklist

| # | What | Where | Details |
|---|------|-------|---------|
| 1 | Step definitions | `src/modules/steps/definitions/<type>/` | See [Add_new_step.md](Add_new_step.md) §"Adding a New Step Category" |
| 2 | Register steps | `src/modules/steps/definitions/index.ts` | Add to `STEP_REGISTRY_BY_CATEGORY` + `STEP_INPUT_SCHEMAS` |
| 3 | Summary definition | `src/modules/summaries/definitions/<type>/` | See [Add_new_summary.md](Add_new_summary.md) |
| 4 | Register summary | `src/modules/summaries/registry.ts` | Add to `summaryRegistry` |
| 5 | Statistics definition | `src/modules/statistics/definitions/<type>/` | See [Add_new_statistic.md](Add_new_statistic.md) |
| 6 | Register statistics | `src/modules/statistics/registry.ts` | Add to `statisticsRegistry` |
| 7 | Conversation prompts | `src/prompts/templates/conversation/` | One file per conversation type |
| 8 | Generation prompts | `src/prompts/templates/generation/` | One file per conversation type |
| 9 | Summary prompts | `src/prompts/templates/summary/` | One file per conversation type |
| 10 | Wire prompts | `src/prompts/templates/index.ts` | Spread into `allPromptTemplates` |

No changes are needed to services, controllers, validations, or models — everything is registry-driven.

---

## Step-by-Step Walkthrough

Below is the **glue** between the individual modules. For the specifics of writing step definitions, summary configs, and aggregators, follow the linked docs.

### 1. Create Step Definitions

Create a folder and define your steps following the patterns in [Add_new_step.md](Add_new_step.md):

```
src/modules/steps/definitions/onboarding/
  ├── index.ts               # Exports onboardingSteps + onboardingStepSchemas
  ├── welcome.step.ts
  ├── training.step.ts
  └── feedback.step.ts
```

The barrel export must match this shape:

```typescript
// src/modules/steps/definitions/onboarding/index.ts

import { StepDefinition } from '../../types';
import { ZodSchema } from 'zod';
import { welcomeStep, welcomeInputSchema } from './welcome.step';
import { trainingStep, trainingInputSchema } from './training.step';
import { feedbackStep, feedbackInputSchema } from './feedback.step';

export const onboardingSteps: Record<string, StepDefinition> = {
  welcome: welcomeStep,
  training: trainingStep,
  feedback: feedbackStep,
};

export const onboardingStepSchemas: Record<string, ZodSchema> = {
  welcome: welcomeInputSchema,
  training: trainingInputSchema,
  feedback: feedbackInputSchema,
};
```

### 2. Register Steps

This is where the conversation type ID is born — it's the key in `STEP_REGISTRY_BY_CATEGORY`:

```typescript
// src/modules/steps/definitions/index.ts

import { interviewSteps, interviewStepSchemas } from './interview';
import { onboardingSteps, onboardingStepSchemas } from './onboarding';

export const STEP_REGISTRY_BY_CATEGORY: Record<string, Record<string, StepDefinition>> = {
  interview: interviewSteps,
  onboarding: onboardingSteps,   // <-- This key IS the conversationTypeId
};

export const STEP_INPUT_SCHEMAS: Record<string, ZodSchema> = {
  ...interviewStepSchemas,
  ...onboardingStepSchemas,
};
```

After this step the new conversation type already appears in `GET /categories` and agents can be created with `conversationTypeId: 'onboarding'`.

### 3. Create Summary Definition

Follow [Add_new_summary.md](Add_new_summary.md) to build schemas, sections, and config. The critical field that links a summary to your conversation type is `compatibleConversationTypes`:

```typescript
// src/modules/summaries/definitions/onboarding/config.ts

export const ONBOARDING_SUMMARY_ID = 'onboarding';

export const onboardingSummaryConfig: SummaryDefinition = {
  id: ONBOARDING_SUMMARY_ID,
  name: 'Onboarding Summary',
  description: '...',

  compatibleConversationTypes: ['onboarding'],  // <-- Links to the conversationTypeId

  sections: [
    {
      key: 'training',        // Must match a step ID from your step definitions
      promptId: 'onboarding_summary_training',
      required: false,
      variables: { fromStepCard: ['module_list'], injectConversation: true },
      outputSchema: TrainingSectionSchema,
    },
    // ... more sections mapping to your steps
  ],

  main: {
    promptId: 'onboarding_summary_main',
    variables: {
      injectSectionResults: true,
      fromContext: { agentLabel: 'agent.label', language: 'agent.voice.languageCode' },
    },
  },

  outputSchema: OnboardingSummaryDataSchema,
};
```

Register in the summary registry and definitions barrel — see [Add_new_summary.md](Add_new_summary.md) §"Register in Summary Registry".

### 4. Create Statistics Definition

Follow [Add_new_statistic.md](Add_new_statistic.md). The critical field linking statistics to your summary is `requiredSummaryTypeId`:

```typescript
// src/modules/statistics/definitions/onboarding/config.ts

export const ONBOARDING_STATISTICS_ID = 'onboarding';

export const onboardingStatisticsConfig: StatisticsDefinition = {
  id: ONBOARDING_STATISTICS_ID,
  name: 'Onboarding Statistics',
  description: '...',
  requiredSummaryTypeId: 'onboarding',  // <-- Must match the summary ID above
  aggregate: onboardingAggregator,
  outputSchema: OnboardingStatisticsDataSchema,
};
```

Register in the statistics registry and definitions barrel — see [Add_new_statistic.md](Add_new_statistic.md) §"Register in Statistics Registry".

### 5. Create Prompt Templates

Each conversation type needs three sets of prompts. Create one file per set:

**Conversation prompts** — drive the live agent-participant dialogue:

```typescript
// src/prompts/templates/conversation/onboarding.prompts.ts

import { PromptTemplate } from '@utils';

export const ONBOARDING_PROMPTS: Record<string, PromptTemplate> = {
  welcome_en: { id: 'welcome_en', category: 'conversation', template: '...', variables: [...] },
  welcome_it: { id: 'welcome_it', category: 'conversation', template: '...', variables: [...] },
  training_en: { /* ... */ },
  training_it: { /* ... */ },
  // One pair per step per supported language
};
```

Register in the conversation index:

```typescript
// src/prompts/templates/conversation/index.ts

import { INTERVIEW_PROMPTS } from './recruiting.prompts';
import { ONBOARDING_PROMPTS } from './onboarding.prompts';

export const recruitingPrompts: Record<string, PromptTemplate> = {
  ...INTERVIEW_PROMPTS,
  ...ONBOARDING_PROMPTS,
};
```

**Generation prompts** — used when auto-generating step card inputs from a job summary:

```typescript
// src/prompts/templates/generation/onboarding.prompts.ts

export const ONBOARDING_GENERATION_PROMPTS: Record<string, PromptTemplate> = {
  generate_welcome: { id: 'generate_welcome', category: 'generation', template: '...', responseFormat: 'json_object', variables: [...] },
  generate_training: { /* ... */ },
  // One per step that has generation config
};
```

Register in the generation index:

```typescript
// src/prompts/templates/generation/index.ts

import { RECRUITING_PROMPTS } from './recruiting.prompts';
import { ONBOARDING_GENERATION_PROMPTS } from './onboarding.prompts';

export const generationPrompts: Record<string, PromptTemplate> = {
  ...RECRUITING_PROMPTS,
  ...ONBOARDING_GENERATION_PROMPTS,
};
```

**Summary prompts** — used by the summary pipeline to analyze each section:

```typescript
// src/prompts/templates/summary/onboarding-summary.prompt.ts

export const ONBOARDING_REPORT_PROMPTS: Record<string, PromptTemplate> = {
  onboarding_summary_training_en: { id: 'onboarding_summary_training_en', category: 'summary', template: '...', responseFormat: 'json_object', variables: [...] },
  onboarding_summary_training_it: { /* ... */ },
  onboarding_summary_main_en: { /* ... */ },
  onboarding_summary_main_it: { /* ... */ },
  // One per section per language + main per language
};
```

Register in the summary prompt index:

```typescript
// src/prompts/templates/summary/index.ts

import { REPORT_PROMPTS } from './recruiting-summary.prompt';
import { ONBOARDING_REPORT_PROMPTS } from './onboarding-summary.prompt';

export const summaryRecruitingPrompts: Record<string, PromptTemplate> = {
  ...REPORT_PROMPTS,
  ...ONBOARDING_REPORT_PROMPTS,
};
```

### 6. Wire All Prompts into the Master Index

If you added new exports from the sub-indexes above, make sure they're all spread into the top-level:

```typescript
// src/prompts/templates/index.ts

export const allPromptTemplates: Record<string, PromptTemplate> = {
  ...generationPrompts,
  ...recruitingPrompts,       // Already includes ONBOARDING_PROMPTS if wired in step 5
  ...summaryRecruitingPrompts, // Already includes ONBOARDING_REPORT_PROMPTS if wired in step 5
};
```

No changes needed here if the sub-indexes already spread your new prompts.

---

## How Validation Works (No Changes Needed)

The agent validation layer enforces the type chain automatically:

1. **`conversationTypeId`** is validated against `getStepCategories()` — which reads the keys of `STEP_REGISTRY_BY_CATEGORY`. Once you register your steps (step 2), the new type is valid.

2. **`summaryTypeId`** is checked for existence via `isSummaryTypeRegistered()`, then cross-validated: `summaryConfig.compatibleConversationTypes` must include `conversationTypeId`.

3. **`statisticsTypeId`** is checked for existence via `isStatisticsTypeRegistered()`, then cross-validated: `statisticsConfig.requiredSummaryTypeId` must equal `summaryTypeId`.

This chain is enforced in `CreateAgentSchema`, `UpdateAgentSchema`, and `GenerateAgentSchema` via `validateTypeCompatibility`.

---

## API Surface (No Changes Needed)

Once registered, the new conversation type is automatically available through:

| Endpoint | What it returns |
|----------|----------------|
| `GET /categories` | Now includes `'onboarding'` |
| `GET /categories/onboarding/step-types` | Selectable steps for onboarding |
| `GET /summary-types/onboarding` | Compatible summary types |
| `GET /statistics-types` | Now includes the onboarding statistics type |
| `POST /agents` with `conversationTypeId: 'onboarding'` | Creates an onboarding agent |

---

## File Tree (Complete Example)

```
src/
├── modules/
│   ├── steps/definitions/onboarding/
│   │   ├── index.ts
│   │   ├── welcome.step.ts
│   │   ├── training.step.ts
│   │   └── feedback.step.ts
│   │
│   ├── summaries/definitions/onboarding/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   └── schema.ts
│   │
│   └── statistics/definitions/onboarding/
│       ├── index.ts
│       ├── config.ts
│       ├── aggregator.ts
│       └── schema.ts
│
└── prompts/templates/
    ├── conversation/onboarding.prompts.ts
    ├── generation/onboarding.prompts.ts
    └── summary/onboarding-summary.prompt.ts
```

**Registration touchpoints** (one-liners each):
- `src/modules/steps/definitions/index.ts` — add to `STEP_REGISTRY_BY_CATEGORY` + `STEP_INPUT_SCHEMAS`
- `src/modules/summaries/definitions/index.ts` — re-export
- `src/modules/summaries/registry.ts` — add to `summaryRegistry`
- `src/modules/statistics/definitions/index.ts` — re-export
- `src/modules/statistics/registry.ts` — add to `statisticsRegistry`
- `src/prompts/templates/conversation/index.ts` — spread new prompts
- `src/prompts/templates/generation/index.ts` — spread new prompts
- `src/prompts/templates/summary/index.ts` — spread new prompts

---

## Common Mistakes

| Mistake | Consequence |
|---------|------------|
| Summary section `key` doesn't match a step `id` | Section is silently skipped — no data extracted for that step |
| Forgot `compatibleConversationTypes` on summary config | Validation rejects the `summaryTypeId` when creating an agent |
| Prompt ID mismatch (e.g., `onboarding_summary_training` vs `onboarding_training`) | `NotFoundError` at summary generation time |
| Missing language suffix variant (e.g., `_it` exists but `_en` doesn't) | Runtime error when agent uses that language |
| Step IDs collide with another conversation type | Both types share the step — usually not intended. Use unique prefixes if needed |
| Forgot to spread schemas in `STEP_INPUT_SCHEMAS` | Step input validation is silently skipped |
