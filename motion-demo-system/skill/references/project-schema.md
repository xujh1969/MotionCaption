# Agent Draft JSON Schema

Produce one strict JSON object. Unknown fields are rejected.

- Root: `kind` is exactly `captionforge.agent-draft`; `schemaVersion` and `componentLibraryVersion` are exactly `1`; `scenes` is an array.
- Scene: exactly `sceneId: string`, `sourceCueIds: non-empty string[]`, and `components: array`.
- Component: exactly `componentId: string`, `componentVersion: number`, `role: string`, `content: object`, and optional `placementPreset`.
- Placement preset, when present: `auto`, `left-top`, `left-center`, `left-bottom`, `right-top`, `right-center`, `right-bottom`, or `full-width`.
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
