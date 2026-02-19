# How to Add a New Step

## Quick Start (3 Steps)

### 1. Create Step Definition File

Create a new file in `src/modules/steps/definitions/interview/`:

```typescript
// src/modules/steps/definitions/interview/my-new.step.ts

import { z } from 'zod';
import { StepDefinition } from '../../types';

// Zod schema validating the step card inputs (REQUIRED)
export const myNewInputSchema = z
  .object({
    job_title: z.string().min(1, 'Position being evaluated'),
    focus_area: z.string().min(1, 'Primary focus of this step'),
  })
  .strict();

export const myNewStep: StepDefinition = {
  id: 'myNew',
  labels: {
    'en-US': 'My New Step',
    'it-IT': 'Nuovo Step',
  },
  prompts: {
    conversation: 'my_new', // Becomes my_new_en / my_new_it at runtime
  },
  selectable: true,
  position: 'flexible', // 'first' | 'last' | 'flexible'
  generation: {
    template: 'generate_my_new',
  },
  inputSchema: myNewInputSchema, // REQUIRED
};
```

### 2. Register in Interview Index

```typescript
// src/modules/steps/definitions/interview/index.ts

import { myNewStep, myNewInputSchema } from './my-new.step';

export const interviewSteps: Record<string, StepDefinition> = {
  // ... existing steps
  myNew: myNewStep,
};

export const interviewStepSchemas: Record<string, ZodSchema> = {
  // ... existing schemas
  myNew: myNewInputSchema,
};
```

### 3. Create Prompt Templates

**Generation prompt** (`prompts/templates/generation/recruiting.prompts.ts`):

```typescript
generate_my_new: {
  id: 'generate_my_new',
  template: `Generate content for {{summary}} in {{language}}...`,
  variables: ['summary', 'language'],
  category: 'generation',
  responseFormat: 'json_object',
},
```

**Conversation prompts** (`prompts/templates/conversation/recruiting.prompts.ts`):

```typescript
my_new_en: { /* English version */ },
my_new_it: { /* Italian version */ },
```

---

## That's it! No other files need changes.

The registry (`definitions/index.ts`) derives the flat `STEP_REGISTRY` and `STEP_INPUT_SCHEMAS` automatically from the interview index.

---

## Field Reference

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `id` | string | Yes | Unique step identifier |
| `labels` | `Record<string, string>` | Yes | Display labels per language (`en-US`, `it-IT`, etc.) |
| `prompts.conversation` | string | Yes | Template ID prefix (appends `_en`/`_it` at runtime) |
| `selectable` | boolean | Yes | Show in UI for user selection |
| `position` | `'first'` \| `'last'` \| `'flexible'` | Yes | Ordering constraint |
| `inputSchema` | `ZodSchema` | Yes | Zod schema validating step card inputs (use `.strict()`) |
| `expandsTo` | `string[]` | No | Sub-step IDs created when this step is selected |
| `parentStep` | string | No | Links a sub-step back to its parent |
| `isReport` | boolean | No | Marks as report step (excluded from conversation) |
| `generation` | `GenerationConfig` | No | Content generation configuration |
| `additionalData` | `{ required: string[], optional?: string[] }` | No | Extra data requirements from the API request |
| `artifacts` | object | No | Artifact creation config (e.g., assessment test content) |

---

## Step with Sub-Steps (Expandable)

Some steps expand into multiple sub-steps at runtime. Example from `work.step.ts`:

```typescript
export const workStep: StepDefinition = {
  id: 'work',
  labels: { 'en-US': 'Scenario Simulation', 'it-IT': 'Simulazione Scenario' },
  prompts: { conversation: 'work' },
  selectable: true,
  position: 'flexible',
  expandsTo: ['introWork', 'work', 'conclusionWork'], // Creates 3 sub-steps
  generation: { template: 'generate_work' },
  inputSchema: workInputSchema,
};

// Sub-step (not selectable, linked to parent)
export const introWorkStep: StepDefinition = {
  id: 'introWork',
  labels: { 'en-US': 'Scenario Introduction', 'it-IT': 'Introduzione Scenario' },
  prompts: { conversation: 'intro_work' },
  selectable: false,
  position: 'flexible',
  parentStep: 'work',
  inputSchema: workInputSchema, // Shares parent's schema
};
```

---

## Advanced: Multi-Stage Generation (Pipeline)

For complex steps that need multiple LLM calls (e.g., assessment):

```typescript
generation: {
  stages: [
    {
      id: 'test',
      template: {
        default: 'generate_hard_skill_test',
        coding: 'generate_coding_challenge',
      },
      templateSelector: 'assessment_type', // Picks template based on this input field
      requiredVariables: ['time_minutes'],
      conditionalVariables: {
        coding: ['language_coding'], // Only required when template = 'coding'
      },
    },
    {
      id: 'metadata',
      template: 'generate_assessment_section',
      variableMapping: {
        test_text: { from: 'stage:test', path: 'test' }, // Output of previous stage
        language: { from: 'input', path: 'language' },
      },
    },
  ],
},
```

---

## Advanced: Assessment Artifacts

Steps can declare artifacts that are automatically created after generation:

```typescript
artifacts: {
  assessment: {
    testContentField: 'test_content', // Field in generated output
    durationField: 'time_minutes',
    languageField: 'language_coding',
    languageFallback: 'en',
  },
},
```

---

## Adding a New Step Category (e.g., onboarding)

1. Create folder: `src/modules/steps/definitions/onboarding/`
2. Add step definition files with their Zod schemas
3. Create `index.ts` exporting `onboardingSteps` and `onboardingStepSchemas`
4. Update `src/modules/steps/definitions/index.ts`:

```typescript
import { interviewSteps, interviewStepSchemas } from './interview';
import { onboardingSteps, onboardingStepSchemas } from './onboarding';

export const STEP_REGISTRY_BY_CATEGORY: Record<string, Record<string, StepDefinition>> = {
  interview: interviewSteps,
  onboarding: onboardingSteps,
};

export const STEP_REGISTRY: StepRegistry = Object.values(STEP_REGISTRY_BY_CATEGORY).reduce(
  (acc, categorySteps) => ({ ...acc, ...categorySteps }),
  {} as StepRegistry
);

export const STEP_INPUT_SCHEMAS: Record<string, ZodSchema> = {
  ...interviewStepSchemas,
  ...onboardingStepSchemas,
};
```
