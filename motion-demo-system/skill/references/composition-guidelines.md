# Composition Guidelines

- Use only component IDs listed in the root index, then read the selected component references.
- Every scene must cite one or more existing cue IDs in chronological order. Use those cues as the only source for text, numbers, units, list items, and claims.
- Populate all required editable content fields. Never put style, color, typography, coordinates, scale, or other locked component properties in `content`.
- Keep a scene to at most two visual subjects when possible. Duplicate semantic roles and declared footprint collisions produce warnings.
- Do not overlap a component declared exclusive with another component.
- Respect each component's exact version and list capacity. Use arrays of objects for list content, never stringified JSON.
- Validate the completed files with the standalone validator bundled in this skill (`scripts/validate-agent-draft.mjs` next to SKILL.md — run `node <skill-dir>/scripts/validate-agent-draft.mjs <draft.json> <agent-input.json>` with `<skill-dir>` as the absolute path of the folder that holds SKILL.md); errors block import, while warnings are advisory.

## Structure before selection

- Divide the cue list into scene roles first (opening / chapter title, grouped parallel points, single metric emphasis, warning / conclusion, closing) and pick a component family per role; only then choose a concrete id.
- Prefer merging 2-6 consecutive cues that each state one parallel point into ONE list / card / flow scene (`fx-04`, `fx-06`, `fx-07`, `t5-*`, `t7-05`) over emitting a single-title scene per line. A merged scene cites every cue it draws from in `sourceCueIds`.
- **Sync item entrances to the narration.** In list / card / flow / timeline components (flow cards `t4-01` through `t4-09`, timeline stages like `t4-02`, checklists `t5-*`, steps `t6-*`, bars `fx-08` …), each item that visualizes one cited cue gets a numeric `at` = (its cue start − earliest cited cue start) / 1000, 1 decimal. Items then appear exactly when their cue is spoken instead of one uniform sweep. Multi-step progress narratives ("第一步…第二步…", "先…再…最后…") are the strongest case: pick a t4-* flow component and fill every step's `at`.
- Reserve single-title components (`fx-01`, `fx-02`, `fx-05`, `t1-*`, `t2-02`) for openings, chapter turns, and strong emphasis — not for every cue.

## Display copy discipline

- **Rewrite, don't transcribe.** A heading/display field (`titleText`, `topText`, `title`, `title1`/`title2`, `tagText`, `kickerText`, `quoteText`, `bodyText`, `descText`, list item `name`/`label`) is a concise summary of the cue, never the whole sentence pasted in. Prefer keeping the key number/term and dropping filler clauses.
- **Keep single-line heading fields short** — roughly ≤ 12 CJK characters / ≤ 28 ASCII letters. Long heading lines shrink (auto-fit) or collide with the rows below.
- **No sentence punctuation inside a heading field — none at all.** Never write ， 。 、 ； ： ？ ！ , . ; : ? ! in `titleText` / `quoteText` / `bodyText` / `tagText` / `kickerText` / list `name`/`label`. Two short clauses are separated by a space or `·`, or better, split across two scenes / moved to a `descText`/`noteText` field. A heading with a comma inside is a symptom that the content belongs in a list / card / flow scene instead.
- **Multi-line wrap fields have hard character budgets.** Some components wrap long text at a fixed width with no auto-shrink — a long value wraps into many lines and breaks the layout (t1-02 `quoteText` ≤ 20 CJK characters, t1-09 `bodyText` ≤ 20 CJK characters). If the cue cannot be compressed that far, switch to a component whose layout absorbs long text, or split the content across scenes. Per-field caps are stated in each component reference's `constraints`.
- **Prefer numeric identifiers** ("1. / 2. / 3." or "01 / 02") over Chinese ordinal phrases such as 其一/其二 when enumerating.
- **Metric fields take data, not prose.** A field like `fx-04 items[].val` renders a big value where a bare number gets a "%" suffix — put "80" or "80%" there, never a phrase like 行业领先.
- **Write every quantity in Arabic numerals — always, even if the cue uses Chinese numerals.** Display fields must show "150" / "20%" / "2 个", never 一百五十 / 百分之二十 / 两个, regardless of how the subtitle spells the number. The importer does not numeric-check content, so correct grounding is the author's job: work from the scan-converted cue reading (workflow step 1) and do NOT copy the cue's Chinese numeral into content — write the Arabic form. (Chinese numeral forms like 第一 / 三思 that do not express a quantity are ordinary words, not numbers, and stay as they are.)
- **Do not crush a two-sided comparison into one heading line.** For content like "150 unusable effects vs 10 refined ones, the 10 matter" pick a component that can show both sides and emphasise one (`t3-03` dual-value, `t7-01`/`t7-02`/`fx-08` bars, `t5-*` list/cards) — single-line heading components (`t1-*`, `fx-01`, `fx-02`, `fx-05`) cannot convey the two quantities or the emphasis.

## Main heading carries the weight

- The **main heading** (`titleText`, `title`, `title1`, `kickerText`) is the takeaway the audience should remember — fold the key number / conclusion / action into that single line. The **secondary line** (`subLabel`, `descText`, `quoteText`, `bodyText`, `noteText`, `footerText`) is supporting context and must stay shorter than the main heading or be split into multiple list items.
- Forbid "one short heading + one long explanatory paragraph" layouts — that flips the visual weight onto the supporting line. If you need paragraph-level explanation, move it into a list / card / flow scene, or split it across scenes.

## Replace every placeholder value

- Every component reference lists a `default` for its editable fields (titles, kickers, tag lines, list item labels / sub-labels / index numbers, etc.). Those defaults are **structural placeholders, not real display copy**. Examples such as `"执行链路三步走"`, `"明确目标 / 拆解路径 / 验收结果"`, `"七天学习计划"`, `"机器人 / 智能体 / 复杂软件"`, `"三步闭环运行流程"` MUST be replaced with cue-grounded content before import — never propagate them through to the final draft.
- For `t4-03` overwrite every `items[].label` and the `kickerText`/`titleText`. For `t4-06` overwrite every `items[].indexText / label / subLabel` and adjust each `borderColor` to match the cue's tone. For `t3-06` rewrite each `pointsA` and `pointsB` and update `borderA`/`borderB`. The validator will not detect a leftover placeholder; only your review will.

## Component reuse — decide by content shape and pace

- No hard caps on component reuse: reusing the same component in consecutive scenes or elsewhere is allowed when the content fits.
- When a listable group of parallel points is larger than 3, express the whole group in ONE array-capable list / card / flow component (`fx-04`, `fx-06`, `fx-07`, `t5-*`, `t7-05`) — never emit the same component repeatedly, once per point.
- When a role covers 3 points or fewer, or the scenes differ in structure, reusing the same component is fine; do not force a weaker substitute just to avoid repetition.
- Keep presentation varied across scenes that share a role; a video that uses several distinct components reads better than one that leans on a favorite, but fit beats forced variety.

## Reuse limits — avoid repetitive flashing

- One scene may hold at most one opening / chapter title component (`t1-*`, `fx-01`, `fx-02`, `fx-05`, `t2-02`).
- One scene may hold at most one multi-point container (`fx-04`, `fx-06`, `fx-07`, `t5-*`, `t7-05`).
- Inside roughly a 5-second window, the same component id should not appear two or more times — pick a different id from the same family or a different visual role.
- If `t2-01` (or any single-line component) already appears twice within six components, the third occurrence MUST switch to `t1-02`, `t1-09`, `t2-02`, or another opening component — never let one component dominate the whole video.

## Enumerations and parallel commas → list components

- Whenever the cue expresses an enumeration ("X 和 Y 一共有 N 种情况" / "最好的解决办法有 4 种" / "三步闭环") OR a parallel-comma sequence ("换一条视频、换一个文案、换一种风格就不行了", "快、稳、好", "硬件、软件、算法"), that is a list, not a single heading. Pick an array-capable component (`fx-04`, `fx-06`, `fx-07`, `t3-06`, `t4-04`, `t4-05`, `t4-08`, `t4-09`, `t5-01`…`t5-06`, `t6-*`, `t7-05`) and put each parallel item into its own row. Do NOT decompose the enumeration into multiple single-title scenes, and do NOT cram the parallel items into one `titleText`/`descText` field.

## Layering effects on the same moment (multi-track)

- A scene's `components` array may hold 2-3 entries that play at the same time. The importer places every overlapping effect on its own track, so simultaneous effects are fully supported — a draft is NOT limited to one effect at a time.
- To stack different visual roles over one cue span (e.g. a chapter title with a supporting metric, or a viewpoint line with a small KPI), either keep them in ONE scene as separate components, or emit separate scenes that cite the same / overlapping cue ids.
- Assign every layer a different `placementPreset` zone (upper vs lower, left vs right) so the declared footprints do not collide. Components left at `auto` all gravitate to the same screen region — when layering, prefer explicit zones such as `left-top` + `right-bottom`. Two layers may deliberately overlay the same region only for a small badge/chip on top of a card; otherwise the importer warns about a footprint collision.
- Give each layer a distinct `role` (duplicate roles in one scene warn) and a distinct component id where reasonable; reuse of a component is judged by content shape, so treat each layer as its own appearance. Keep true stacks to 2-3 layers — more visual subjects in one scene triggers an advisory warning.
- Do not stack several full-width or same-family cards over the same instant: overlapping big cards read as clutter, not layering.
- **Sequential content must NOT be forced to play simultaneously.** When the elements have a time / causal order (steps, phases, before/after, A-then-B), use a list / card / flow / timeline component with per-item `at` so the audience sees the sequence. Reserve true multi-track stacking for elements that genuinely co-exist in the same instant (e.g. a heading + a metric + a small badge). Crushing a sequence into one frame collapses information density into a wall of overlapping type.
