# Agent Draft JSON Schema

Produce one strict JSON object. Unknown fields are rejected.

- Root: `kind` is exactly `captionforge.agent-draft`; `schemaVersion` and `componentLibraryVersion` are exactly `1`; `scenes` is an array; `cues` is an optional array of subtitle cues.
- Scene: exactly `sceneId: string`, `sourceCueIds: non-empty string[]`, and `components: array`.
- `sourceCueIds` values MUST be copied **verbatim** from the `cueId` values in the supplied Agent Input JSON (the SRT parser numbers cues as `cue-1`, `cue-2`, … `cue-N`, 1-based, no zero-padding). Do NOT renumber, re-derive, or zero-pad — an invented id such as `cue-0001` fails import with "Unknown source cue". The importer resolves each id against the parsed SRT cues to ground every text/number/unit claim, so the draft must reference the same ids.
- `cues` (optional, REQUIRED for self-contained drafts): a **verbatim copy** of the `cues` list from the supplied Agent Input JSON. Each entry keeps its `cueId`, `text`, `startMs`, and `endMs` unchanged. When present, import rebuilds the project's subtitle track from this list and auto-extends the project duration, so no prior SRT import and no loaded video are needed. Do not trim, reorder, or alter entries.
- Component: exactly `componentId: string`, `componentVersion: number`, `role: string`, `content: object`, and optional `placementPreset`.
- List items in components that support per-item timing may additionally carry an optional numeric `at` field (seconds, relative to the scene's earliest cited cue start) — see each component reference's "Per-item timing" section. Other unknown fields inside items are still rejected.
- Placement preset, when present: `auto`, `left-top`, `left-center`, `left-bottom`, `right-top`, `right-center`, `right-bottom`, or `full-width`.
- **Multi-track layering:** a scene may hold several `components` that play simultaneously over the cited cue span — each becomes its own effect on its own track. Different scenes may also cite the same or overlapping cue spans to stack layers over one moment. When two effects share a moment, spread them to different placement zones (e.g. `left-top` + `right-bottom`) and give each a distinct `role`; colliding declared footprints produce advisory warnings, not errors.
- Component-specific required fields, versions, list capacities, and locked fields are enforced after structural schema parsing.

## Minimal valid JSON

```json
{
  "componentLibraryVersion": 1,
  "kind": "captionforge.agent-draft",
  "scenes": [
    {
      "components": [],
      "sceneId": "scene-1",
      "sourceCueIds": [
        "cue-1"
      ]
    }
  ],
  "schemaVersion": 1
}
```

The `cues` field is optional. A self-contained draft (so the user can import it directly, without importing the SRT first) additionally copies the full cue list from the Agent Input JSON:

```json
{
  "componentLibraryVersion": 1,
  "kind": "captionforge.agent-draft",
  "scenes": [],
  "schemaVersion": 1,
  "cues": [
    { "cueId": "cue-1", "text": "第一句", "startMs": 0, "endMs": 2480 }
  ]
}
```
