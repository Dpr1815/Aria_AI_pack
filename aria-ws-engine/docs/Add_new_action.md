# Adding a New Action

Actions are behaviors triggered by the LLM (returned as a string key in its JSON response) or by the client via the `submitData` / custom handler flow. All actions go through the same registry.

This guide covers the 3 files you need to touch. No changes are needed to `ConversationService`, `ActionHandler`, or WebSocket handlers.

---

## 1. Create the Action Executor

Create `src/services/conversation/actions/myAction.action.ts`:

```typescript
import type { ActionResult, ActionContext } from '@types';
import { createLogger } from '@utils';

const logger = createLogger('MyAction');

export async function execute(
  payload: Record<string, unknown> | undefined,
  context: ActionContext
): Promise<ActionResult> {
  const { session, agent, services } = context;

  // Your logic here...

  return {
    // All fields are optional — include only what you need:
    nextStep: 'someStep',
    isComplete: false,
    triggerAIResponse: true,
    clientPayload: { action: { type: 'openSomething', payload: { ... } } },
    voiceOverride: { languageCode: 'it-IT', name: 'it-IT-Chirp-HD-F', gender: 'FEMALE' },
  };
}
```

### ActionContext

```typescript
interface ActionContext {
  session: SessionDocument;
  agent: AgentDocument;
  services: {
    sessionRepo: ActionSessionRepo;       // updateStatus(), updateCurrentStep(), updateById()
    conversationRepo: ActionConversationRepo; // getMessagesForStep(), addMessage()
    promptRepo: ActionPromptRepo;         // findByAgentAndKey()
    conversationService: ActionConversationService; // injectStepContext()
    assessmentRepo?: ActionAssessmentRepo; // findByAgentId()
    stepRepo?: ActionStepRepo;            // findByAgentAndKey()
  };
}
```

### ActionResult

```typescript
interface ActionResult {
  nextStep?: string;                      // Advance to this step
  isComplete?: boolean;                   // End the conversation
  responseText?: string;                  // Override the AI response text
  triggerAIResponse?: boolean;            // Generate AI opening for the new step
  contextMessage?: string;               // Inject context message for the new step
  clientPayload?: Record<string, unknown>; // Structured data sent to client
  voiceOverride?: VoiceConfig;           // Change TTS/STT voice
  error?: string;                        // Error message (action failed gracefully)
}
```

**How each field flows to the client:**

| Field | Effect |
| --- | --- |
| `nextStep` | Sets `ProcessResult.stepAdvanced = true`, sends `stepChanged` message |
| `isComplete` | Sends `conversationComplete` message |
| `triggerAIResponse` | Server calls LLM again with new step context, result becomes `ProcessResult.followUpText` |
| `clientPayload` | Spread into a `response` message as extra fields |
| `voiceOverride` | Used for `followUpText` TTS and stored for subsequent responses |

---

## 2. Add the Type Constant

In `src/types/conversation.types.ts`:

```typescript
export const ActionType = {
  STEP_COMPLETED: 'STEP_COMPLETED',
  CONVERSATION_COMPLETE: 'CONVERSATION_COMPLETE',
  START_TEST: 'START_TEST',
  START_LINGUISTIC: 'START_LINGUISTIC',
  STOP_LINGUISTIC: 'STOP_LINGUISTIC',
  MY_ACTION: 'MY_ACTION',              // <-- add here
} as const;
```

This constant is what the LLM returns in its `action` field and what the registry uses as the key.

---

## 3. Register in the Action Registry

In `src/services/conversation/actions/registry.ts`:

```typescript
import { execute as myAction } from './myAction.action';

const actions: Record<string, ActionConfig> = {
  [ActionType.STEP_COMPLETED]:       { execute: stepCompleted,       timing: 'after_response' },
  [ActionType.CONVERSATION_COMPLETE]: { execute: conversationComplete, timing: 'after_response' },
  [ActionType.START_TEST]:           { execute: startTest,           timing: 'after_response' },
  [ActionType.START_LINGUISTIC]:     { execute: startLinguistic,     timing: 'after_response' },
  [ActionType.STOP_LINGUISTIC]:      { execute: stopLinguistic,      timing: 'after_response' },
  [ActionType.MY_ACTION]:            { execute: myAction,            timing: 'after_response' },  // <-- add here
};
```

### Action Timing

| Timing | When Effects Are Delivered | Use When |
| --- | --- | --- |
| `after_response` | After audio finishes playing | Client hears the AI response, then UI updates (default) |
| `before_response` | Before audio starts | UI needs to update before audio plays |

---

## How Actions Flow Through the System

```
LLM returns { "text": "...", "action": "MY_ACTION" }
  │
  ├─► ai.validation.ts normalizes empty action → undefined
  │
  ├─► ConversationService.processUserInput()
  │     ├─► Saves assistant message
  │     └─► ActionHandler.execute("MY_ACTION", payload, context)
  │           └─► Action registry → myAction.action.ts → ActionResult
  │
  ├─► ConversationService builds ProcessResult:
  │     ├─► text, currentStep, isComplete from AI + ActionResult
  │     ├─► actionTiming from registry.getActionTiming("MY_ACTION")
  │     ├─► stepAdvanced = true if nextStep changed
  │     ├─► clientPayload from ActionResult
  │     ├─► followUpText from triggered AI response (if triggerAIResponse)
  │     └─► voiceOverride from ActionResult
  │
  └─► ws.utils.deliverResponse(ProcessResult)
        ├─► Sends response + audio (timing-aware)
        ├─► Sends action effects (stepChanged, conversationComplete, clientPayload)
        └─► Sends followUpText + audio (if present)
```

---

## Common Patterns

### Step advancement action (like `STEP_COMPLETED`)

```typescript
export async function execute(payload, context): Promise<ActionResult> {
  const { session, agent, services } = context;
  const transition = StateMachine.calculateTransition(agent, session.currentStep);

  if (transition.isLast) {
    await services.sessionRepo.updateStatus(session._id, 'completed');
    return { isComplete: true };
  }

  await services.sessionRepo.updateCurrentStep(session._id, transition.to!);
  await services.conversationService.injectStepContext(session._id, transition.to!, agent);

  return { nextStep: transition.to!, isComplete: false, triggerAIResponse: true };
}
```

### Client payload action (like `START_TEST`)

```typescript
export async function execute(payload, context): Promise<ActionResult> {
  const assessment = await context.services.assessmentRepo?.findByAgentId(context.agent._id);

  return {
    isComplete: false,
    clientPayload: {
      action: {
        type: 'openAssessment',
        payload: { assessment, ...payload },
      },
    },
  };
}
```

### Voice override action (like `START_LINGUISTIC`)

```typescript
export async function execute(payload, context): Promise<ActionResult> {
  // ... step transition logic ...

  return {
    nextStep: transition.to!,
    isComplete: false,
    triggerAIResponse: true,
    voiceOverride: { languageCode: 'it-IT', name: 'it-IT-Chirp-HD-F', gender: 'FEMALE' },
  };
}
```

---

## Updating the LLM System Prompt

For the LLM to actually trigger your action, you need to include it in the agent's system prompt. The prompt should instruct the LLM when to return `"action": "MY_ACTION"` in its JSON response.

Example system prompt snippet:
```
Available actions:
- "STEP_COMPLETED": Use when the current step goals are met.
- "MY_ACTION": Use when [describe the trigger condition].

Always respond with JSON: { "text": "your response", "action": "" }
Set action to the appropriate key when needed, or leave it empty.
```

---

## Checklist

- [ ] Action executor in `src/services/conversation/actions/myAction.action.ts`
- [ ] `ActionType` constant added in `src/types/conversation.types.ts`
- [ ] Action registered in `src/services/conversation/actions/registry.ts` with timing
- [ ] LLM system prompt updated to include the new action
