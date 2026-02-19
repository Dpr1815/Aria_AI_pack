# Speech Pipeline Architecture

## Overview

The system processes voice conversations through three stages: **STT → LLM → TTS**. Each stage uses a different concurrency strategy.

```
┌─────────┐      ┌─────────┐      ┌─────────┐
│   STT   │ ───► │   LLM   │ ───► │   TTS   │
│streaming│      │  batch  │      │parallel │
│  (gRPC) │      │ (REST)  │      │  batch  │
└─────────┘      └─────────┘      └─────────┘
```

| Stage | Type                              | Latency Profile                                           |
| ----- | --------------------------------- | --------------------------------------------------------- |
| STT   | True gRPC streaming               | Continuous — interim results arrive as user speaks        |
| LLM   | Batch (full request/response)     | Fast — GPT-4.1-mini returns in ~300-800ms for short turns |
| TTS   | Parallel batch with ordered yield | First chunk fast, rest fills in behind                    |

---

## Stage 1: STT (Streaming)

True bidirectional gRPC streaming via `SpeechClient.streamingRecognize()`. Audio flows continuously from client to Google, interim transcripts come back in real-time.

```
Client mic                    Google Speech API
    │                              │
    ├── audio chunk ──────────────►│
    ├── audio chunk ──────────────►│
    │◄─────── interim: "Hello"─────┤
    ├── audio chunk ──────────────►│
    │◄─────── interim: "Hello how"─┤
    ├── audio chunk ──────────────►│
    │◄─────── final: "Hello, how   │
    │         are you?"────────────┤
    │                              │
   end()                      stream closes
```

**Components involved:**

```
WebSocket ──► audio.handler ──► TranscriptionService ──► GoogleSTTStream (gRPC)
                                       │
                                  interim/final events
                                       │
                                       ▼
                              ConversationService
```

- `audio.handler` receives base64 audio chunks via WebSocket
- `TranscriptionService` manages sessions, pipes chunks to `GoogleSTTStream`
- `GoogleSTTStream` wraps the gRPC bidirectional stream
- Interim results fire callbacks in real-time; final transcript triggers LLM

---

## Stage 2: LLM (Batch)

Standard request/response. The full transcript goes in, the full AI response comes back.

```
ConversationService
    │
    ├── messages[] ──────────────► OpenAI API (GPT-4.1-mini)
    │                                  │
    │   (~300-800ms for short turns)   │
    │                                  │
    │◄──────── CompletionResult ───────┤
    │
    ▼
  response.text ──► SynthesisService
```

GPT-4.1-mini is fast for short conversational turns (typical in interview/agent scenarios). The LLM and TTS stages contribute roughly equal latency, making the parallel TTS pattern important for overall responsiveness.

> **Future optimization:** Stream LLM tokens directly into TTS `StreamingSynthesize` (gRPC). This would shave ~300-500ms by overlapping LLM generation with TTS synthesis. Diminishing returns given current latency profile.

---

## Stage 3: TTS (Parallel Batch)

Not true streaming, but behaves like it from the client's perspective. All sentence-level TTS calls fire simultaneously, results yield in order.

### What actually happens

```
"Hello, how are you? I'm doing great today. Let me help you with that."
                          │
                    sentenceSplitter
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
         "Hello, how   "I'm doing  "Let me help
          are you?"    great today." you with that."
              │           │           │
              ▼           ▼           ▼
         TTS call 1   TTS call 2   TTS call 3    ← all fired simultaneously
              │           │           │
              ▼           ▼           ▼
          ~250ms       ~300ms      ~280ms         ← resolve independently
              │           │           │
              ▼           ▼           ▼
         yield [0]    yield [1]    yield [2]      ← yielded in order
```

### Key design decisions

**First sentence is never merged.** The `sentenceSplitter` always emits the first sentence as its own chunk, even if it's short. A 5-word first sentence synthesizes in ~200ms, so the client gets audio fast.

**All calls fire at once, yield in order.** Parallel execution with sequential yielding:

```typescript
// Fire all in parallel
const promises = sentences.map((s, i) => this.synthesizeChunk(s, ...));

// Yield in order — each await resolves when that specific chunk is done
for (const promise of promises) {
  yield await promise;  // chunk 0 first, then 1, then 2...
}
```

**Result:** chunk 0 arrives in ~200-400ms. Chunks 1-N are likely already resolved by the time they're yielded.

### Timeline comparison

```
Sequential (if you waited for each):
|--chunk 0--||--chunk 1--||--chunk 2--|
0ms        300ms        600ms        900ms
                                     ▲ last audio ready

Parallel (what you do):
|--chunk 0--|
|---chunk 1---|
|--chunk 2--|
0ms        300ms
            ▲ ALL audio ready (roughly)
```

---

## Full Pipeline Timeline

```
Time ──────────────────────────────────────────────────────────►

STT:  |======= streaming audio in ========|
                                           │ final transcript
LLM:                                       |=== ~500ms ===|
                                                           │ full text
TTS:                                                       |▓░░|
                                                            ▓ = chunk 0 (~300ms)
                                                            ░ = chunks 1-N (already done)
WS:                                                         |►|►|►|
                                                            sending chunks to client
```

### Latency breakdown (typical)

| Phase                         | Duration                     | Notes                                       |
| ----------------------------- | ---------------------------- | ------------------------------------------- |
| STT final result              | ~500ms after user stops      | Depends on speech length                    |
| LLM response                  | ~300-800ms                   | GPT-4.1-mini, short conversational turns    |
| TTS chunk 0                   | ~200-400ms                   | First sentence only                         |
| TTS all chunks                | ~same as chunk 0             | Parallel execution                          |
| **Total time-to-first-audio** | **~1-1.7s after user stops** | All three stages contribute roughly equally |

### Where the time goes

```
STT ████████████████░░░░░░░░░░░░░░░░░░░░░░░  ~30%
LLM ░░░░░░░░░░░░░░░████████████░░░░░░░░░░░░  ~35%
TTS ░░░░░░░░░░░░░░░░░░░░░░░░░░█████████░░░░  ~25%
WS  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██░░  ~10%
```

No single stage dominates — the latency is evenly distributed across the pipeline.

---

## Architecture Summary

```
┌──────────────────────────────────────────────────────────┐
│                      WebSocket                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │  audio   │    │  stop    │    │  response chunks  │   │
│  │  chunks  │    │ recording│    │  (audio + visemes) │   │
│  │  (in)    │    │  (in)    │    │  (out)            │   │
│  └────┬─────┘    └────┬─────┘    └────────▲──────────┘   │
│       │               │                   │              │
│  ┌────▼───────────────▼───┐    ┌──────────┴──────────┐   │
│  │  TranscriptionService  │    │  SynthesisService    │   │
│  │  (manages STT sessions)│    │  (split + parallel)  │   │
│  └────────────┬───────────┘    └──────────▲──────────┘   │
│               │ final transcript          │ full text    │
│          ┌────▼───────────────────────────┴───┐          │
│          │       ConversationService          │          │
│          │       (orchestrates flow)          │          │
│          └────────────┬───────────────────────┘          │
│                       │                                  │
│              ┌────────▼────────┐                         │
│              │  OpenAI (LLM)   │                         │
│              │  GPT-4.1-mini   │                         │
│              └─────────────────┘                         │
└──────────────────────────────────────────────────────────┘
```

---

## Voice Type Constraints

| Voice Type  | Example                  | Rate/Pitch Params | Pricing  |
| ----------- | ------------------------ | :---------------: | -------- |
| Chirp 3: HD | `en-US-Chirp3-HD-Charon` |   ✗ (400 error)   | Premium  |
| Studio      | `en-US-Studio-O`         |      Limited      | Premium  |
| Neural2     | `en-US-Neural2-C`        |         ✓         | Premium  |
| WaveNet     | `en-US-Wavenet-D`        |         ✓         | Premium  |
| Standard    | `en-US-Standard-A`       |         ✓         | Standard |

All voice types use the same `synthesizeSpeech` batch call. The only per-voice-type logic is conditionally omitting `speakingRate`/`pitch` for Chirp 3 HD voices to avoid 400 errors.
