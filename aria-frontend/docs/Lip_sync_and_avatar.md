# Lip Sync and Avatar System (Frontend)

## Overview

The frontend receives interleaved `lipSync` and `audio` WebSocket messages from the backend, schedules PCM audio via the Web Audio API, and drives morph-target animation on a 3D avatar at 60 fps using React Three Fiber.

```
WebSocket messages
    │
    ├── lipSync msg ──► useAudioPlayback.handleLipSyncData()
    │                        │
    │                   accumulate cues
    │                        │
    │                   dispatch "avatarLipSyncData" event
    │                        │
    │                        ▼
    │                   useLipSyncEvents ──► cuesRef
    │
    ├── audio msg ────► useAudioPlayback.scheduleChunk()
    │                        │
    │                   decode PCM → AudioBuffer → schedule on Web Audio
    │                        │
    │                   dispatch "avatarAudioStart" event (once per message)
    │                        │
    │                        ▼
    │                   useLipSyncEvents ──► audioStartTimeRef
    │
    └────────────────────────────────────────────────────────┐
                                                             ▼
                                                      useMorphTargets
                                                      (60fps useFrame)
                                                             │
                                                      elapsed = now - audioStartTime
                                                      find cue at elapsed
                                                      apply morph targets
                                                             │
                                                             ▼
                                                      SkinnedMesh morph influences
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/features/room/hooks/use-audio-playback.ts` | PCM scheduling, lip sync cue accumulation, custom event dispatch |
| `src/features/room/hooks/use-lip-sync-events.ts` | Subscribes to custom events, exposes refs to morph system |
| `src/features/room/hooks/use-morph-targets.ts` | 60fps animation loop — applies visemes, blinking, neutral expression |
| `src/features/room/hooks/use-room-websocket.ts` | Routes inbound WS messages to the above hooks |
| `src/features/room/components/display/avatar-model.tsx` | Loads GLB, collects SkinnedMesh nodes, wires morph system |
| `src/features/room/components/display/avatar-scene.tsx` | R3F Canvas with lighting and camera |
| `src/features/room/constants/avatar.constants.ts` | Viseme intensities, morph names, blink timing, camera config |
| `src/features/room/types/avatar.types.ts` | `LipSyncCue`, `LipSyncEventDetail`, `AudioStartEventDetail` |

---

## Audio Playback Pipeline

### `useAudioPlayback` hook

Manages the entire audio lifecycle:

1. **`scheduleChunk(base64Data, isLastChunk, isStreaming, isFirstChunk)`**
   - Decodes base64 → PCM Int16 → Float32
   - Applies fade-in/out (first/last 100 samples) to prevent clicks
   - Creates `AudioBuffer` and `BufferSourceNode`
   - Schedules on Web Audio timeline: `startTime = max(ctx.currentTime, nextPlayTime)`
   - On first chunk of each message (`isFirstChunk`), dispatches `avatarAudioStart` with wall-clock-aligned start time

2. **`handleLipSyncData(data)`**
   - First chunk of a message: replaces cue array
   - Subsequent chunks: appends cues with time offsets (accumulated duration)
   - Dispatches `avatarLipSyncData` event after each update

3. **`resetPlayback()`**
   - Called when the last audio source finishes (`onended` + all sources done)
   - Clears all state, dispatches `audioPlaybackChange: false` after 100ms delay
   - The delay allows morph targets to lerp back to neutral before cleanup

### Consecutive messages

When two assistant messages arrive back-to-back (e.g. main response + follow-up):

- `isFirstChunk=true` on the second message's first audio chunk triggers:
  - Cancel any pending reset timeout from the first message
  - Reset `lastChunkReceivedRef` (new message hasn't ended yet)
  - Reset `hasDispatchedStartRef` so a new `avatarAudioStart` fires
- The new `avatarAudioStart` carries the correct wall-clock time for message 2's audio
- Lip sync cues are replaced (not accumulated across messages)

---

## Lip Sync Event System

Three `window` CustomEvents connect the audio system to the 3D animation:

| Event | Payload | Dispatched when |
|-------|---------|-----------------|
| `avatarAudioStart` | `{ startTime: number }` | First audio chunk of each message is scheduled. `startTime` is the wall-clock time when audio will actually play. |
| `avatarLipSyncData` | `{ cues, duration, text, isFirstChunk, isLastChunk, chunkIndex }` | Each lip sync message is processed |
| `audioPlaybackChange` | `boolean` | Playback starts (`true`) or all audio finishes (`false`, 100ms delayed) |

### `useLipSyncEvents` hook

Subscribes to all three events and exposes refs (no re-renders):

- `cuesRef` — current viseme cue array
- `audioStartTimeRef` — wall-clock second when current message's audio starts
- `isSpeakingRef` — whether audio is playing
- `isLastChunkRef` — whether the last lip sync chunk has arrived

---

## Morph Target Animation

### `useMorphTargets` hook

Runs inside R3F's `useFrame` at 60fps. Three systems:

#### 1. Lip sync (when speaking)

```
elapsed = performance.now() / 1000 - audioStartTimeRef

search cues array for the cue where: cue.start <= elapsed < cue.end

if found:
  clear all mouth morphs → 0
  apply cue.morphs (e.g. { viseme_PP: 0.55, mouthClose: 0.4 })
```

The search uses a `cueSearchIndex` ref that advances forward (and can retreat) to avoid scanning from index 0 every frame.

#### 2. Idle blinking

Random blink every ~4s (with jitter). Sets `eyeBlinkLeft`/`eyeBlinkRight` to 0.9 for 150ms.

#### 3. Neutral expression (when not speaking)

Applies a subtle happy-neutral: slight smile, brow up, dimple.

#### Smooth lerping

All morph target changes are lerped: `next = current + (target - current) * MORPH_LERP_SPEED * delta`

`MORPH_LERP_SPEED = 5.0` — higher values make transitions snappier.

---

## Avatar Model

### `AvatarModel` component

Loads a GLB file via `useGLTF`, then:

1. **Traverses the scene** collecting all `SkinnedMesh` nodes that have `morphTargetInfluences` and `morphTargetDictionary`
2. **Enhances materials** (skin roughness, eye reflectivity, hair double-sided)
3. **Plays idle animation** (finds any clip with "idle" in the name)
4. **Wires `useMorphTargets`** with the collected meshes and lip sync refs

The avatar GLB is imported from `@/assets/aria.glb`.

---

## Changing the Avatar

### Requirements for a new GLB model

The lip sync system needs the avatar's face mesh to have **morph targets** (blend shapes). The required morph target names depend on what the backend sends in the `morphs` field of each cue.

#### Required morph targets (used by backend `VISEME_MORPHS`)

These are the targets the backend maps Rhubarb visemes to. The avatar **must** have these on its face/head `SkinnedMesh`:

| Morph Target | Used by visemes |
|-------------|-----------------|
| `viseme_PP` | A (closed: M, B, P) |
| `viseme_DD` | B (consonants) |
| `viseme_E` | C (EH, AE) |
| `viseme_aa` | C, D (open vowels) |
| `viseme_RR` | E (rounded: ER) |
| `viseme_U` | F (puckered: UW, OW) |
| `viseme_FF` | G (teeth on lip: F, V) |
| `viseme_nn` | H (tongue: L) |
| `viseme_sil` | X (silence) |
| `jawOpen` | B, C, D, E, H |
| `mouthClose` | A, X |
| `mouthPucker` | F |
| `mouthFunnel` | F |
| `tongueOut` | H |

#### Additional morph targets (used by frontend animation)

These are used by the blink system, neutral expression, and fallback viseme mapping:

| Morph Target | Purpose |
|-------------|---------|
| `eyeBlinkLeft` | Idle blinking |
| `eyeBlinkRight` | Idle blinking |
| `mouthSmileLeft` | Neutral expression + subtle speech smile |
| `mouthSmileRight` | Neutral expression |
| `browInnerUp` | Neutral expression |
| `mouthDimpleLeft` | Neutral expression |
| `viseme_I`, `viseme_O`, `viseme_TH`, `viseme_kk`, `viseme_CH`, `viseme_SS` | Fallback viseme mapping (used when cues lack `morphs`) |

#### Morph targets cleared between visemes

All names in `MOUTH_MORPH_NAMES` (see `avatar.constants.ts`) are zeroed before applying each new viseme. If your avatar has additional mouth-related morphs that conflict, add them to this array.

### Step-by-step: swapping the avatar

1. **Export your GLB** with morph targets (blend shapes) on the face mesh. Tools like Blender or Ready Player Me export these by default if the model has them.

2. **Verify morph targets** — Open the GLB in the [three.js editor](https://threejs.org/editor/) or Blender and check `morphTargetDictionary` on the face `SkinnedMesh`. All names from the tables above should be present.

3. **Replace the GLB file** — Swap `src/assets/aria.glb` with your new file (or update the import in `avatar-model.tsx`).

4. **If morph target names differ:**

   - **Backend** — Update `VISEME_MORPHS` in `ILipSyncConnector.ts` to map Rhubarb shapes to your model's morph target names.
   - **Frontend** — Update `VISEME_INTENSITIES` and `MOUTH_MORPH_NAMES` in `avatar.constants.ts` to match.

5. **If the model uses a different rigging standard** (e.g. not ARKit/Oculus):

   You'll need to create a new mapping from Rhubarb's 9 shapes (A–H, X) to whatever morph targets your model exposes. The mapping is a simple object: shape letter → `{ morphTargetName: weight }`. Update `VISEME_MORPHS` on the backend — the frontend will receive the correct morph names automatically in the `cue.morphs` field.

6. **Adjust constants** (optional):

   | Constant | File | What it controls |
   |----------|------|------------------|
   | `MORPH_LERP_SPEED` | `avatar.constants.ts` | Transition speed (higher = snappier). Default `5.0`. |
   | `NEUTRAL_EXPRESSION` | `avatar.constants.ts` | Resting face when not speaking. Tune per model. |
   | `BLINK_INTERVAL_MS` | `avatar.constants.ts` | Average time between blinks. Default `4000`. |
   | `BLINK_DURATION_MS` | `avatar.constants.ts` | How long a blink lasts. Default `150`. |
   | `CAMERA_CONFIG` | `avatar.constants.ts` | FOV, position, clipping. Adjust if model scale differs. |
   | `MATERIAL_PRESETS` | `avatar.constants.ts` | Roughness, metalness, etc. Tune for your model's materials. |

7. **Idle animation** — The system auto-plays the first animation clip whose name contains "idle". If your model names it differently, update the logic in `avatar-model.tsx` (line ~142).

### Ready Player Me avatars

Ready Player Me models export with ARKit-compatible blend shapes by default, including all `viseme_*` targets. These work out of the box with no mapping changes. Just export as GLB with "morph targets" enabled.

### Models without viseme morph targets

If your model only has generic mouth morphs (e.g. `mouthOpen`, `jawOpen`, `mouthSmile`), you have two options:

1. **Add viseme blend shapes in Blender** — Create shape keys for each viseme manually or using a tool like [Mesh2Viseme](https://github.com/njanakiev/mesh2viseme).

2. **Remap the backend output** — Update `VISEME_MORPHS` in `ILipSyncConnector.ts` to target whatever morphs your model has. For example, if your model only has `mouthOpen` and `jawOpen`:

   ```typescript
   A: { mouthOpen: 0.0, jawOpen: 0.0 },   // closed
   B: { mouthOpen: 0.1, jawOpen: 0.1 },   // slightly open
   C: { mouthOpen: 0.3, jawOpen: 0.2 },   // open
   D: { mouthOpen: 0.6, jawOpen: 0.4 },   // wide open
   // ...etc
   ```

   Then update `MOUTH_MORPH_NAMES` on the frontend to include your model's morph names so they get properly cleared between visemes.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│  useRoomWebSocket                                                       │
│  Routes WS messages to handlers                                         │
│                                                                         │
│  lipSync msg ──► handleLipSyncData()    audio msg ──► scheduleChunk()   │
└──────────┬──────────────────────────────────────────┬───────────────────┘
           │                                          │
           │ CustomEvent: avatarLipSyncData           │ CustomEvent: avatarAudioStart
           │ CustomEvent: audioPlaybackChange         │
           ▼                                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  useLipSyncEvents                                                       │
│  Ref-based state (no re-renders):                                       │
│   cuesRef ◄──── avatarLipSyncData                                       │
│   audioStartTimeRef ◄──── avatarAudioStart                              │
│   isSpeakingRef ◄──── audioPlaybackChange                               │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  useMorphTargets (useFrame @ 60fps)                                     │
│                                                                         │
│  if speaking:                                                           │
│    elapsed = now - audioStartTime                                       │
│    find cue at elapsed                                                  │
│    clear mouth morphs → apply cue.morphs                                │
│  else:                                                                  │
│    apply neutral expression                                             │
│                                                                         │
│  always: lerp all morphs, idle blink                                    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  AvatarModel                                                            │
│  GLB loaded via useGLTF                                                 │
│  SkinnedMesh[] with morphTargetInfluences                               │
│  Morph values applied per-frame by useMorphTargets                      │
└─────────────────────────────────────────────────────────────────────────┘
```
