# Unified Editor and AI Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish MotionCaption as one CaptionForge-style editor with manual composition, subtitle-driven AI orchestration, an exportable self-updating component skill, and visually faithful transparent MOV export.

**Architecture:** `MotionProject` remains the only persisted editor state and `ProjectComposition` remains the only preview/export render tree. Manual actions and validated Agent JSON write directly to formal effects; invalid imports are atomic no-ops. `EffectDefinition` drives the component library, generated skill, and internal Agent manifest. Tauri owns secrets, file writes, network calls, and a Node/Remotion render sidecar.

**Tech Stack:** React 18, TypeScript, Zustand 5, Zod 3, Remotion 4.0.518, Vitest, Vite, Tauri 2, Rust `keyring` 4.2.0 with native Windows Credential Manager, OpenAI-compatible HTTP, Node sidecar.

## Global Constraints

- Work in `C:\Users\AYOU\Desktop\MotionCaption` on branch `codex/migration`; the user has approved in-place work and has a backup.
- Preserve `C:\Users\AYOU\Desktop\MotionCaption\start.bat`; never edit, stage, commit, or delete it.
- Treat `C:\Users\AYOU\Desktop\CaptionForge` as read-only reference material.
- Preserve all 45 frozen MotionCaption components and the single React/Remotion render tree.
- The user-approved workspace is one screen: top toolbar, left component library, center composite stage, right inspector, bottom timeline.
- No page-level editor/component-lab switch remains.
- Video and subtitles are optional. Empty projects default to 1920×1080, 30fps, 300 frames.
- Manual editing never requires Agent JSON.
- Valid Agent JSON atomically replaces all formal effects; invalid JSON leaves the current project unchanged.
- No persistent draft-effects state, draft track, apply-draft action, or discard-draft action.
- Preview backgrounds are `checkerboard`, `dark`, or `video`; none may enter transparent export.
- Timeline has a read-only subtitle track, vertically scrollable effect tracks, horizontal scrolling after zoom, a sticky ruler, and sticky track labels.
- Every track has an editor-only visibility eye; it hides that track in preview but never changes project data or transparent export.
- All scrollable controls use thin dark-theme scrollbars with themed hover color; no light system scrollbar may appear in the dark workspace.
- AI orchestration may only select registered, AI-approved components. It may not generate component code.
- OpenAI-compatible API Key stays in native secure storage and never reaches logs, localStorage, project JSON, or renderer command arguments.
- LLM output is parsed as data only. Never execute returned code, shell text, HTML, or URLs.
- One automatic repair is allowed after hard validation failure; a second failure stops without changing the project.
- `EffectDefinition` plus reviewed AI metadata is the source of truth for generated `SKILL.md`, references, and internal manifest.
- Unregistered or unreviewed new components remain manually usable but are excluded from AI orchestration.
- Web Renderer is rejected for shipping export because `t7-06` lost SVG arcs in the bake-off.
- Transparent export uses a replaceable Node/Remotion sidecar and must fail closed; never produce an opaque or black-background fallback.
- Every task uses TDD, `npm run verify`, a real browser check when UI changes, a task-scoped commit, and an independent review gate.

---

### Task 8: Replace Draft State with Atomic Formal Import

**Files:**
- Modify: `motion-demo-system/src/store/editorStore.ts`
- Modify: `motion-demo-system/src/store/editorStore.test.ts`
- Create: `motion-demo-system/src/agent/importAgentSequence.ts`
- Create: `motion-demo-system/src/agent/importAgentSequence.test.ts`
- Modify: `motion-demo-system/src/editor/EditorApp.tsx`
- Delete uncommitted task files: `motion-demo-system/src/editor/DraftReview.tsx`, `motion-demo-system/src/editor/DraftReview.test.tsx`

**Interfaces:**
- Consumes: `validateAgentDraft()`, `compileAgentDraft()`, `MotionProject`.
- Produces:

```ts
export type AgentImportResult =
  | { ok: true; project: MotionProject; warnings: DraftDiagnostic[] }
  | { ok: false; errors: DraftDiagnostic[]; warnings: DraftDiagnostic[] };

export function importAgentSequence(
  project: MotionProject,
  draft: AgentDraft,
): AgentImportResult;
```

- [ ] **Step 1: Write store tests that reject persistent draft state**

Assert `EditorStoreState` exposes no `draftEffects`, `draftReview`, `importDraft`, `applyDraft`, or `discardDraft`; add `replaceEffects(effects)` and verify deep cloning.

- [ ] **Step 2: Run the focused store test**

Run: `npm run test -- src/store/editorStore.test.ts`

Expected: FAIL because old draft fields still exist and `replaceEffects` is missing.

- [ ] **Step 3: Implement the minimal formal-only store**

```ts
replaceEffects: (effects) => set((state) => ({
  project: {...state.project, effects: effects.map(cloneEffect)},
  selectedInstanceId: null,
})),
```

Remove all persistent draft fields/actions and clear obsolete imports.

- [ ] **Step 4: Test atomic Agent import**

Cover valid replacement, invalid no-op, warnings not blocking, and compiler exceptions. Compare the original project object deeply after every failure.

- [ ] **Step 5: Implement `importAgentSequence()`**

Validate first, compile into a new array second, and return a new project only after both succeed. Do not mutate the caller.

- [ ] **Step 6: Replace EditorApp draft UI with direct import**

After a valid parse, call `importAgentSequence()`, then `replaceEffects()`. Render errors in a status panel; do not render a review/apply/discard section.

- [ ] **Step 7: Verify and commit**

Run: `npm run test -- src/store src/agent src/project && npm run typecheck`

Expected: all focused tests and typecheck pass.

Commit: `refactor: import agent sequences atomically`

---

### Task 9: Build the Unified Four-Zone Workspace

**Files:**
- Modify: `motion-demo-system/src/app/App.tsx`
- Modify: `motion-demo-system/src/editor/EditorApp.tsx`
- Create: `motion-demo-system/src/editor/Toolbar.tsx`
- Create: `motion-demo-system/src/editor/ComponentLibrary.tsx`
- Create: `motion-demo-system/src/editor/InspectorPanel.tsx`
- Modify: `motion-demo-system/src/editor/VideoStage.tsx`
- Modify: `motion-demo-system/src/editor/SelectionBox.tsx`
- Modify: `motion-demo-system/src/editor/coordinates.ts`
- Modify: `motion-demo-system/src/store/editorStore.ts`
- Modify: `motion-demo-system/src/index.css`
- Delete: `motion-demo-system/src/effect-lab/EffectLab.tsx`
- Remove after testing: `motion-demo-system/task8-browser-harness.html`

**Interfaces:**
- Consumes: `effectRegistry`, `ProjectComposition`, formal-only editor store.
- Produces:

```ts
export type PreviewBackground = 'checkerboard' | 'dark' | 'video';
addEffect(componentId: string, atFrame: number): string;
setPreviewBackground(mode: PreviewBackground): void;
```

- [ ] **Step 1: Write manual-add store tests**

Verify a registered component is created at the clamped current frame with cloned defaults, a legal duration, first free track, and unique `instanceId`. Unknown IDs must not modify the project.

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm run test -- src/store/editorStore.test.ts`

Expected: FAIL because `addEffect()` and preview background state are missing.

- [ ] **Step 3: Implement manual-add and preview mode**

Keep `PreviewBackground` editor-only; do not add it to `MotionProject`. Use `effectRegistry.get()` defaults and the existing declared planning footprint.

- [ ] **Step 4: Replace App navigation with one workspace**

```tsx
export const App = () => <EditorApp />;
```

Build CSS grid areas `toolbar`, `library`, `stage`, `inspector`, and `timeline`. Sidebars collapse without unmounting selected state; timeline height uses a bounded CSS variable.

- [ ] **Step 5: Build component library**

Keep one search box. Remove the category dropdown, long effect description, selected-preview area, and separate `添加到当前时间` button. Render large category labels inline as list separators, followed by dense component items. Clicking an item immediately adds it at the current frame and selects the new instance so the inspector opens. Do not duplicate the old full-page lab.

- [ ] **Step 6: Merge video and effects into one stage**

Render the optional `<video>` beneath the transparent Remotion Player. Render checkerboard or current MotionCaption dark background when selected. Keep `SelectionBox` in an editor-only overlay. Keep the top toolbar as one compact row containing actions only. Remove the stage header row and overlay an always-visible control at the bottom of the stage: the left side shows project/reference-video status and canvas/fps, while the remaining area contains play/pause, scrubber, time, and frame. Hover may increase opacity but the control must not auto-hide or consume grid height.

- [ ] **Step 7: Build registry-driven inspector**

Edit agent-editable content, transform, time, track, and zIndex. Every write goes through `updateEffect()` clamping and deep cloning.

- [ ] **Step 8: Browser acceptance**

Verify empty-project manual add, background switching, optional video overlay, two simultaneous components, separate selection, drag, four-corner scale, text edit, and zIndex. Confirm there is no editor/lab page switch and no extra document scroll.

- [ ] **Step 9: Verify and commit**

Run: `npm run verify`

Expected: tests, typecheck, build, and browser acceptance pass.

Commit: `feat: unify caption editing workspace`

---

### Task 10: Finish Scrollable Multi-Track Timeline

**Files:**
- Modify: `motion-demo-system/src/editor/Timeline.tsx`
- Modify: `motion-demo-system/src/editor/Timeline.test.ts`
- Create: `motion-demo-system/src/editor/timelineMath.ts`
- Create: `motion-demo-system/src/editor/timelineMath.test.ts`
- Modify: `motion-demo-system/src/index.css`

**Interfaces:**
- Consumes: formal effects, cues, `updateEffect()`, `setCurrentFrame()`.
- Produces:

```ts
export interface TimelineViewport {
  pixelsPerFrame: number;
  scrollLeft: number;
  trackScrollTop: number;
}

export function dragTimelineEffect(
  mode: 'move' | 'start' | 'end',
  effect: MotionEffectInstance,
  deltaFrames: number,
  targetTrack: number,
  projectDuration: number,
): EffectUpdate;
```

- [ ] **Step 1: Write timeline math tests**

Cover move/start/end clamps, first/last frame, zero-length rejection, vertical track conversion, zoom anchor stability, and screen-X to frame with nonzero `scrollLeft`.

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm run test -- src/editor/timelineMath.test.ts src/editor/Timeline.test.ts`

Expected: FAIL until scroll- and zoom-aware math exists.

- [ ] **Step 3: Implement pure timeline math**

Keep pointer event code thin. All frame and track calculations use pure functions and integer outputs.

- [ ] **Step 4: Render subtitle and formal tracks**

Subtitle cue blocks are read-only. Formal effect blocks support selection, whole-block move, start/end resize, and vertical track movement. Remove every draft style and branch. Add an eye to every left-side track label. Hidden-track IDs live only in editor state; `ProjectComposition` export input always receives every formal effect.

- [ ] **Step 5: Add two-axis scrolling and zoom**

Use one horizontal scroll container for ruler and blocks, one vertical scroll region for tracks, sticky ruler at top, sticky labels at left, and `−` / `+` / reset zoom buttons fixed at the timeline upper-right in the old CaptionForge visual style. Draw adaptive major/minor time ticks and a current-frame playhead using the same scale and scroll offset as blocks. Zoom must preserve the frame under the pointer or viewport center. Remove every timeline-height range input. Add a horizontal resize separator at the timeline top: pointer drag clamps height between 140px and 60% of workspace height; double-click restores the default height. Apply shared Firefox and WebKit dark scrollbar tokens to component library, inspector, timeline, and dialogs.

- [ ] **Step 6: Browser acceptance**

Create enough tracks for vertical overflow and zoom far enough for horizontal overflow. Verify upper-right zoom controls, resize separator bounds and double-click reset, absence of a height slider, sticky labels/ruler, time tick and playhead alignment, subtitle read-only behavior, editor-only eye visibility, export retaining hidden tracks, themed scrollbars, and that scrolling/resizing does not mutate project data.

- [ ] **Step 7: Verify and commit**

Run: `npm run verify`

Commit: `feat: add scrollable multitrack timeline`

---

### Task 11: Generate the External Skill and Internal Manifest

**Files:**
- Create: `motion-demo-system/scripts/generate-skill.mjs`
- Create: `motion-demo-system/scripts/generate-skill.test.ts`
- Create: `motion-demo-system/scripts/check-skill.mjs`
- Create: `motion-demo-system/scripts/validate-agent-draft.mjs`
- Create: `motion-demo-system/skill/SKILL.md`
- Create: `motion-demo-system/skill/references/project-schema.md`
- Create: `motion-demo-system/skill/references/composition-guidelines.md`
- Create: generated `motion-demo-system/skill/references/components/*.md`
- Create: generated `motion-demo-system/src/agent/generated/componentManifest.json`
- Modify: `motion-demo-system/package.json`

**Interfaces:**
- Consumes: `effectRegistry`, `AgentDraftSchema`, approved selection metadata.
- Produces deterministic skill files and an internal manifest with `libraryVersion: 1`.

- [ ] **Step 1: Write generator failure tests**

Assert every registered AI-approved component has exactly one reference, every reference path exists, only `agentEditable` content props are exposed, generation is byte-stable, and a second run yields no Git diff.

- [ ] **Step 2: Run and confirm RED**

Run: `npm run test -- scripts/generate-skill.test.ts`

Expected: FAIL because generator and artifacts do not exist.

- [ ] **Step 3: Implement deterministic generation**

Sort categories, IDs, properties, and JSON keys. Root `SKILL.md` contains selection summaries and reference paths only. Component references contain exact fields, defaults, capacities, constraints, and one valid JSON example.

- [ ] **Step 4: Add scripts**

```json
{
  "generate:skill": "node scripts/generate-skill.mjs",
  "check:skill": "node scripts/check-skill.mjs"
}
```

`check:skill` regenerates in memory/temp storage, compares committed artifacts, and exits 1 with component IDs on drift.

- [ ] **Step 5: Reuse application validation externally**

Keep command shape:

```powershell
node scripts/validate-agent-draft.mjs path\to\draft.json path\to\agent-input.json
```

Exit 0 for valid input; exit 1 with exact JSON paths for errors.

- [ ] **Step 6: Verify and commit**

Run: `npm run generate:skill && npm run check:skill && npm run verify`

Commit: `feat: generate motion component skill`

---

### Task 12: Add AI Orchestration Core and Toolbar Flow

**Files:**
- Create: `motion-demo-system/src/llm/provider.ts`
- Create: `motion-demo-system/src/llm/orchestrate.ts`
- Create: `motion-demo-system/src/llm/orchestrate.test.ts`
- Create: `motion-demo-system/src/editor/AiOrchestrationDialog.tsx`
- Create: `motion-demo-system/src/editor/AiOrchestrationDialog.test.tsx`
- Modify: `motion-demo-system/src/editor/Toolbar.tsx`
- Modify: `motion-demo-system/src/store/editorStore.ts`

**Interfaces:**

```ts
export interface LlmProvider {
  complete(request: {
    system: string;
    messages: Array<{role: 'user' | 'assistant'; content: string}>;
    signal?: AbortSignal;
  }): Promise<string>;
}

export type OrchestrationResult =
  | { ok: true; effects: MotionEffectInstance[]; warnings: DraftDiagnostic[]; attempts: 1 | 2 }
  | { ok: false; errors: DraftDiagnostic[]; attempts: 1 | 2 };
```

- [ ] **Step 1: Write provider-independent orchestration tests**

Use a fake provider. Cover first-pass success, invalid JSON, one repair success, second failure, unknown component, incompatible library version, abort, and preservation of existing effects until success.

- [ ] **Step 2: Run and confirm RED**

Run: `npm run test -- src/llm/orchestrate.test.ts`

Expected: FAIL because orchestration does not exist.

- [ ] **Step 3: Implement two-stage context loading**

First request receives subtitles, canvas data, user style text, and selection summaries. Parse selected IDs, then include only those generated references in the final JSON request. Accept strict JSON only.

- [ ] **Step 4: Implement one repair attempt**

On hard validation failure, send the invalid JSON plus structured path/code/message errors once. Never perform a third completion. Return effects but do not write store state inside `orchestrate()`.

- [ ] **Step 5: Add toolbar dialog**

Show subtitle count, `libraryVersion`, selected model profile, style input, progress, cancel, errors, and warnings. On success call `replaceEffects()` once. During generation keep old effects visible.

- [ ] **Step 6: Browser acceptance with fake provider**

Verify success replaces the timeline automatically; first failure repairs; final failure leaves project unchanged; cancellation leaves project unchanged.

- [ ] **Step 7: Verify and commit**

Run: `npm run verify`

Commit: `feat: orchestrate effects from subtitles`

---

### Task 13: Add Tauri Secure Provider and Component-Skill Sync

**Files:**
- Create: `motion-demo-system/src-tauri/Cargo.toml`
- Create: `motion-demo-system/src-tauri/tauri.conf.json`
- Create: `motion-demo-system/src-tauri/capabilities/default.json`
- Create: `motion-demo-system/src-tauri/src/main.rs`
- Create: `motion-demo-system/src-tauri/src/llm.rs`
- Create: `motion-demo-system/src-tauri/src/skill_sync.rs`
- Create: `motion-demo-system/src/tauri/bridge.ts`
- Create: `motion-demo-system/src/llm/tauriProvider.ts`
- Create: `motion-demo-system/src/skill/sync.ts`
- Create: `motion-demo-system/src/skill/sync.test.ts`
- Create: `motion-demo-system/src/editor/SkillSyncDialog.tsx`
- Modify: `motion-demo-system/src/editor/Toolbar.tsx`
- Modify: `motion-demo-system/package.json`

**Interfaces:**

```ts
export interface NativeBridge {
  saveApiKey(key: string): Promise<void>;
  hasApiKey(): Promise<boolean>;
  completeOpenAiCompatible(request: NativeCompletionRequest): Promise<string>;
  scanComponentSkill(): Promise<ComponentSkillDiff>;
  applyComponentSkill(proposal: ApprovedSkillProposal): Promise<void>;
  exportComponentSkill(destination: string): Promise<void>;
}
```

- [x] **Step 1: Scaffold minimal Tauri 2 shell**

Pin mutually compatible Tauri 2 packages in lockfiles. Enable only required dialog, native commands, and later sidecar permissions. Do not grant arbitrary shell execution or unrestricted filesystem scopes.

- [x] **Step 2: Add secure-key contract tests**

Pin `keyring = { version = "=4.2.0", features = ["v1"] }`. Rust tests verify Key never appears in serialized settings, errors, command args, or logs. Store service `motioncaption.llm` and account `openai-compatible-api-key` through the native credential store; on Windows this is Windows Credential Manager. Frontend receives only `hasApiKey`.

- [x] **Step 3: Implement native OpenAI-compatible request**

Native code reads the Key internally, applies `Authorization: Bearer`, sends Base URL/model/messages, enforces a response-size cap and timeout, and returns text only. Redact auth headers from every error.

- [x] **Step 4: Write skill-diff tests**

Cover added source file, removed registry ID, changed props/version, unchanged component, unregistered component, and rejected/unreviewed AI metadata. Applying a proposal uses temp files plus atomic rename and preserves old generated files on failure.

- [x] **Step 5: Implement sync dialog**

Top-level `同步组件 Skill` opens added/changed/removed/uncertain groups. LLM proposals are editable but unchecked by default. Only confirmed items call `applyComponentSkill()`, then `generate:skill` and `check:skill` must pass.

- [x] **Step 6: Export installable skill**

Export a folder or ZIP containing `SKILL.md` and `references/`, with no API Key, local paths, source code, or project files.

- [ ] **Step 7: Desktop acceptance**

Set a test Key, restart app, verify only `hasApiKey=true`; run a mocked native completion; detect a temporary unregistered component; reject proposal and confirm old skill unchanged; approve a safe proposal in a fixture workspace.

- [ ] **Step 8: Verify and commit**

Run: `npm run verify && npm run tauri build`

Commit: `feat: secure ai and skill synchronization`

---

### Task 14: Add Node/Remotion Transparent MOV Sidecar

**Files:**
- Create: `motion-demo-system/sidecar/package.json`
- Create: `motion-demo-system/sidecar/src/render.ts`
- Create: `motion-demo-system/sidecar/src/protocol.ts`
- Create: `motion-demo-system/sidecar/src/render.test.ts`
- Create: `motion-demo-system/src/export/nodeSidecarBackend.ts`
- Create: `motion-demo-system/src/export/nodeSidecarBackend.test.ts`
- Modify: `motion-demo-system/src-tauri/tauri.conf.json`
- Modify: `motion-demo-system/src-tauri/capabilities/default.json`
- Modify: `motion-demo-system/src-tauri/src/main.rs`
- Modify: `motion-demo-system/src/editor/Toolbar.tsx`
- Modify: `motion-demo-system/package.json`

**Interfaces:**
- Consumes: `RenderBackend`, serialized `MotionProject`, `ProjectComposition`.
- Produces: transparent ProRes 4444 MOV at a user-selected path.

```ts
type RenderCommand = {
  requestId: string;
  projectPath: string;
  outputPath: string;
  format: 'mov-prores-4444';
};
```

- [ ] **Step 1: Write a sidecar render spike test**

Install `@remotion/renderer`, `@remotion/bundler`, and `remotion` at exactly `4.0.518`. Render `t1-05`, `t2-02`, and `t7-06` from the same composition to ProRes 4444 MOV; fail the task if `t7-06` arcs are absent.

- [ ] **Step 2: Implement narrow JSON-lines protocol**

Sidecar accepts validated file paths from Tauri, not raw shell fragments. Emit progress, completion, failure, and cancellation records keyed by `requestId`. No arbitrary command field exists.

- [ ] **Step 3: Package sidecar with restricted Tauri permission**

Declare one named external binary and allow only its fixed render/cancel protocol. Do not enable generic command execution.

- [ ] **Step 4: Implement export UI and cancellation**

Toolbar export asks for destination, renders formal effects only, reports progress, and cancels cleanly. Temporary files use a task-specific directory and are removed on failure/cancel; never overwrite an existing destination without an explicit save-dialog choice.

- [ ] **Step 5: Visual and Alpha acceptance**

Compare Player and MOV at entrance, mid-entrance, stable, and pre-end frames for T1/T2/T7. Composite over white, black, and magenta; verify no opaque fill, black fringe, missing SVG, font shift, gradient loss, or zIndex mismatch.

- [ ] **Step 6: Target-editor acceptance**

Import the MOV into the user's target editing software and record playback, duration, resolution, frame rate, and Alpha results.

- [ ] **Step 7: Verify and commit**

Run: `npm run verify && npm run tauri build`

Commit: `feat: export transparent remotion movies`

---

### Task 15: End-to-End Acceptance and Cutover

**Files:**
- Create: `docs/migration/end-to-end-acceptance.md`
- Modify product title/config only after acceptance passes.

**Interfaces:**
- Consumes: Tasks 8–14.
- Produces: user-verifiable evidence for retiring the old CaptionForge checkout.

- [ ] **Step 1: Test empty manual workflow**

Without video or subtitles, add two components, edit content/transform/time/track/zIndex, switch checkerboard/dark backgrounds, save, reopen, and export transparent MOV.

- [ ] **Step 2: Test video/subtitle manual workflow**

Load a real video and Chinese SRT, confirm merged preview and read-only subtitle track, create vertical/horizontal timeline overflow, scroll/zoom, and verify frame alignment.

- [ ] **Step 3: Test internal AI orchestration**

Use a configured OpenAI-compatible endpoint. Confirm subtitles and skill manifest produce only registered IDs; verify direct replacement, one repair, final-failure no-op, and no secret leakage.

- [ ] **Step 4: Test external skill workflow**

Export/install the skill in another Agent tool, generate JSON, validate it externally, import it, and verify the same resulting effects.

- [ ] **Step 5: Test skill synchronization**

Add one fixture component through generated code, run `同步组件 Skill`, review metadata, regenerate artifacts, and verify version mismatch behavior with an older JSON.

- [ ] **Step 6: Run all gates**

Run: `npm run generate:skill && npm run check:skill && npm run verify && npm run tauri build`

Expected: all commands exit 0 and the acceptance document contains no unexplained failure.

- [ ] **Step 7: User cutover decision**

Only after user approval, unify the product title as CaptionForge and mark the old project archived. Never delete the old directory, RAR backup, or `start.bat`.

Commit: `chore: complete captionforge migration`

---

## Self-Review Result

- Spec coverage: unified workspace, optional video/subtitles, manual-first editing, direct Agent replacement, timeline two-axis scrolling, generated skill, AI orchestration, skill synchronization, secure key storage, sidecar export, and cutover are assigned to Tasks 8–15.
- WIP preservation: Task 8 consumes current uncommitted Task 8 work; Task 9 retains useful coordinate/selection code and removes rejected draft UI. No blanket reset or cleanup is permitted.
- Type consistency: `replaceEffects()` is introduced before UI/AI consumers; generated manifest exists before orchestration; native provider exists before live AI and skill-sync acceptance; sidecar continues the existing `RenderBackend` boundary.
- Failure atomicity: Agent import, skill update, project open, and export all preserve prior user state on failure.
- Security: secrets remain native; model output is data; Tauri scopes and sidecar commands are narrow.
