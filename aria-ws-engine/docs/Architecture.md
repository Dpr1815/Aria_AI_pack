# Aria Realtime Engine — Architecture Guide

## Overview

The Aria Realtime Engine is a WebSocket-based server that powers real-time conversational AI agents. It handles the full pipeline of a voice conversation: receiving audio from the client, transcribing it to text (STT), processing it through an LLM, and streaming synthesized speech back (TTS) with optional lip sync data.

Conversations follow a step-based flow defined per agent. Each step has its own system prompt, and the engine manages transitions between steps via an action system. The architecture is modular: connectors wrap external APIs, services contain business logic, and handlers manage WebSocket message routing.

---

## Project Structure

```
├── Dockerfile
├── docs
│   ├── Architecture.md
│   ├── Session_concurrency_mutex.md
│   └── Speech_pipeline_architecture.md
├── jest.config.js
├── package.json
├── package-lock.json
├── README.md
├── src
│   ├── app.ts
│   ├── bootstrap.ts
│   ├── config
│   │   ├── database.config.ts
│   │   ├── google.config.ts
│   │   ├── index.ts
│   │   ├── openai.config.ts
│   │   ├── rhubarb.config.ts
│   │   └── server.config.ts
│   ├── connectors
│   │   ├── api
│   │   │   ├── ApiConnector.ts
│   │   │   ├── IApiConnector.ts
│   │   │   └── index.ts
│   │   ├── database
│   │   │   ├── IDatabase.ts
│   │   │   ├── index.ts
│   │   │   └── MongoConnector.ts
│   │   ├── google
│   │   │   ├── GoogleTokenManager.ts
│   │   │   └── index.ts
│   │   ├── index.ts
│   │   ├── lipsync
│   │   │   ├── ILipSyncConnector.ts
│   │   │   ├── index.ts
│   │   │   ├── NullLipSyncConnector.ts
│   │   │   └── RhubarbConnector.ts
│   │   ├── llm
│   │   │   ├── ILLMConnector.ts
│   │   │   ├── index.ts
│   │   │   ├── model-capabilities.ts
│   │   │   └── OpenAIConnector.ts
│   │   ├── stt
│   │   │   ├── GoogleSTTConnector.ts
│   │   │   ├── index.ts
│   │   │   └── ISTTConnector.ts
│   │   └── tts
│   │       ├── GoogleTTSConnector.ts
│   │       ├── index.ts
│   │       └── ITTSConnector.ts
│   ├── controllers
│   │   ├── handlers
│   │   │   ├── audio.handler.ts
│   │   │   ├── index.ts
│   │   │   ├── init.handler.ts
│   │   │   ├── registry.ts
│   │   │   ├── startRecording.handler.ts
│   │   │   ├── stopRecording.handler.ts
│   │   │   ├── submitData.handler.ts
│   │   │   └── ws.utils.ts
│   │   ├── index.ts
│   │   └── WebSocketController.ts
│   ├── models
│   │   ├── documents
│   │   │   ├── agent-assessment.document.ts
│   │   │   ├── agent.document.ts
│   │   │   ├── agent-prompt.document.ts
│   │   │   ├── agent-step.document.ts
│   │   │   ├── conversation.document.ts
│   │   │   ├── index.ts
│   │   │   ├── participant.document.ts
│   │   │   └── session.document.ts
│   │   └── index.ts
│   ├── repositories
│   │   ├── agent-assessment.repository.ts
│   │   ├── agent-prompt.repository.ts
│   │   ├── agent.repository.ts
│   │   ├── agent-step.repository.ts
│   │   ├── base.repository.ts
│   │   ├── conversation.repository.ts
│   │   ├── index.ts
│   │   ├── participant.repository.ts
│   │   └── session.repository.ts
│   ├── routes
│   │   ├── health.routes.ts
│   │   ├── index.ts
│   │   └── websocket.routes.ts
│   ├── services
│   │   ├── auth
│   │   │   ├── AuthService.ts
│   │   │   └── index.ts
│   │   ├── conversation
│   │   │   ├── ActionHandler.ts
│   │   │   ├── actions
│   │   │   │   ├── conversationComplete.action.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── registry.ts
│   │   │   │   ├── startLinguistic.action.ts
│   │   │   │   ├── startTest.action.ts
│   │   │   │   ├── stepCompleted.action.ts
│   │   │   │   └── stopLinguistic.action.ts
│   │   │   ├── ConversationService.ts
│   │   │   ├── index.ts
│   │   │   ├── output-format.ts
│   │   │   └── StateMachine.ts
│   │   ├── index.ts
│   │   └── speech
│   │       ├── index.ts
│   │       ├── SynthesisService.ts
│   │       └── TranscriptionService.ts
│   ├── types
│   │   ├── api.types.ts
│   │   ├── audio.types.ts
│   │   ├── config.types.ts
│   │   ├── conversation.types.ts
│   │   ├── index.ts
│   │   ├── repository.interfaces.ts
│   │   ├── service.interfaces.ts
│   │   └── websocket.types.ts
│   ├── utils
│   │   ├── async-mutex.ts
│   │   ├── audio
│   │   │   ├── index.ts
│   │   │   ├── pcmToWav.ts
│   │   │   └── sentenceSplitter.ts
│   │   ├── errors.ts
│   │   ├── index.ts
│   │   ├── logger.ts
│   │   └── text
│   │       ├── cleanString.ts
│   │       └── index.ts
│   └── validations
│       ├── ai.validation.ts
│       ├── index.ts
│       └── websocket.validation.ts
```

---

## Startup Flow

The application starts in two files:

**`app.ts`** — Minimal entry point. Calls `bootstrap()`, sets up signal handlers (`SIGINT`, `SIGTERM`) for graceful shutdown. Does not contain any business logic.

**`bootstrap.ts`** — The composition root. This is where every dependency in the application is created and wired together. The sequence is:

1. **Validate configuration** — Checks all required environment variables.
2. **Create connectors** — Instantiates adapters for MongoDB, Google Cloud (STT, TTS, token manager), OpenAI, and Rhubarb lip sync.
3. **Connect to database** — Opens the MongoDB connection.
4. **Initialize Google auth** — Refreshes the Google Cloud access token.
5. **Create repositories** — One per MongoDB collection, all sharing the database connection.
6. **Create services** — `AuthService`, `ActionHandler`, `ConversationService` (with circular dependency wired via `setConversationService()`), `TranscriptionService`, `SynthesisService`.
7. **Create WebSocket controller** — Receives services and repositories, manages all client connections.
8. **Start HTTP server** — Mounts health check route and WebSocket upgrade route, begins listening.

---

## Connection Lifecycle

When a client connects:

```
Client                          Server
  │                               │
  │──── WS connect ──────────────►│  WebSocketController creates ConnectionState
  │                               │
  │──── { type: "init" } ────────►│  init.handler authenticates + sends greeting
  │◄─── sessionReady ────────────│
  │◄─── response (greeting) ─────│
  │◄─── audio chunks ────────────│
  │                               │
  │──── { type: "startRecording" }►│  Opens STT stream
  │──── { type: "audio" } ×N ────►│  Pipes audio to STT stream
  │──── { type: "stopRecording" }─►│  Closes STT → gets transcript → LLM → TTS
  │◄─── transcript ──────────────│
  │◄─── response (AI text) ──────│
  │◄─── audio chunks ────────────│
  │◄─── stepChanged / complete ──│  (if action triggered)
  │                               │
  │     ... repeat per turn ...    │
  │                               │
  │──── WS disconnect ──────────►│  Cleanup (destroy STT session)
```

---

## File Responsibilities

### Controllers

**`WebSocketController.ts`**
Manages all WebSocket connections. For each connection it creates a `ConnectionState` object that tracks session ID, agent, authentication status, and the active transcription session. Incoming messages are parsed from JSON and routed to the handler registry. Runs a ping/pong interval for connection health monitoring. On disconnect, it cleans up any orphaned STT streams. Exposes `closeAll()` for graceful shutdown.

**`handlers/registry.ts`**
A plain object mapping message type strings (`init`, `startRecording`, `audio`, `stopRecording`, `submitData`, `action`) to handler configurations. Each entry specifies the `execute` function and whether the handler `requiresAuth`. The controller checks this flag before routing — only `init` and `audio` bypass the auth check.

**`handlers/ws.utils.ts`**
Shared utilities used by all handlers. Contains `send()`, `sendError()`, `streamSynthesis()` (streams TTS audio chunks with lip sync data), and `deliverResponse()` (orchestrates the order of text response, audio, and action effects based on action timing configuration).

**`handlers/init.handler.ts`**
Handles the first message from the client. Receives the access token, validates it through `AuthService` (which looks up the session by token hash), then calls `ConversationService.initialize()` to load the agent, participant, and conversation. If this is a new session with no messages, the first step's system prompt is executed and the greeting is sent to the client along with a `sessionReady` message containing agent configuration (voice, features, rendering mode, step count).

**`handlers/startRecording.handler.ts`**
Creates a new STT streaming session via `TranscriptionService.createSession()`. Generates a unique session ID and stores it in the connection state. Gets the language code from the agent's voice configuration.

**`handlers/audio.handler.ts`**
Hot-path handler called many times per second during recording. Decodes the base64 audio chunk and writes it to the active STT stream via `TranscriptionService.writeAudio()`. No validation, no logging, no error responses — designed for minimal latency.

**`handlers/stopRecording.handler.ts`**
The main orchestration handler for each conversation turn. Ends the STT stream to get the final transcript, sends it to the client, then calls `ConversationService.processUserInput()` which runs the LLM and any triggered action. Finally calls `deliverResponse()` which sends the text response, streams TTS audio, and delivers action side-effects (step changes, completion notifications) in the correct order based on the action's timing configuration.

**`handlers/submitData.handler.ts`**
Handles structured data submissions from the client (e.g., form responses, test solutions). Forwards to `ConversationService.processDataSubmission()` which stores the data in the session, then calls the LLM to generate a contextual response about the submitted data.

**`handlers/action.handler.ts`**
Handles client-triggered actions (as opposed to AI-triggered actions). Forwards to `ConversationService.processClientAction()` which executes the action through the same registry used by AI-triggered actions, optionally generating an AI response if the action requests one.

---

### Services

**`services/auth/AuthService.ts`**
Validates access tokens. Takes a raw token string, hashes it with SHA-256, and looks up the corresponding session via `SessionRepository.findByAccessTokenHash()`. Rejects tokens for completed, abandoned, or expired sessions. Does not generate or refresh tokens — token creation is handled by the agent configuration project.

**`services/conversation/ConversationService.ts`**
The core orchestrator. All text-level processing flows through this service:

- `initialize(sessionId)` — Loads the session, agent, participant, and conversation from the database. For new sessions (no messages), injects a context message with the participant's name and executes the first step's system prompt to generate a greeting.
- `processUserInput(sessionId, transcript, latencyMs)` — Saves the user's transcript as a message, builds the full LLM context (system prompt + conversation history for the current step), calls the LLM, saves the assistant's response, and executes any action returned by the LLM. Returns a `ProcessResult` with the response text, current step, completion status, action details, and timing.
- `processClientAction(sessionId, action)` — Executes a client-triggered action. If the action's result includes `triggerAIResponse`, it injects optional context and calls the LLM to generate a follow-up response.
- `processDataSubmission(sessionId, dataType, payload)` — Stores the submitted data in `session.data[dataType]`, logs it as a system message, and calls the LLM with the payload for a contextual response.
- `injectStepContext(sessionId, newStepKey, agent, participantName)` — Called after step transitions. Adds a system message to the new step containing the participant's name and the last assistant message from the previous step, giving the LLM continuity across steps.

**`services/conversation/ActionHandler.ts`**
Thin wrapper that builds an `ActionContext` (containing repositories and a reference to `ConversationService`) and delegates execution to the action registry. Handles the circular dependency with `ConversationService` via a `setConversationService()` method called during bootstrap.

**`services/conversation/StateMachine.ts`**
Pure functions operating on `agent.stepOrder` (a string array). Provides: `getFirstStep()`, `getNextStep()`, `getPreviousStep()`, `calculateTransition()`, `isLastStep()`, `calculateProgress()`. Linear flow only, no branching.

**`services/conversation/actions/registry.ts`**
Maps action type strings to `{ execute, timing }` configurations. The `timing` field (`before_response` or `after_response`) controls when the action's side-effects are delivered to the client relative to the audio playback. Exports `executeAction()`, `getActionTiming()`, and `isActionRegistered()`.

**`services/conversation/actions/stepCompleted.action.ts`**
Triggered when the LLM determines a step is complete. Uses `StateMachine.calculateTransition()` to find the next step. If it's the last step, marks the session as completed. Otherwise, updates the session's current step and calls `ConversationService.injectStepContext()` to provide the LLM with continuity for the new step.

**`services/conversation/actions/conversationComplete.action.ts`**
Marks the session status as `completed` and fires a webhook notification (fire-and-forget, does not block the response).

**`services/conversation/actions/startTest.action.ts`**
Fetches the `AgentAssessmentDocument` for the agent (if one exists) and returns it as a `clientPayload`. The WebSocket handler forwards this payload to the client, which uses it to render a test or assessment interface.

**`services/speech/TranscriptionService.ts`**
Manages multiple concurrent STT streaming sessions. Each session has a unique ID and wraps a Google STT stream. Provides `createSession()`, `writeAudio()`, `endSession()` (returns the final transcript), and `destroySession()` (cleanup without waiting for results). Emits events for interim results, final results, and errors.

**`services/speech/SynthesisService.ts`**
Converts text to audio with optional lip sync. Splits text into sentences using a sentence splitter utility (for chunked streaming — the client hears the first sentence while the rest is still being synthesized). For each sentence chunk, it calls `GoogleTTSConnector` to generate audio, then optionally calls `RhubarbConnector` to generate viseme cues. Yields `SynthesisChunk` objects via an async generator, each containing the audio buffer, viseme data, timing metadata, and chunk position info.

---

### Connectors

Each connector wraps an external API behind an interface, making it swappable for testing.

| Connector              | Wraps                       | Purpose                                    |
| ---------------------- | --------------------------- | ------------------------------------------ |
| `MongoConnector`       | MongoDB driver              | Database connection and collection access  |
| `GoogleTokenManager`   | Google Cloud auth           | Manages OAuth2 tokens for STT/TTS          |
| `OpenAIConnector`      | OpenAI API                  | Chat completions with JSON response format |
| `GoogleSTTConnector`   | Google Cloud Speech-to-Text | Creates streaming recognition sessions     |
| `GoogleTTSConnector`   | Google Cloud Text-to-Speech | Synthesizes audio from text                |
| `RhubarbConnector`     | Rhubarb Lip Sync            | Generates viseme cues from audio           |
| `NullLipSyncConnector` | (none)                      | No-op fallback when lip sync is disabled   |

---

### Repositories

Each repository extends `BaseRepository<T>` with standard CRUD operations plus collection-specific methods.

| Repository                  | Collection        | Key Methods                                                                                             |
| --------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `SessionRepository`         | sessions          | `findByAccessTokenHash()`, `updateStatus()`, `markComplete()`, `touchActivity()`, `updateCurrentStep()` |
| `ConversationRepository`    | conversations     | `findBySessionId()`, `addMessage()` (atomic `$push` + `$inc`), `getMessagesForStep()`                   |
| `ParticipantRepository`     | participants      | `findByEmail()`, `findOrCreateByEmail()` (atomic upsert)                                                |
| `AgentRepository`           | agents            | `findById()`, `updateStatus()`                                                                          |
| `AgentPromptRepository`     | agent_prompts     | `findByAgentAndKey()` (loads prompt for a specific step)                                                |
| `AgentAssessmentRepository` | agent_assessments | `findByAgentId()` (loads test content)                                                                  |

---

### Data Models

**AgentDocument** — Defines an AI agent: label, voice configuration, features (lip sync, session persistence, video recording), rendering mode, and `stepOrder` (the ordered list of step keys that define the conversation flow).

**AgentPromptDocument** — One per step per agent. Contains the system prompt template, LLM model, temperature, and max tokens for that step.

**AgentAssessmentDocument** — Optional. Contains test/assessment content, language, and duration for agents that include a testing step.

**SessionDocument** — A single conversation session between a participant and an agent. Tracks: access token hash (for auth), status (`active`/`completed`/`abandoned`), current step, arbitrary data storage (`data: Record<string, unknown>`), and timestamps.

**ConversationDocument** — One per session. Stores the message history as an embedded array of `MessageEntry` objects. Each entry includes: sequence number, step key, role (`user`/`assistant`/`system`), content, optional action type, token count, latency, and timestamp. Maintains `messageCount` and `stepMessageCounts` for efficient queries.

**ParticipantDocument** — Identity record: email (unique), name, and metadata.

---

## Key Data Flows

### Conversation Turn (stopRecording)

This is the most common flow, triggered every time the user finishes speaking:

```
stopRecording handler
  │
  ├─► TranscriptionService.endSession()
  │     └─► GoogleSTTConnector closes stream → returns transcript
  │
  ├─► ConversationService.processUserInput(transcript)
  │     ├─► Save user message to ConversationDocument
  │     ├─► Load system prompt from AgentPromptDocument
  │     ├─► Build messages array (system prompt + step history)
  │     ├─► OpenAIConnector.complete(messages) → { text, action? }
  │     ├─► Save assistant message to ConversationDocument
  │     └─► ActionHandler.execute(action) (if action present)
  │           └─► Action registry → specific action executor
  │
  └─► deliverResponse(result)
        ├─► Send text response to client
        ├─► SynthesisService.synthesize(text)
        │     ├─► Split text into sentences
        │     └─► For each sentence:
        │           ├─► GoogleTTSConnector → audio buffer
        │           ├─► RhubarbConnector → viseme cues (if enabled)
        │           └─► Yield SynthesisChunk
        ├─► Stream audio + lipSync chunks to client
        └─► Send action effects (stepChanged, conversationComplete)
```

### Step Transition

When the LLM includes a `STEP_COMPLETED` action in its response:

```
ConversationService.processUserInput()
  └─► ActionHandler.execute(STEP_COMPLETED)
        └─► stepCompleted.action.ts
              ├─► StateMachine.calculateTransition(agent, currentStep)
              ├─► SessionRepository.updateCurrentStep(nextStep)
              └─► ConversationService.injectStepContext(nextStep)
                    ├─► Get last assistant message from previous step
                    └─► Add system message to new step:
                        "The participant's name is X.
                         The last thing discussed was: '...'.
                         Begin the conversation for this step."
```

The next time the user speaks, `processUserInput` loads the new step's system prompt and conversation history (which starts with the injected context message), giving the LLM full continuity.

---

## Action System

Actions are behaviors triggered either by the LLM (included in its JSON response) or by the client (via the `action` message type). All actions flow through the same registry.

### Adding a New Action

1. Create `myAction.action.ts` in `services/conversation/actions/`:
   ```typescript
   export async function execute(payload, context): Promise<ActionResult> {
     // your logic
     return { nextStep: '...', isComplete: false };
   }
   ```
2. Import and register in `registry.ts`:
   ```typescript
   MY_ACTION: { execute: myAction, timing: 'after_response' }
   ```

No changes needed to `ConversationService`, `ActionHandler`, type definitions, or WebSocket handlers.

### Action Timing

Each action has a `timing` configuration:

- **`after_response`** (default) — The client receives the audio response first, then the action effects (step change, completion, client payload). Use this when the AI's spoken response should be heard before the UI transitions.
- **`before_response`** — Action effects are sent first, then the audio. Use this when the UI needs to update before the audio plays (e.g., showing a new interface before the AI speaks about it).

Timing is configured per action in `registry.ts` and flows through: `registry.timing` → `ActionHandler.getTiming()` → `ProcessResult.actionTiming` → `deliverResponse()` in the WS handler.

---

## Adding a New WebSocket Message Type

1. Create `myType.handler.ts` in `controllers/handlers/`:
   ```typescript
   export async function execute(ws, message, context): Promise<void> {
     // your logic
   }
   ```
2. Import and register in `registry.ts`:
   ```typescript
   myType: { execute: myTypeHandler, requiresAuth: true }
   ```

No changes needed to `WebSocketController` or other handlers.
