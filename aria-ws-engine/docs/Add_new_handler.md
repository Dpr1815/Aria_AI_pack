# Adding a New WebSocket Message Handler

This guide walks through the 3 files you need to touch to add a new client -> server message type. No changes are needed to `WebSocketController` — it routes automatically via the handler registry.

---

## 1. Define the Zod Schema

In `src/validations/websocket.validation.ts`:

```typescript
/**
 * My Message
 * Describe what this message does.
 */
export const MyMessageSchema = z.object({
  type: z.literal('myMessage'),
  someField: z.string().min(1, 'someField is required'),
  optionalField: z.number().nonnegative().optional(),
  payload: z.unknown(),
});

export type MyMessage = z.infer<typeof MyMessageSchema>;
```

Add it to the discriminated union:

```typescript
export const ClientMessageSchema = z.discriminatedUnion('type', [
  InitMessageSchema,
  StartRecordingMessageSchema,
  AudioMessageSchema,
  StopRecordingMessageSchema,
  SubmitDataMessageSchema,
  MyMessageSchema,              // <-- add here
]);
```

The `type` must be a `z.literal` — this is used for both validation and routing.

---

## 2. Create the Handler

Create `src/controllers/handlers/myMessage.handler.ts`:

```typescript
import type { WebSocket } from 'ws';
import type { ClientMessage, HandlerContext } from '@types';
import { send, sendError, sendProcessingStart, sendProcessingEnd, deliverResponse } from './ws.utils';
import { ErrorCode } from '@types';
import { createLogger } from '@utils';

const logger = createLogger('MyMessageHandler');

export async function execute(
  ws: WebSocket,
  message: ClientMessage,
  context: HandlerContext
): Promise<void> {
  const { services, connectionState } = context;

  try {
    // Guard: session must be initialized
    if (!connectionState.sessionId || !connectionState.agent) {
      sendError(ws, 'Session not initialized', ErrorCode.NO_SESSION);
      return;
    }

    connectionState.lastActivityAt = new Date();

    // Cast to specific message type
    const msg = message as MyMessage;

    // Your logic here...
    const result = await services.conversation.processUserInput(
      connectionState.sessionId,
      msg.someField
    );

    // Option A: Simple response
    send(ws, {
      type: 'response',
      content: result.text,
      currentStep: result.currentStep,
      isComplete: result.isComplete,
    });

    // Option B: Full response with TTS audio + action effects
    await deliverResponse(
      ws,
      result,
      connectionState.agent.voice,
      services.synthesis,
      connectionState.agent.features.lipSync
    );
  } catch (error) {
    logger.error('Handler failed', error instanceof Error ? error : undefined);
    sendError(ws, (error as Error).message, ErrorCode.MESSAGE_ERROR);
  }
}
```

### Handler Function Signature

Every handler must match this exact signature:

```typescript
(ws: WebSocket, message: ClientMessage, context: HandlerContext) => Promise<void>
```

### HandlerContext

```typescript
interface HandlerContext {
  services: {
    auth: IAuthService;
    conversation: IConversationService;
    transcription: ITranscriptionService;
    synthesis: ISynthesisService;
  };
  repositories: {
    session: ISessionRepository;
    agent: IAgentRepository;
    participant: IParticipantRepository;
    conversation: IConversationRepository;
    prompt: IAgentPromptRepository;
    assessment: IAgentAssessmentRepository;
  };
  connectionState: ConnectionState;
}
```

### Available Utilities (`ws.utils.ts`)

| Function | Purpose |
| --- | --- |
| `send(ws, message)` | Send any `ServerMessage` |
| `sendError(ws, error, code?, recoverable?)` | Send error message |
| `sendProcessingStart(ws, stage)` | Send processing indicator (`stt` / `llm` / `tts` / `lipsync`) |
| `sendProcessingEnd(ws, stage)` | End processing indicator |
| `streamSynthesis(ws, text, voice, service, lipSync)` | Stream TTS audio + lip sync chunks |
| `deliverResponse(ws, result, voice, service, lipSync)` | Full response delivery with action timing |

---

## 3. Register in the Handler Registry

In `src/controllers/handlers/registry.ts`:

```typescript
import { execute as myMessage } from './myMessage.handler';

export const handlerRegistry: HandlerRegistry = {
  init:           { execute: init,           requiresAuth: false },
  startRecording: { execute: startRecording, requiresAuth: true },
  audio:          { execute: audio,          requiresAuth: true },
  stopRecording:  { execute: stopRecording,  requiresAuth: true },
  submitData:     { execute: submitData,     requiresAuth: true },
  myMessage:      { execute: myMessage,      requiresAuth: true },  // <-- add here
};
```

- `requiresAuth: true` — Client must have sent `init` first (most handlers)
- `requiresAuth: false` — Handler can be called before auth (only `init` does this)

---

## How Routing Works

`WebSocketController.routeMessage()` does the following for every incoming message:

1. Looks up `handlerRegistry[message.type]`
2. If not found -> sends `UNKNOWN_TYPE` error
3. If `requiresAuth` and client isn't authenticated -> sends `AUTH_REQUIRED` error
4. Otherwise -> calls `handler.execute(ws, message, context)`

---

## Error Codes

Available error codes in `ErrorCode` enum (`src/types/websocket.types.ts`):

| Code | Recoverable | Use For |
| --- | --- | --- |
| `AUTH_REQUIRED` | no | Message before `init` |
| `AUTH_FAILED` | no | Bad access token |
| `NO_SESSION` | yes | Session not initialized |
| `MESSAGE_ERROR` | yes | Generic handler error |
| `UNKNOWN_TYPE` | yes | Unregistered message type |
| `INVALID_AUDIO` | yes | Bad audio data |
| `START_RECORDING_ERROR` | yes | STT open failed |
| `STOP_RECORDING_ERROR` | yes | STT close failed |
| `EMPTY_TRANSCRIPT` | yes | No speech detected |
| `INIT_ERROR` | no | Init failed |
| `SUBMIT_DATA_ERROR` | yes | Data submission failed |

Add custom codes to the enum as needed.

---

## Checklist

- [ ] Zod schema in `src/validations/websocket.validation.ts` with `type: z.literal('...')`
- [ ] Schema added to `ClientMessageSchema` discriminated union
- [ ] Handler file in `src/controllers/handlers/` with `execute` function
- [ ] Handler registered in `src/controllers/handlers/registry.ts`
