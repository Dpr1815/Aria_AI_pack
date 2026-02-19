# Lip Sync Pipeline (Backend)

## Overview

The backend generates lip sync data from TTS audio using [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync). Each TTS audio chunk is analysed to produce a timed sequence of **viseme cues** with morph-target blend weights. These cues travel to the frontend over WebSocket alongside their corresponding audio chunk.

```
TTS audio (PCM)
      │
      ▼
 pcmToWav()          ─── convert raw PCM to WAV (Rhubarb expects WAV)
      │
      ▼
 RhubarbConnector    ─── spawn CLI, parse JSON output
      │
      ▼
 processCues()       ─── filter <50ms cues, merge duplicates, map to morph weights
      │
      ▼
 SynthesisChunk      ─── { audio, visemes[], duration, chunkIndex, ... }
      │
      ▼
 WebSocket           ─── lipSync message first, then audio message
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/connectors/lipsync/ILipSyncConnector.ts` | Interface + `VISEME_MORPHS` mapping table |
| `src/connectors/lipsync/RhubarbConnector.ts` | CLI wrapper, cue processing, circuit breaker |
| `src/connectors/lipsync/NullLipSyncConnector.ts` | No-op used when `LIPSYNC_ENABLED=false` |
| `src/config/rhubarb.config.ts` | Env-based configuration |
| `src/services/speech/SynthesisService.ts` | Orchestrates TTS + lip sync per chunk |
| `src/controllers/handlers/ws.utils.ts` | Sends `lipSync` + `audio` messages over WS |
| `src/types/audio.types.ts` | `VisemeCue`, `LipSyncResult`, `SynthesisChunk` |

---

## Configuration

All settings come from environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `LIPSYNC_ENABLED` | `true` | Global on/off switch. When `false`, `NullLipSyncConnector` is used. |
| `RHUBARB_PATH` | `rhubarb` | Path to the Rhubarb executable |
| `RHUBARB_TIMEOUT_MS` | `30000` | Max time (ms) for a single Rhubarb invocation |
| `RHUBARB_RECOGNIZER` | `phonetic` | `phonetic` (fast, good enough) or `pocketSphinx` (more accurate, slower) |
| `RHUBARB_EXTENDED_SHAPES` | `true` | `true` = shapes A-H+X (9 shapes), `false` = A-F only (6 shapes) |

---

## How Rhubarb Is Invoked

`RhubarbConnector.generate(audioBuffer, text)` does the following:

1. **PCM to WAV** — `pcmToWav(audioBuffer, { sampleRate: 24000 })` writes a temporary `.wav` file.
2. **Dialog file** (optional) — If `text` is provided, it's written to a `.txt` file so Rhubarb can use phonetic hints for better accuracy.
3. **Spawn CLI** — Runs: `rhubarb <wav> -f json -r phonetic --extendedShapes GHX [-d <dialog.txt>]`
4. **Parse output** — Rhubarb returns JSON: `{ mouthCues: [{ start, end, value }, ...] }`
5. **Process cues** — `processCues()`:
   - Filters out cues shorter than 50ms
   - Merges consecutive identical visemes
   - Attaches morph weights via `getVisemeMorphs(shape)`
6. **Cleanup** — Deletes temp files.

A `CircuitBreaker` wraps the CLI call (threshold: 3 failures, reset: 30s). If Rhubarb fails, the chunk is sent with an empty visemes array — audio always plays.

---

## Viseme Shapes and Morph Mapping

Rhubarb outputs mouth shape letters (A–H, X). The backend maps each to a set of blend-shape morph targets compatible with **Ready Player Me / ARKit** avatars:

| Shape | Phonemes | Morph Targets |
|-------|----------|---------------|
| **A** | M, B, P (closed) | `viseme_PP: 0.55`, `mouthClose: 0.4` |
| **B** | Most consonants (slightly open) | `viseme_DD: 0.25`, `jawOpen: 0.1` |
| **C** | EH, AE (open) | `viseme_E: 0.35`, `viseme_aa: 0.2`, `jawOpen: 0.2` |
| **D** | AA (wide open) | `viseme_aa: 0.45`, `jawOpen: 0.35` |
| **E** | ER (rounded) | `viseme_RR: 0.35`, `jawOpen: 0.15` |
| **F** | UW, OW, W (puckered) | `viseme_U: 0.35`, `mouthPucker: 0.35`, `mouthFunnel: 0.2` |
| **G** | F, V (teeth on lip) | `viseme_FF: 0.4` |
| **H** | L (tongue behind teeth) | `viseme_nn: 0.35`, `jawOpen: 0.12`, `tongueOut: 0.08` |
| **X** | Silence / rest | `viseme_sil: 0.05`, `mouthClose: 0.1` |

This mapping lives in `VISEME_MORPHS` inside `ILipSyncConnector.ts`.

---

## Synthesis Flow

`SynthesisService.synthesize()` is an async generator that yields `SynthesisChunk` objects:

```
"Hello, how are you? I'm doing great."
                 │
          sentenceSplitter()
                 │
        ┌────────┴────────┐
        ▼                 ▼
   "Hello, how       "I'm doing
    are you?"          great."
        │                 │
   ┌────┴────┐       ┌────┴────┐
   │ TTS     │       │ TTS     │    ← all fired in parallel
   │ Rhubarb │       │ Rhubarb │    ← lip sync runs after TTS
   │ Fade    │       │ Fade    │    ← audio fading at boundaries
   └────┬────┘       └────┬────┘
        │                 │
   yield chunk 0     yield chunk 1   ← yielded in order
```

For each chunk:
1. `GoogleTTSConnector.synthesize()` → PCM audio buffer
2. `RhubarbConnector.generate(audio, text)` → `{ cues, duration }`
3. `applyPcmFades()` — fade-in/out at chunk boundaries (~5ms / 120 samples)
4. Return `SynthesisChunk`

---

## WebSocket Message Format

For each chunk, two messages are sent in order — **lip sync first, then audio**:

### `lipSync` message (only if visemes exist)

```json
{
  "type": "lipSync",
  "cues": [
    { "start": 0.0, "end": 0.15, "value": "X", "morphs": { "viseme_sil": 0.05, "mouthClose": 0.1 } },
    { "start": 0.15, "end": 0.35, "value": "C", "morphs": { "viseme_E": 0.35, "viseme_aa": 0.2, "jawOpen": 0.2 } }
  ],
  "duration": 1.23,
  "text": "Hello, how are you?",
  "chunkIndex": 0,
  "totalChunks": 2,
  "isFirst": true,
  "isLast": false
}
```

### `audio` message

```json
{
  "type": "audio",
  "data": "<base64 PCM LINEAR16>",
  "chunkIndex": 0,
  "totalChunks": 2,
  "isFirstChunk": true,
  "isLastChunk": false,
  "sampleRate": 24000,
  "duration": 1.23,
  "text": "Hello, how are you?"
}
```

---

## Consecutive Messages (Follow-Up Responses)

When a user action triggers a step transition, `deliverResponse()` sends **two sequential audio streams**:

```
1st stream: main response        2nd stream: follow-up (new step opening)
┌────────────────────────┐       ┌────────────────────────┐
│ lipSync chunk 0 (isFirst)│       │ lipSync chunk 0 (isFirst)│
│ audio   chunk 0          │       │ audio   chunk 0          │
│ lipSync chunk 1          │       │ lipSync chunk 1          │
│ audio   chunk 1          │       │ audio   chunk 1 (isLast) │
│ audio   chunk 2 (isLast) │       └────────────────────────┘
└────────────────────────┘
```

Each stream has its own `chunkIndex` starting at 0 and its own `isFirst`/`isLast` flags. The frontend uses `isFirstChunk` on the audio message to re-anchor lip sync timing for the second message.

---

## Error Handling

| Failure | Behaviour |
|---------|-----------|
| Rhubarb timeout | Chunk sent with empty `visemes[]`, audio plays without lip sync |
| Rhubarb crash | Circuit breaker opens after 3 failures, falls back to empty visemes for 30s |
| TTS failure | Entire chunk fails, `SynthesisService` logs and continues to next chunk |
| Dialog file write error | Rhubarb runs without `-d` flag (less accurate, still works) |

Lip sync is always best-effort — audio delivery is never blocked by lip sync failures.
