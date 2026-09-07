# Composition Guidelines

- Use only component IDs listed in the root index, then read the selected component references.
- Every scene must cite one or more existing cue IDs in chronological order. Use those cues as the only source for text, numbers, units, list items, and claims.
- Populate all required editable content fields. Never put style, color, typography, coordinates, scale, or other locked component properties in `content`.
- Keep a scene to at most two visual subjects when possible. Duplicate semantic roles and declared footprint collisions produce warnings.
- Do not overlap a component declared exclusive with another component.
- Respect each component's exact version and list capacity. Use arrays of objects for list content, never stringified JSON.
- Validate the completed files with `node scripts/validate-agent-draft.mjs <draft.json> <agent-input.json>`; errors block import, while warnings are advisory.
