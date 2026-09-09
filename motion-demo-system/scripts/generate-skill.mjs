import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptRoot = dirname(fileURLToPath(import.meta.url));
const defaultProjectRoot = resolve(scriptRoot, '..');
const componentReferencePrefix = 'skill/references/components/';

const compareText = (left, right) => left.localeCompare(right, 'en');
const sortedEntries = (record) => Object.entries(record).sort(([left], [right]) => compareText(left, right));

const sortJson = (value) => {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(sortedEntries(value).map(([key, child]) => [key, sortJson(child)]));
};

const json = (value, indent = 0) => JSON.stringify(sortJson(value), null, indent);

const parseDefault = (prop) => {
  if (prop.type !== 'list' || typeof prop.default !== 'string') return prop.default;
  try {
    const parsed = JSON.parse(prop.default);
    if (!Array.isArray(parsed)) return prop.default;
    const editable = new Set(prop.agentEditableItemFields ?? []);
    return parsed.map((item) => Object.fromEntries(
      sortedEntries(item).filter(([key]) => editable.has(key)),
    ));
  } catch {
    return prop.default;
  }
};

const approvedDefinitions = (definitions) => definitions
  .filter(({ selection }) => selection.suitableFor.length > 0 && selection.avoidFor.length > 0)
  .sort((left, right) => compareText(left.category, right.category) || compareText(left.id, right.id));

const capacityText = ({ minItems, maxItems }) => {
  if (minItems === undefined && maxItems === undefined) return 'scalar';
  if (minItems === maxItems) return `${minItems} items exactly`;
  if (minItems === undefined) return `up to ${maxItems} items`;
  if (maxItems === undefined) return `at least ${minItems} items`;
  return `${minItems}-${maxItems} items`;
};

const fieldType = (prop) => {
  if (prop.type !== 'list') return prop.type === 'color' ? 'string' : prop.type;
  const editable = new Set(prop.agentEditableItemFields ?? []);
  const fields = (prop.legacy.listFields ?? [])
    .filter(({ key }) => editable.has(key))
    .map(({ key, label }) => (label && label !== key ? `${key}: ${label} (string)` : `${key}: string`))
    .sort(compareText)
    .join(', ');
  return `array of objects { ${fields} }`;
};

// Per-field text budgets for heading/body fields that wrap into multiple lines without
// auto-shrink. Overrunning them breaks the layout (extra wrapped lines collide with the
// rows below), so the skill must state the cap explicitly.
const TEXT_BUDGETS = {
  't1-02:quoteText': {
    maxChars: 20,
    lines: 2,
    why: 'the quote renders at ~46px wrapped inside 490px — over 20 CJK characters it wraps past 2 lines and crowds the note below',
  },
  't1-02:noteText': { maxChars: 34, lines: 2, why: 'the note renders at ~25px wrapped inside 490px — over 34 CJK characters it wraps past 2 lines' },
  't1-09:bodyText': {
    maxChars: 20,
    lines: 2,
    why: 'the body area is fixed at ~150px tall — over 20 CJK characters it wraps past 2 lines and overlaps the note below',
  },
};

const fieldConstraints = (prop, definition, key = '') => {
  const constraints = [];
  if (prop.type === 'number') {
    if (prop.min !== undefined) constraints.push(`minimum ${prop.min}`);
    if (prop.max !== undefined) constraints.push(`maximum ${prop.max}`);
  }
  if (prop.type === 'list') {
    constraints.push(capacityText(definition.selection));
    if (prop.legacy.listFields?.length) constraints.push('all listed item fields are required strings');
  }
  if (prop.type === 'text') {
    const budget = TEXT_BUDGETS[`${definition.id}:${key}`];
    if (budget) {
      constraints.push(
        `MUST be ≤ ${budget.maxChars} CJK characters (fits ${budget.lines} wrapped lines) — ${budget.why}`,
      );
      constraints.push(
        'MUST NOT contain sentence punctuation (，。、；：？！,.;:!?) — split parallel points into separate scenes or move the full sentence to a desc/note field',
      );
    }
  }
  return constraints.length ? constraints.join('; ') : 'none beyond the declared type';
};

const contentDefinition = (definition) => Object.fromEntries(
  sortedEntries(definition.props)
    .filter(([, prop]) => prop.agentEditable)
    .map(([key, prop]) => [key, {
      default: parseDefault(prop),
      required: prop.required,
      role: prop.role,
      semanticRole: prop.semanticRole,
      type: prop.type,
      constraints: fieldConstraints(prop, definition, key),
      ...(prop.type === 'number' && prop.max !== undefined ? { max: prop.max } : {}),
      ...(prop.type === 'number' && prop.min !== undefined ? { min: prop.min } : {}),
      ...(prop.type === 'list' ? {
        ...(definition.selection.maxItems === undefined ? {} : { maxItems: definition.selection.maxItems }),
        ...(definition.selection.minItems === undefined ? {} : { minItems: definition.selection.minItems }),
        itemFields: (prop.legacy.listFields ?? [])
          .filter(({ key }) => prop.agentEditableItemFields?.includes(key))
          .map(({ key }) => ({ key, required: true, type: 'string' }))
          .sort((left, right) => compareText(left.key, right.key)),
      } : {}),
    }]),
);

// 组件引用示例：给支持条目时机（at）的列表 props 注入演示值（不等距，避免教模型编均匀节奏）。
const AT_DEMO = [0, 3.5, 7.2, 9.8];
const componentExample = (definition) => ({
  componentId: definition.id,
  componentVersion: definition.version,
  content: Object.fromEntries(
    sortedEntries(definition.props)
      .filter(([, prop]) => prop.agentEditable)
      .map(([key, prop]) => {
        let value = parseDefault(prop);
        if (atTimingProps.has(`${definition.id}:${key}`) && Array.isArray(value)) {
          value = value.map((item, i) => ({ ...item, at: AT_DEMO[i % AT_DEMO.length] }));
        }
        return [key, value];
      }),
  ),
  placementPreset: definition.layout.preferredZones[0] ?? 'auto',
  role: definition.selection.semanticFamilies[0] ?? 'body',
});

const renderRootSkill = (definitions) => {
  const groups = new Map();
  for (const definition of definitions) {
    const group = groups.get(definition.category) ?? [];
    group.push(definition);
    groups.set(definition.category, group);
  }
  const sections = [...groups].sort(([left], [right]) => compareText(left, right)).map(([category, items]) => {
    const rows = items.map((definition) => {
      const motion = definition.selection.motion
        ? ` ${definition.selection.motion}`
        : ' —';
      return `| ${definition.id} | ${definition.selection.summary} | ${motion} | ${definition.selection.suitableFor.join(' ')} | ${definition.selection.avoidFor.join(' ')} | [reference](references/components/${definition.id}.md) |`;
    });
    return `## ${category}\n\n| ID | Summary | Motion feel | Use for | Avoid | Details |\n| --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}`;
  });

  return `---
name: motion-caption-components
description: Select existing MotionCaption motion components and produce validated captionforge.agent-draft JSON from subtitle cues. Use for component selection and orchestration, not for creating component code or changing visual styles.
---

# MotionCaption Component Orchestration

Use this skill to select registered components and produce a strict Agent Draft from a supplied Agent Input.

## Workflow

1. **Prepare the Agent Input JSON.** The workflow below expects a supplied Agent Input (subtitle cues with \`cueId\`/\`text\`/\`startMs\`/\`endMs\` plus \`video\` metadata). If you have an SRT file but no Agent Input yet, build one with the script bundled in this skill: run \`node <skill-dir>/scripts/build-agent-input.mjs <captions.srt> [agent-input.json]\` (omit the output path to print JSON to stdout). It mirrors the host parser exactly — cues are numbered \`cue-1\`, \`cue-2\`, … with no zero-padding, empty text blocks still consume an index, and it emits 1920×1080 @ 30 fps metadata by default (override with \`--fps\`, \`--width\`, \`--height\`). **Then scan the subtitles before anything else:** read every cue text and convert Chinese numerals to Arabic wherever they express a quantity (一百五十 → 150, 百分之二十 → 20%, 八点五 → 8.5, 两千 → 2000); leave non-quantity words untouched (第一 / 三思 / 十分感谢 stay as-is). All later steps — scene planning, number grounding, and display copy — must work from this converted reading, so every quantity you write in \`content\` is Arabic and traceable to a cue.
2. Read [the project schema](references/project-schema.md) and [composition guidelines](references/composition-guidelines.md).
3. **Plan structure before selection.** In 1-2 sentences divide the cue list into scene roles (opening / chapter title, grouped parallel points, single metric emphasis, warning / conclusion, closing). When several consecutive cues each state one parallel point (2-6 lines), merge them into ONE list / card / flow scene that cites all of those cue ids — never emit one title scene per line.
4. **Reuse is your judgment call — decide by content shape, not by fixed counts.** There is no blanket ban on reusing a component in adjacent scenes or across the timeline. When a listable group of parallel points is larger than 3, express the whole group in ONE array-capable list / card / flow component (e.g. fx-04, fx-06, fx-07, t5-*, t7-05) — never emit the same component repeatedly, once per point. When a role covers 3 points or fewer, or the scenes genuinely differ in structure, reusing the same component is fine. The only anti-pattern is one favorite component carrying nearly every scene of the video.
5. **Layer when one moment carries more than one message.** A scene may hold 2-3 \`components\` that play together over the same cue interval — each lands on its own track, so simultaneous effects are supported. Separate scenes may also cite the same cue span to stack layers. Spread each layer to a different screen zone via \`placementPreset\` (e.g. upper title + lower metric), keep each layer's \`role\` distinct, and stay within 2-3 layers per moment. See the composition guidelines for the full layering rules.
6. Shortlist ids for each planned role using the **Quick navigation by cue shape** table below, then read only the references for the selected ids; do not load unrelated component references.
7. Populate every required \`content\` field from the source cues. Never supply visual style or layout property fields. **Cue ID format:** copy each entry in \`sourceCueIds\` **verbatim** from the \`cueId\` values of the supplied Agent Input JSON (the SRT parser numbers cues \`cue-1\`, \`cue-2\`, … with no zero-padding). Do NOT renumber, re-derive from the SRT, or zero-pad — a made-up id such as \`cue-0001\` fails import with "Unknown source cue". **Write Arabic numerals in every display field.** The importer does NOT numeric-check \`content\`, so grounding is entirely your responsibility: write the Arabic form (\`150\` / \`20%\` / \`2 个\`) even when the cue spells the number in Chinese, and never invent a number or unit that does not appear in the (converted) cue text. **Write short display copy:** heading fields (titleText / topText / title1 / title2 / tagText / kickerText / quoteText / bodyText / descText and list labels/names) are rewrites, not transcripts — keep them concise (≈ ≤ 12 CJK characters per single-line heading; multi-line wrap fields such as t1-02 quoteText and t1-09 bodyText are hard-capped at 20 CJK characters), NEVER put sentence punctuation (，。、；：？！,.;:!?) inside a heading — separate two short clauses with a space or · or split them across scenes, prefer numeric identifiers ("1./2./3." or "01/02") over 其一/其二, and never paste a long cue sentence into one heading field. Numeric metric fields (e.g. fx-04 items[].val) take a number or percent like "80" / "80%", never descriptive words. See the composition guidelines for the full display-copy rules. **Per-item appearance timing:** when a list / card / flow / timeline component's items each correspond to a different cited cue, give every such item a numeric \`at\` (seconds relative to the scene's earliest cited cue start) so each row appears exactly when its cue is spoken — this applies to EVERY array-bearing component, including the whole \`t4-*\` flow-card family (t4-01…t4-09); a t4-03 multi-step scene whose steps are narrated by different cues is INCOMPLETE without per-step \`at\` values — see the "Per-item timing" section of the component reference for the formula and a worked example.
8. **Embed the subtitle track:** add a top-level \`cues\` array that is a **verbatim copy** of the \`cues\` list from the supplied Agent Input JSON (each entry keeps its \`cueId\`, \`text\`, \`startMs\`, \`endMs\`). Do not trim, reorder, or alter entries. This makes the draft self-contained: importing it rebuilds the subtitle track and auto-extends the project duration, so the user does NOT need to import the SRT or load a video beforehand.
9. Save strict JSON, then validate it with the standalone validator bundled in this skill — it lives in the same folder that holds SKILL.md, under \`scripts/validate-agent-draft.mjs\`, and needs no project files, only Node. Run \`node <skill-dir>/scripts/validate-agent-draft.mjs <draft.json> <agent-input.json>\`, where \`<skill-dir>\` is the directory that contains this SKILL.md (resolve it as an absolute path so the command works on any machine). Return the draft only when it exits 0.

## Quick navigation by cue shape

Use this table to shortlist component ids before reading the per-category index below. The table is a shortcut, not a complete mapping — after shortlisting, confirm against the category tables.

| The cue / material is… | Look first at |
| --- | --- |
| Opening / chapter title | fx-01, fx-02, fx-05, t1-01, t1-06, t2-02 |
| Quote / remark / warning / conclusion | t1-02, t1-09, t2-01, fx-03 |
| Single number / metric | t3-01, t3-02, fx-09, t6-03, t7-06 |
| Several parallel points (merge into one scene) | fx-04, fx-06, fx-07, t5-01, t5-02, t5-03, t5-04, t5-05, t5-06, t7-05 |
| Process / steps / timeline | t4-01, t4-02, t4-03, t4-06, t4-07, t6-01, t6-02, t6-04, t6-05, t6-06, t6-07, t6-08 |
| Chart / share / comparison | t3-03, t7-01, t7-02, t7-03, t7-04, fx-08 |

${sections.join('\n\n')}
`;
};

// 支持条目级出现时机（at，秒）的列表 props（组件ID:propKey）。与渲染器 atFrames 接入范围保持一致。
const atTimingProps = new Set([
  'fx-04:items', 'fx-06:steps', 'fx-07:cards', 'fx-08:bars',
  't3-04:rows', 't3-05:items', 't3-06:groups',
  't4-01:steps', 't4-02:nodes', 't4-03:items', 't4-04:items', 't4-05:items', 't4-06:items',
  't4-07:items', 't4-08:items', 't4-09:items',
  't5-01:items', 't5-02:items', 't5-03:items', 't5-04:items', 't5-05:cards', 't5-06:items',
  't6-01:nodes', 't6-02:nodes', 't6-05:nodes', 't6-06:steps', 't6-07:items', 't6-08:items',
  't7-01:items', 't7-02:nodes', 't7-03:segs', 't7-05:cards',
  't7-07:items', 't7-08:items', 't7-09:items', 't7-11:items',
]);

const renderComponentReference = (definition) => {
  const fields = sortedEntries(contentDefinition(definition)).map(([key, prop]) => (
    `- \`${key}\`: ${fieldType(definition.props[key])}; required: ${prop.required ? 'yes' : 'no'}; default: \`${json(prop.default)}\`; semantic role: ${prop.semanticRole}; constraints: ${prop.constraints}.`
  ));
  const listProps = sortedEntries(contentDefinition(definition))
    .filter(([key]) => atTimingProps.has(`${definition.id}:${key}`))
    .map(([key]) => key);
  const timingNote = listProps.length
    ? `\n## Per-item timing (\`at\`)\n\nEach item in ${listProps.map((key) => `\`${key}\``).join(', ')} carries a numeric \`at\` field — the item's appearance time in **seconds, relative to the scene's earliest cited cue start**. Items appear at their \`at\` time instead of the default even rhythm.\n\n- **Every item that corresponds to one cited cue MUST get an \`at\`.** Compute it from the cue start times: \`at = (cueStartMs − earliestCitedCueStartMs) / 1000\`, rounded to 1 decimal. Include every cue you used in the scene's \`sourceCueIds\`.\n- Worked example: a scene cites cues starting at 9800ms / 15600ms / 21400ms (earliest = 9800) and its ${listProps[0]} rows visualize them → \`at\` values are \`0\`, \`5.8\`, \`11.6\`. The first item is \`0\`, and each later item appears exactly when its cue begins to be spoken.\n- Omit \`at\` ONLY for an item that is a general summary not tied to any single cue (rare). Do NOT leave \`at\` out of items just to be safe, and do NOT invent evenly spaced values that no cue supports.\n- \`at\` must be a number ≥ 0 (never a string, never negative, never beyond the scene duration). The example JSON below shows the field shape — replace the demo values with cue-derived ones.\n`
    : '';
  return `# ${definition.id} - ${definition.selection.summary}

- Component version: ${definition.version}
- Use for: ${definition.selection.suitableFor.join(' ')}
- Avoid: ${definition.selection.avoidFor.join(' ')}
- Motion feel: ${definition.selection.motion ?? '—'}
- Capacity: ${capacityText(definition.selection)}

## Editable content

Only the following keys may appear in \`content\`. All style and component layout properties are locked and must not be supplied by an Agent.

${fields.length ? fields.join('\n') : '- No Agent-editable content fields.'}
${timingNote}
## Component JSON

This is legal JSON for the component object. Replace content values only with claims grounded in the selected source cues.

\`\`\`json
${json(componentExample(definition), 2)}
\`\`\`
`;
};

const projectSchemaExample = {
  kind: 'captionforge.agent-draft',
  schemaVersion: 1,
  componentLibraryVersion: 1,
  scenes: [{
    sceneId: 'scene-1',
    sourceCueIds: ['cue-1'],
    components: [],
  }],
};

const renderProjectSchema = (agentDraftSchema) => {
  const parsed = agentDraftSchema.safeParse(projectSchemaExample);
  if (!parsed.success) throw new Error('AgentDraftSchema rejected the generated project-schema example.');
  return `# Agent Draft JSON Schema

Produce one strict JSON object. Unknown fields are rejected.

- Root: \`kind\` is exactly \`captionforge.agent-draft\`; \`schemaVersion\` and \`componentLibraryVersion\` are exactly \`1\`; \`scenes\` is an array; \`cues\` is an optional array of subtitle cues.
- Scene: exactly \`sceneId: string\`, \`sourceCueIds: non-empty string[]\`, and \`components: array\`.
- \`sourceCueIds\` values MUST be copied **verbatim** from the \`cueId\` values in the supplied Agent Input JSON (the SRT parser numbers cues as \`cue-1\`, \`cue-2\`, … \`cue-N\`, 1-based, no zero-padding). Do NOT renumber, re-derive, or zero-pad — an invented id such as \`cue-0001\` fails import with "Unknown source cue". The importer resolves each id against the parsed SRT cues to ground every text/number/unit claim, so the draft must reference the same ids.
- \`cues\` (optional, REQUIRED for self-contained drafts): a **verbatim copy** of the \`cues\` list from the supplied Agent Input JSON. Each entry keeps its \`cueId\`, \`text\`, \`startMs\`, and \`endMs\` unchanged. When present, import rebuilds the project's subtitle track from this list and auto-extends the project duration, so no prior SRT import and no loaded video are needed. Do not trim, reorder, or alter entries.
- Component: exactly \`componentId: string\`, \`componentVersion: number\`, \`role: string\`, \`content: object\`, and optional \`placementPreset\`.
- List items in components that support per-item timing may additionally carry an optional numeric \`at\` field (seconds, relative to the scene's earliest cited cue start) — see each component reference's "Per-item timing" section. Other unknown fields inside items are still rejected.
- Placement preset, when present: \`auto\`, \`left-top\`, \`left-center\`, \`left-bottom\`, \`right-top\`, \`right-center\`, \`right-bottom\`, or \`full-width\`.
- **Multi-track layering:** a scene may hold several \`components\` that play simultaneously over the cited cue span — each becomes its own effect on its own track. Different scenes may also cite the same or overlapping cue spans to stack layers over one moment. When two effects share a moment, spread them to different placement zones (e.g. \`left-top\` + \`right-bottom\`) and give each a distinct \`role\`; colliding declared footprints produce advisory warnings, not errors.
- Component-specific required fields, versions, list capacities, and locked fields are enforced after structural schema parsing.

## Minimal valid JSON

\`\`\`json
${json(parsed.data, 2)}
\`\`\`

The \`cues\` field is optional. A self-contained draft (so the user can import it directly, without importing the SRT first) additionally copies the full cue list from the Agent Input JSON:

\`\`\`json
{
  "componentLibraryVersion": 1,
  "kind": "captionforge.agent-draft",
  "scenes": [],
  "schemaVersion": 1,
  "cues": [
    { "cueId": "cue-1", "text": "第一句", "startMs": 0, "endMs": 2480 }
  ]
}
\`\`\`
`;
};

const renderCompositionGuidelines = () => `# Composition Guidelines

- Use only component IDs listed in the root index, then read the selected component references.
- Every scene must cite one or more existing cue IDs in chronological order. Use those cues as the only source for text, numbers, units, list items, and claims.
- Populate all required editable content fields. Never put style, color, typography, coordinates, scale, or other locked component properties in \`content\`.
- Keep a scene to at most two visual subjects when possible. Duplicate semantic roles and declared footprint collisions produce warnings.
- Do not overlap a component declared exclusive with another component.
- Respect each component's exact version and list capacity. Use arrays of objects for list content, never stringified JSON.
- Validate the completed files with the standalone validator bundled in this skill (\`scripts/validate-agent-draft.mjs\` next to SKILL.md — run \`node <skill-dir>/scripts/validate-agent-draft.mjs <draft.json> <agent-input.json>\` with \`<skill-dir>\` as the absolute path of the folder that holds SKILL.md); errors block import, while warnings are advisory.

## Structure before selection

- Divide the cue list into scene roles first (opening / chapter title, grouped parallel points, single metric emphasis, warning / conclusion, closing) and pick a component family per role; only then choose a concrete id.
- Prefer merging 2-6 consecutive cues that each state one parallel point into ONE list / card / flow scene (\`fx-04\`, \`fx-06\`, \`fx-07\`, \`t5-*\`, \`t7-05\`) over emitting a single-title scene per line. A merged scene cites every cue it draws from in \`sourceCueIds\`.
- **Sync item entrances to the narration.** In list / card / flow / timeline components (flow cards \`t4-01\` through \`t4-09\`, timeline stages like \`t4-02\`, checklists \`t5-*\`, steps \`t6-*\`, bars \`fx-08\` …), each item that visualizes one cited cue gets a numeric \`at\` = (its cue start − earliest cited cue start) / 1000, 1 decimal. Items then appear exactly when their cue is spoken instead of one uniform sweep. Multi-step progress narratives ("第一步…第二步…", "先…再…最后…") are the strongest case: pick a t4-* flow component and fill every step's \`at\`.
- Reserve single-title components (\`fx-01\`, \`fx-02\`, \`fx-05\`, \`t1-*\`, \`t2-02\`) for openings, chapter turns, and strong emphasis — not for every cue.

## Display copy discipline

- **Rewrite, don't transcribe.** A heading/display field (\`titleText\`, \`topText\`, \`title\`, \`title1\`/\`title2\`, \`tagText\`, \`kickerText\`, \`quoteText\`, \`bodyText\`, \`descText\`, list item \`name\`/\`label\`) is a concise summary of the cue, never the whole sentence pasted in. Prefer keeping the key number/term and dropping filler clauses.
- **Keep single-line heading fields short** — roughly ≤ 12 CJK characters / ≤ 28 ASCII letters. Long heading lines shrink (auto-fit) or collide with the rows below.
- **No sentence punctuation inside a heading field — none at all.** Never write ， 。 、 ； ： ？ ！ , . ; : ? ! in \`titleText\` / \`quoteText\` / \`bodyText\` / \`tagText\` / \`kickerText\` / list \`name\`/\`label\`. Two short clauses are separated by a space or \`·\`, or better, split across two scenes / moved to a \`descText\`/\`noteText\` field. A heading with a comma inside is a symptom that the content belongs in a list / card / flow scene instead.
- **Multi-line wrap fields have hard character budgets.** Some components wrap long text at a fixed width with no auto-shrink — a long value wraps into many lines and breaks the layout (t1-02 \`quoteText\` ≤ 20 CJK characters, t1-09 \`bodyText\` ≤ 20 CJK characters). If the cue cannot be compressed that far, switch to a component whose layout absorbs long text, or split the content across scenes. Per-field caps are stated in each component reference's \`constraints\`.
- **Prefer numeric identifiers** ("1. / 2. / 3." or "01 / 02") over Chinese ordinal phrases such as 其一/其二 when enumerating.
- **Metric fields take data, not prose.** A field like \`fx-04 items[].val\` renders a big value where a bare number gets a "%" suffix — put "80" or "80%" there, never a phrase like 行业领先.
- **Write every quantity in Arabic numerals — always, even if the cue uses Chinese numerals.** Display fields must show "150" / "20%" / "2 个", never 一百五十 / 百分之二十 / 两个, regardless of how the subtitle spells the number. The importer does not numeric-check content, so correct grounding is the author's job: work from the scan-converted cue reading (workflow step 1) and do NOT copy the cue's Chinese numeral into content — write the Arabic form. (Chinese numeral forms like 第一 / 三思 that do not express a quantity are ordinary words, not numbers, and stay as they are.)
- **Do not crush a two-sided comparison into one heading line.** For content like "150 unusable effects vs 10 refined ones, the 10 matter" pick a component that can show both sides and emphasise one (\`t3-03\` dual-value, \`t7-01\`/\`t7-02\`/\`fx-08\` bars, \`t5-*\` list/cards) — single-line heading components (\`t1-*\`, \`fx-01\`, \`fx-02\`, \`fx-05\`) cannot convey the two quantities or the emphasis.

## Main heading carries the weight

- The **main heading** (\`titleText\`, \`title\`, \`title1\`, \`kickerText\`) is the takeaway the audience should remember — fold the key number / conclusion / action into that single line. The **secondary line** (\`subLabel\`, \`descText\`, \`quoteText\`, \`bodyText\`, \`noteText\`, \`footerText\`) is supporting context and must stay shorter than the main heading or be split into multiple list items.
- Forbid "one short heading + one long explanatory paragraph" layouts — that flips the visual weight onto the supporting line. If you need paragraph-level explanation, move it into a list / card / flow scene, or split it across scenes.

## Replace every placeholder value

- Every component reference lists a \`default\` for its editable fields (titles, kickers, tag lines, list item labels / sub-labels / index numbers, etc.). Those defaults are **structural placeholders, not real display copy**. Examples such as \`"执行链路三步走"\`, \`"明确目标 / 拆解路径 / 验收结果"\`, \`"七天学习计划"\`, \`"机器人 / 智能体 / 复杂软件"\`, \`"三步闭环运行流程"\` MUST be replaced with cue-grounded content before import — never propagate them through to the final draft.
- For \`t4-03\` overwrite every \`items[].label\` and the \`kickerText\`/\`titleText\`. For \`t4-06\` overwrite every \`items[].indexText / label / subLabel\` and adjust each \`borderColor\` to match the cue's tone. For \`t3-06\` rewrite each \`pointsA\` and \`pointsB\` and update \`borderA\`/\`borderB\`. The validator will not detect a leftover placeholder; only your review will.

## Component reuse — decide by content shape and pace

- No hard caps on component reuse: reusing the same component in consecutive scenes or elsewhere is allowed when the content fits.
- When a listable group of parallel points is larger than 3, express the whole group in ONE array-capable list / card / flow component (\`fx-04\`, \`fx-06\`, \`fx-07\`, \`t5-*\`, \`t7-05\`) — never emit the same component repeatedly, once per point.
- When a role covers 3 points or fewer, or the scenes differ in structure, reusing the same component is fine; do not force a weaker substitute just to avoid repetition.
- Keep presentation varied across scenes that share a role; a video that uses several distinct components reads better than one that leans on a favorite, but fit beats forced variety.

## Reuse limits — avoid repetitive flashing

- One scene may hold at most one opening / chapter title component (\`t1-*\`, \`fx-01\`, \`fx-02\`, \`fx-05\`, \`t2-02\`).
- One scene may hold at most one multi-point container (\`fx-04\`, \`fx-06\`, \`fx-07\`, \`t5-*\`, \`t7-05\`).
- Inside roughly a 5-second window, the same component id should not appear two or more times — pick a different id from the same family or a different visual role.
- If \`t2-01\` (or any single-line component) already appears twice within six components, the third occurrence MUST switch to \`t1-02\`, \`t1-09\`, \`t2-02\`, or another opening component — never let one component dominate the whole video.

## Enumerations and parallel commas → list components

- Whenever the cue expresses an enumeration ("X 和 Y 一共有 N 种情况" / "最好的解决办法有 4 种" / "三步闭环") OR a parallel-comma sequence ("换一条视频、换一个文案、换一种风格就不行了", "快、稳、好", "硬件、软件、算法"), that is a list, not a single heading. Pick an array-capable component (\`fx-04\`, \`fx-06\`, \`fx-07\`, \`t3-06\`, \`t4-04\`, \`t4-05\`, \`t4-08\`, \`t4-09\`, \`t5-01\`…\`t5-06\`, \`t6-*\`, \`t7-05\`) and put each parallel item into its own row. Do NOT decompose the enumeration into multiple single-title scenes, and do NOT cram the parallel items into one \`titleText\`/\`descText\` field.

## Layering effects on the same moment (multi-track)

- A scene's \`components\` array may hold 2-3 entries that play at the same time. The importer places every overlapping effect on its own track, so simultaneous effects are fully supported — a draft is NOT limited to one effect at a time.
- To stack different visual roles over one cue span (e.g. a chapter title with a supporting metric, or a viewpoint line with a small KPI), either keep them in ONE scene as separate components, or emit separate scenes that cite the same / overlapping cue ids.
- Assign every layer a different \`placementPreset\` zone (upper vs lower, left vs right) so the declared footprints do not collide. Components left at \`auto\` all gravitate to the same screen region — when layering, prefer explicit zones such as \`left-top\` + \`right-bottom\`. Two layers may deliberately overlay the same region only for a small badge/chip on top of a card; otherwise the importer warns about a footprint collision.
- Give each layer a distinct \`role\` (duplicate roles in one scene warn) and a distinct component id where reasonable; reuse of a component is judged by content shape, so treat each layer as its own appearance. Keep true stacks to 2-3 layers — more visual subjects in one scene triggers an advisory warning.
- Do not stack several full-width or same-family cards over the same instant: overlapping big cards read as clutter, not layering.
- **Sequential content must NOT be forced to play simultaneously.** When the elements have a time / causal order (steps, phases, before/after, A-then-B), use a list / card / flow / timeline component with per-item \`at\` so the audience sees the sequence. Reserve true multi-track stacking for elements that genuinely co-exist in the same instant (e.g. a heading + a metric + a small badge). Crushing a sequence into one frame collapses information density into a wall of overlapping type.
`;

const manifestComponent = (definition) => ({
  avoidFor: definition.selection.avoidFor,
  category: definition.category,
  componentVersion: definition.version,
  content: contentDefinition(definition),
  id: definition.id,
  name: definition.name,
  planning: {
    exclusive: definition.layout.exclusive,
    footprint: definition.layout.footprint,
    preferredZones: definition.layout.preferredZones,
    roles: definition.layout.roles,
  },
  referencePath: `references/components/${definition.id}.md`,
  selectionSummary: definition.selection.summary,
  semanticFamilies: definition.selection.semanticFamilies,
  suitableFor: definition.selection.suitableFor,
  ...(definition.selection.motion ? { motionFeel: definition.selection.motion } : {}),
  ...(definition.selection.minItems === undefined && definition.selection.maxItems === undefined ? {} : {
    capacity: {
      ...(definition.selection.maxItems === undefined ? {} : { maxItems: definition.selection.maxItems }),
      ...(definition.selection.minItems === undefined ? {} : { minItems: definition.selection.minItems }),
    },
  }),
});

export function generateSkillArtifacts(definitions, agentDraftSchema, metaList = []) {
  const approved = approvedDefinitions(definitions);
  const paths = new Map();
  paths.set('skill/SKILL.md', renderRootSkill(approved));
  paths.set('skill/references/composition-guidelines.md', renderCompositionGuidelines());
  paths.set('skill/references/project-schema.md', renderProjectSchema(agentDraftSchema));
  paths.set('skill/scripts/validation-meta.json', `${json({
    components: [...metaList].sort((left, right) => compareText(left.id, right.id)),
  }, 2)}\n`);
  paths.set('skill/scripts/build-agent-input.mjs', readFileSync(join(defaultProjectRoot, 'scripts/build-agent-input.mjs'), 'utf8'));
  for (const definition of approved) {
    paths.set(`${componentReferencePrefix}${definition.id}.md`, renderComponentReference(definition));
  }
  paths.set('src/agent/generated/componentManifest.json', `${json({
    components: approved.map(manifestComponent),
    libraryVersion: 1,
  }, 2)}\n`);
  return new Map([...paths].sort(([left], [right]) => compareText(left, right)));
}

const idForPath = (path) => path.startsWith(componentReferencePrefix)
  ? path.slice(componentReferencePrefix.length, -'.md'.length)
  : path;

export function compareSkillArtifacts(artifacts, projectRoot = defaultProjectRoot) {
  const missing = [];
  const stale = [];
  for (const [path, expected] of artifacts) {
    const absolute = join(projectRoot, path);
    if (!existsSync(absolute)) missing.push(idForPath(path));
    else if (readFileSync(absolute, 'utf8') !== expected) stale.push(idForPath(path));
  }

  const componentDir = join(projectRoot, componentReferencePrefix);
  const expectedReferences = new Set(
    [...artifacts.keys()].filter((path) => path.startsWith(componentReferencePrefix)).map((path) => idForPath(path)),
  );
  const orphan = existsSync(componentDir)
    ? readdirSync(componentDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name.slice(0, -'.md'.length))
      .filter((id) => !expectedReferences.has(id))
      .sort(compareText)
    : [];
  return { missing: missing.sort(compareText), stale: stale.sort(compareText), orphan };
}

export function writeSkillArtifacts(artifacts, projectRoot = defaultProjectRoot) {
  const componentDir = join(projectRoot, componentReferencePrefix);
  const expectedReferences = new Set(
    [...artifacts.keys()].filter((path) => path.startsWith(componentReferencePrefix)).map((path) => idForPath(path)),
  );
  if (existsSync(componentDir)) {
    for (const entry of readdirSync(componentDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md') && !expectedReferences.has(entry.name.slice(0, -3))) {
        unlinkSync(join(componentDir, entry.name));
      }
    }
  }
  for (const [path, content] of artifacts) {
    const absolute = join(projectRoot, path);
    mkdirSync(dirname(absolute), { recursive: true });
    if (!existsSync(absolute) || readFileSync(absolute, 'utf8') !== content) writeFileSync(absolute, content);
  }
}

export async function loadGenerationSources(projectRoot = defaultProjectRoot) {
  const { createServer } = await import('vite');
  const server = await createServer({ root: projectRoot, appType: 'custom', server: { middlewareMode: true } });
  try {
    const [{ effectRegistry }, { AgentDraftSchema }, { toComponentMeta }] = await Promise.all([
      server.ssrLoadModule('/src/effects/registry.ts'),
      server.ssrLoadModule('/src/project/schema.ts'),
      server.ssrLoadModule('/src/project/componentMeta.ts'),
    ]);
    const definitions = effectRegistry.list();
    return { definitions, agentDraftSchema: AgentDraftSchema, metaList: definitions.map(toComponentMeta) };
  } finally {
    await server.close();
  }
}

export async function generateSkill(projectRoot = defaultProjectRoot) {
  const { definitions, agentDraftSchema, metaList } = await loadGenerationSources(projectRoot);
  const artifacts = generateSkillArtifacts(definitions, agentDraftSchema, metaList);
  writeSkillArtifacts(artifacts, projectRoot);
  return artifacts;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) {
  const artifacts = await generateSkill();
  const references = [...artifacts.keys()].filter((path) => path.startsWith(componentReferencePrefix)).length;
  process.stdout.write(`Generated ${references} component references and ${artifacts.size} artifacts.\n`);
}
