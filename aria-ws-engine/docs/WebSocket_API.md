# WebSocket API Reference

## Overview

All communication between client and server uses JSON messages over a single WebSocket connection. Every message has a `type` field that determines its purpose and schema.

---

## Client -> Server Messages

Validated via Zod schemas in `src/validations/websocket.validation.ts` (single source of truth).

### `init`

Authenticates the client and initializes the session. Must be the first message sent.

```json
{
  "type": "init",
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `"init"` | yes | |
| `accessToken` | `string` | yes | Session access token (min 1 char) |

**Auth required:** No (this establishes auth)

**Response:** `sessionReady` + greeting `response` with audio

---

### `startRecording`

Opens a new STT streaming session.

```json
{
  "type": "startRecording"
}
```

**Auth required:** Yes

**Response:** None (silently opens STT stream)

---

### `audio`

Streams a base64-encoded audio chunk to the active STT session. Called many times per second during recording.

```json
{
  "type": "audio",
  "data": "SGVsbG8gV29ybGQ..."
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `"audio"` | yes | |
| `data` | `string` | yes | Base64-encoded audio (min 1 char) |

**Auth required:** Yes

**Response:** None (hot path, optimized for minimal latency)

---

### `stopRecording`

Closes the STT stream, gets the transcript, runs the LLM, and streams back the TTS response.

```json
{
  "type": "stopRecording",
  "latency": 250
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `"stopRecording"` | yes | |
| `latency` | `number` | no | Client-measured latency in ms (non-negative) |

**Auth required:** Yes

**Response sequence:**
1. `processingStart` (stage: `stt`)
2. `processingEnd` (stage: `stt`)
3. `transcript`
4. `processingStart` (stage: `llm`)
5. `processingEnd` (stage: `llm`)
6. `response` (AI text)
7. `processingStart` (stage: `tts`)
8. `lipSync` + `audio` chunks (interleaved)
9. `processingEnd` (stage: `tts`)
10. Action effects if applicable (`stepChanged`, `conversationComplete`, client payload)
11. Follow-up `response` + audio if step transitioned

---

### `submitData`

Submits structured data (form responses, test solutions, etc.).

```json
{
  "type": "submitData",
  "dataType": "testSolution",
  "payload": {
    "solution": "function fibonacci(n) { ... }",
    "language": "javascript",
    "timeSpentMs": 120000
  },
  "latency": 150
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `"submitData"` | yes | |
| `dataType` | `string` | yes | Type key (e.g. `"testSolution"`, `"formResponse"`) |
| `payload` | `unknown` | yes | Data payload (validated per `dataType`) |
| `latency` | `number` | no | Client-measured latency in ms |

**Known payload schemas:**

**`testSolution`:**
```typescript
{ solution: string, language?: string, timeSpentMs?: number }
```

**`formResponse`:**
```typescript
{ fields: Record<string, unknown>, formId?: string, submittedAt?: string }
```

**Auth required:** Yes

**Response:** Same as `stopRecording` (LLM processes the data and responds)

---

## Server -> Client Messages

Defined in `src/types/websocket.types.ts`.

### `sessionReady`

Sent after successful `init`. Contains everything the client needs to set up the UI.

```json
{
  "type": "sessionReady",
  "sessionId": "507f1f77bcf86cd799439011",
  "currentStep": "introduction",
  "isNewSession": true,
  "agentConfig": {
    "voice": {
      "languageCode": "en-US",
      "name": "en-US-Journey-D",
      "gender": "FEMALE"
    },
    "features": {
      "lipSync": true,
      "sessionPersistence": true,
      "autoSummary": false,
      "videoRecording": false
    },
    "render": {
      "mode": "avatar"
    },
    "stepCount": 5
  }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `sessionId` | `string` | MongoDB ObjectId |
| `currentStep` | `string` | Current step key |
| `isNewSession` | `boolean` | `true` = fresh session, `false` = reconnect |
| `agentConfig.voice` | `VoiceConfig` | TTS/STT voice settings |
| `agentConfig.features` | `AgentFeatures` | Agent capabilities |
| `agentConfig.render` | `RenderConfig` | UI rendering config (`"avatar"` or `"presentation"`) |
| `agentConfig.stepCount` | `number` | Total steps (for progress display) |

**Type references:**

```typescript
VoiceConfig {
  languageCode: string    // e.g. "en-US", "it-IT"
  name: string            // e.g. "en-US-Journey-D"
  gender: "MALE" | "FEMALE" | "NEUTRAL"
}

AgentFeatures {
  lipSync: boolean
  sessionPersistence: boolean
  autoSummary: boolean
  videoRecording: boolean
}

RenderConfig {
  mode: "avatar" | "presentation"
  presentation?: { link: string, slides?: Record<string, number> }
}
```

---

### `response`

AI-generated text response.

```json
{
  "type": "response",
  "content": "Great! Let's move on to the next topic.",
  "currentStep": "screening",
  "isComplete": false,
  "action": "STEP_COMPLETED"
}
```

| Field | Type | Description |
| --- | --- | --- |
| `content` | `string` | AI response text |
| `currentStep` | `string` | Current step key |
| `isComplete` | `boolean` | Is the conversation over? |
| `action` | `string?` | Action key if LLM triggered one |

When an action returns a `clientPayload`, it is spread into an additional `response` message:
```json
{
  "type": "response",
  "content": "",
  "currentStep": "assessment",
  "isComplete": false,
  "action": { "type": "openAssessment", "payload": { ... } }
}
```

---

### `audio`

Base64-encoded TTS audio chunk.

```json
{
  "type": "audio",
  "data": "UklGRi4AAABXQVZFZm...",
  "chunkIndex": 0,
  "totalChunks": 3,
  "isFirstChunk": true,
  "isLastChunk": false,
  "sampleRate": 24000,
  "duration": 2.5,
  "text": "Great question."
}
```

| Field | Type | Description |
| --- | --- | --- |
| `data` | `string` | Base64-encoded PCM audio |
| `chunkIndex` | `number` | 0-based position in sequence |
| `totalChunks` | `number` | Total chunks for this response |
| `isFirstChunk` | `boolean` | First chunk? |
| `isLastChunk` | `boolean` | Last chunk? |
| `sampleRate` | `number` | Audio sample rate (e.g. 24000) |
| `duration` | `number` | Duration in seconds |
| `text` | `string?` | Source text for this chunk |

---

### `lipSync`

Viseme data for lip-synced animation. Sent immediately before the corresponding `audio` chunk.

```json
{
  "type": "lipSync",
  "cues": [
    { "start": 0.0, "end": 0.15, "value": "X", "morphs": { "mouthOpen": 0.0, "jawOpen": 0.0 } },
    { "start": 0.15, "end": 0.35, "value": "C", "morphs": { "mouthOpen": 0.4, "jawOpen": 0.3 } }
  ],
  "duration": 2.5,
  "text": "Great question.",
  "chunkIndex": 0,
  "totalChunks": 3,
  "isFirst": true,
  "isLast": false
}
```

| Field | Type | Description |
| --- | --- | --- |
| `cues` | `VisemeCue[]` | Array of viseme cues |
| `duration` | `number` | Duration in seconds |
| `text` | `string` | Source text |
| `chunkIndex` | `number` | Position in sequence |
| `totalChunks` | `number` | Total chunks |
| `isFirst` | `boolean` | First chunk? |
| `isLast` | `boolean` | Last chunk? |

**VisemeCue:**
```typescript
{
  start: number           // Start time (seconds)
  end: number             // End time (seconds)
  value: string           // Rhubarb shape: A-H or X
  morphs: {               // Blend shape weights (0.0 - 1.0+)
    mouthOpen?: number
    mouthSmile?: number
    mouthFunnel?: number
    mouthPucker?: number
    mouthWide?: number
    mouthClose?: number
    tongueOut?: number
    jawOpen?: number
  }
}
```

**Rhubarb mouth shapes:** `A` closed (M/B/P), `B` slightly open, `C` open (EH/AE), `D` wide open (AA), `E` rounded (ER), `F` puckered (UW/OW/W), `G` upper teeth on lower lip (F/V), `H` tongue behind teeth (L), `X` idle/rest.

Only sent when `agentConfig.features.lipSync` is `true`.

---

### `transcript`

Final STT transcript.

```json
{
  "type": "transcript",
  "transcript": "I have five years of experience in full-stack development."
}
```

---

### `error`

```json
{
  "type": "error",
  "error": "Authentication failed",
  "code": "AUTH_FAILED",
  "recoverable": false
}
```

| Field | Type | Description |
| --- | --- | --- |
| `error` | `string` | Human-readable message |
| `code` | `string?` | Error code (see below) |
| `recoverable` | `boolean?` | Can the client recover? |

**Error codes:**

| Code | Recoverable | Description |
| --- | --- | --- |
| `AUTH_REQUIRED` | no | Message sent before `init` |
| `AUTH_FAILED` | no | Invalid access token |
| `NO_SESSION` | yes | Session not initialized |
| `MESSAGE_ERROR` | yes | Malformed message |
| `UNKNOWN_TYPE` | yes | Unknown message type |
| `INVALID_AUDIO` | yes | Bad base64 audio data |
| `START_RECORDING_ERROR` | yes | Failed to open STT stream |
| `STOP_RECORDING_ERROR` | yes | Failed to close STT stream |
| `EMPTY_TRANSCRIPT` | yes | No speech detected |
| `INIT_ERROR` | no | Init handler failed |
| `SUBMIT_DATA_ERROR` | yes | Data submission failed |

---

### `stepChanged`

Conversation advanced to a new step.

```json
{
  "type": "stepChanged",
  "from": "",
  "to": "technical_assessment"
}
```

---

### `conversationComplete`

Conversation has ended. No more input should be sent.

```json
{
  "type": "conversationComplete"
}
```

---

### `processingStart` / `processingEnd`

Processing stage indicators. Useful for showing loading states in the UI.

```json
{ "type": "processingStart", "stage": "stt" }
{ "type": "processingEnd", "stage": "stt" }
```

**Stages:** `stt`, `llm`, `tts`, `lipsync`

---

## Response Delivery Flow

The `deliverResponse` function in `ws.utils.ts` orchestrates the order of messages based on action timing.

### Default flow (`after_response` timing)

```
1. response          (AI text)
2. processingStart   (tts)
3. [lipSync + audio] (chunks, interleaved)
4. processingEnd     (tts)
5. stepChanged       (if step advanced)
6. conversationComplete (if done)
7. response          (client payload, if action returned one)
8. response          (follow-up text for new step, if step transitioned)
9. processingStart   (tts)
10. [lipSync + audio] (follow-up audio)
11. processingEnd    (tts)
```

### `before_response` timing

```
1. stepChanged / conversationComplete / client payload  (effects first)
2. response          (AI text)
3. processingStart   (tts)
4. [lipSync + audio] (chunks)
5. processingEnd     (tts)
6. response + audio  (follow-up, if any)
```

---

## Action Types

Actions are triggered by the LLM (returned as a string key in the JSON response) and executed server-side. All actions are currently configured with `after_response` timing.

| Action | Purpose | Timing |
| --- | --- | --- |
| `STEP_COMPLETED` | Advance to next step, trigger AI opening for new step | `after_response` |
| `CONVERSATION_COMPLETE` | Mark session as completed | `after_response` |
| `START_TEST` | Send assessment payload to client | `after_response` |
| `START_LINGUISTIC` | Switch to native speaker voice for target language step | `after_response` |
| `STOP_LINGUISTIC` | Revert to agent's original voice | `after_response` |

---

## Connection State

Per-connection state tracked server-side:

```typescript
{
  sessionId: ObjectId | null
  session: SessionDocument | null
  agent: AgentDocument | null
  isAuthenticated: boolean
  transcriptionSessionId: string | null
  connectedAt: Date
  lastActivityAt: Date
}
```

**Lifecycle:**
1. WS connect -> all fields null, `isAuthenticated: false`
2. `init` -> authenticated, session/agent loaded
3. `startRecording` -> `transcriptionSessionId` set
4. `stopRecording` -> `transcriptionSessionId` cleared
5. WS disconnect -> state discarded, STT stream cleaned up

---

## Full Conversation Example

```
CLIENT                                SERVER
  |                                     |
  |-- { type: "init", accessToken }  -->|  Auth + load session
  |                                     |
  |<-- sessionReady --------------------|
  |<-- response (greeting text) --------|
  |<-- processingStart (tts) -----------|
  |<-- lipSync (chunk 0) ---------------|
  |<-- audio (chunk 0) -----------------|
  |<-- lipSync (chunk 1) ---------------|
  |<-- audio (chunk 1) -----------------|
  |<-- processingEnd (tts) -------------|
  |                                     |
  |-- { type: "startRecording" } ------>|  Open STT stream
  |-- { type: "audio", data } x N ---->|  Stream audio
  |-- { type: "stopRecording" } ------->|  Close STT
  |                                     |
  |<-- processingStart (stt) -----------|
  |<-- processingEnd (stt) -------------|
  |<-- transcript ----------------------|
  |<-- processingStart (llm) -----------|
  |<-- processingEnd (llm) -------------|
  |<-- response (AI text) --------------|
  |<-- processingStart (tts) -----------|
  |<-- [lipSync + audio chunks] --------|
  |<-- processingEnd (tts) -------------|
  |                                     |
  |     ... repeat per turn ...         |
  |                                     |
  |<-- stepChanged { to: "step2" } -----|  (after STEP_COMPLETED action)
  |<-- response (new step opening) -----|
  |<-- [lipSync + audio chunks] --------|
  |                                     |
  |     ... more turns ...              |
  |                                     |
  |<-- conversationComplete ------------|
  |                                     |
  |-- WS disconnect ------------------->|  Cleanup
```

---

## Extension Guides

- [Add a New Handler](Add_new_handler.md) — New WebSocket message type (schema + handler + registry)
- [Add a New Action](Add_new_action.md) — New LLM-triggered action (executor + type + registry)
- [Add a New Step](Add_new_step.md) — New conversation step (DB records + how navigation works)
