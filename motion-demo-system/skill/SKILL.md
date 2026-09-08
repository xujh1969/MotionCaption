---
name: motion-caption-components
description: Select existing MotionCaption motion components and produce validated captionforge.agent-draft JSON from subtitle cues. Use for component selection and orchestration, not for creating component code or changing visual styles.
---

# MotionCaption Component Orchestration

Use this skill to select registered components and produce a strict Agent Draft from a supplied Agent Input.

## Workflow

1. **Prepare the Agent Input JSON.** The workflow below expects a supplied Agent Input (subtitle cues with `cueId`/`text`/`startMs`/`endMs` plus `video` metadata). If you have an SRT file but no Agent Input yet, build one with the script bundled in this skill: run `node <skill-dir>/scripts/build-agent-input.mjs <captions.srt> [agent-input.json]` (omit the output path to print JSON to stdout). It mirrors the host parser exactly — cues are numbered `cue-1`, `cue-2`, … with no zero-padding, empty text blocks still consume an index, and it emits 1920×1080 @ 30 fps metadata by default (override with `--fps`, `--width`, `--height`). **Then scan the subtitles before anything else:** read every cue text and convert Chinese numerals to Arabic wherever they express a quantity (一百五十 → 150, 百分之二十 → 20%, 八点五 → 8.5, 两千 → 2000); leave non-quantity words untouched (第一 / 三思 / 十分感谢 stay as-is). All later steps — scene planning, number grounding, and display copy — must work from this converted reading, so every quantity you write in `content` is Arabic and traceable to a cue.
2. Read [the project schema](references/project-schema.md) and [composition guidelines](references/composition-guidelines.md).
3. **Plan structure before selection.** In 1-2 sentences divide the cue list into scene roles (opening / chapter title, grouped parallel points, single metric emphasis, warning / conclusion, closing). When several consecutive cues each state one parallel point (2-6 lines), merge them into ONE list / card / flow scene that cites all of those cue ids — never emit one title scene per line.
4. **Reuse is your judgment call — decide by content shape, not by fixed counts.** There is no blanket ban on reusing a component in adjacent scenes or across the timeline. When a listable group of parallel points is larger than 3, express the whole group in ONE array-capable list / card / flow component (e.g. fx-04, fx-06, fx-07, t5-*, t7-05) — never emit the same component repeatedly, once per point. When a role covers 3 points or fewer, or the scenes genuinely differ in structure, reusing the same component is fine. The only anti-pattern is one favorite component carrying nearly every scene of the video.
5. **Layer when one moment carries more than one message.** A scene may hold 2-3 `components` that play together over the same cue interval — each lands on its own track, so simultaneous effects are supported. Separate scenes may also cite the same cue span to stack layers. Spread each layer to a different screen zone via `placementPreset` (e.g. upper title + lower metric), keep each layer's `role` distinct, and stay within 2-3 layers per moment. See the composition guidelines for the full layering rules.
6. Shortlist ids for each planned role using the **Quick navigation by cue shape** table below, then read only the references for the selected ids; do not load unrelated component references.
7. Populate every required `content` field from the source cues. Never supply visual style or layout property fields. **Cue ID format:** copy each entry in `sourceCueIds` **verbatim** from the `cueId` values of the supplied Agent Input JSON (the SRT parser numbers cues `cue-1`, `cue-2`, … with no zero-padding). Do NOT renumber, re-derive from the SRT, or zero-pad — a made-up id such as `cue-0001` fails import with "Unknown source cue". **Write Arabic numerals in every display field.** The importer does NOT numeric-check `content`, so grounding is entirely your responsibility: write the Arabic form (`150` / `20%` / `2 个`) even when the cue spells the number in Chinese, and never invent a number or unit that does not appear in the (converted) cue text. **Write short display copy:** heading fields (titleText / topText / title1 / title2 / tagText / kickerText / descText and list labels/names) are rewrites, not transcripts — keep them concise (≈ ≤ 12 CJK characters per single-line heading), do not chain parallel points inside one heading with commas, prefer numeric identifiers ("1./2./3." or "01/02") over 其一/其二, and never paste a long cue sentence into one heading field. Numeric metric fields (e.g. fx-04 items[].val) take a number or percent like "80" / "80%", never descriptive words. See the composition guidelines for the full display-copy rules.
8. **Embed the subtitle track:** add a top-level `cues` array that is a **verbatim copy** of the `cues` list from the supplied Agent Input JSON (each entry keeps its `cueId`, `text`, `startMs`, `endMs`). Do not trim, reorder, or alter entries. This makes the draft self-contained: importing it rebuilds the subtitle track and auto-extends the project duration, so the user does NOT need to import the SRT or load a video beforehand.
9. Save strict JSON, then validate it with the standalone validator bundled in this skill — it lives in the same folder that holds SKILL.md, under `scripts/validate-agent-draft.mjs`, and needs no project files, only Node. Run `node <skill-dir>/scripts/validate-agent-draft.mjs <draft.json> <agent-input.json>`, where `<skill-dir>` is the directory that contains this SKILL.md (resolve it as an absolute path so the command works on any machine). Return the draft only when it exits 0.

## Quick navigation by cue shape

Use this table to shortlist component ids before reading the per-category index below. The table is a shortcut, not a complete mapping — after shortlisting, confirm against the category tables.

| The cue / material is… | Look first at |
| --- | --- |
| Opening / chapter title | fx-01, fx-02, fx-05, t1-01, t1-06, t2-02 |
| Quote / remark / warning / conclusion | t1-02, t1-09, t2-01, fx-03 |
| Single number / metric | t3-01, t3-02, fx-09, t6-03, t7-06 |
| Several parallel points (merge into one scene) | fx-04, fx-06, fx-07, t5-01, t5-02, t5-03, t5-04, t5-05, t5-06, t7-05 |
| Process / steps / timeline | t4-01, t4-02, t6-01, t6-02, t6-04, t6-05, t6-06 |
| Chart / share / comparison | t3-03, t7-01, t7-02, t7-03, t7-04, fx-08 |

## card-glow

| ID | Summary | Motion feel | Use for | Avoid | Details |
| --- | --- | --- | --- | --- | --- |
| t2-01 | 单侧渐变发光边框文本卡片 |  — | Key viewpoint, quotation, reminder, or conclusion card; use 1-3 body lines. | Avoid lists, processes, metric comparisons, charts, and long paragraphs. | [reference](references/components/t2-01.md) |
| t2-02 | 半透底色发光圆角标题卡片 |  — | Section label plus core title for a transition or product feature heading. | Avoid lists, processes, metric comparisons, charts, and long paragraphs. | [reference](references/components/t2-02.md) |
| t2-03 | 弱底色高亮信息模块 |  — | Title plus short explanation for a concept, feature, or key information. | Avoid lists, processes, metric comparisons, charts, and long paragraphs. | [reference](references/components/t2-03.md) |

## data-show

| ID | Summary | Motion feel | Use for | Avoid | Details |
| --- | --- | --- | --- | --- | --- |
| t3-01 | 大数字+单位底部说明 |  — | Single KPI or numeric data display. | Avoid unrelated prose, processes, lists, timelines, charts, and content beyond the stated capacity. | [reference](references/components/t3-01.md) |
| t3-02 | 前缀标签-数值-单位单行 |  — | Single metric with a prefix label and unit. | Avoid unrelated prose, processes, lists, timelines, charts, and content beyond the stated capacity. | [reference](references/components/t3-02.md) |
| t3-03 | 双栏对比数据 |  — | Two-value metric comparison. | Avoid unrelated prose, processes, lists, timelines, charts, and content beyond the stated capacity. | [reference](references/components/t3-03.md) |
| t3-04 | 多行key-value数据条目 |  — | Multi-row key-value data display with 2-4 rows. | Avoid narrative paragraphs, processes, timelines, and more than 4 rows. | [reference](references/components/t3-04.md) |

## flow-track

| ID | Summary | Motion feel | Use for | Avoid | Details |
| --- | --- | --- | --- | --- | --- |
| t4-01 | 多步横向流程 |  — | Process or step explanation with 2-4 steps. | Avoid scalar summaries, unrelated charts, and more than 4 steps. | [reference](references/components/t4-01.md) |
| t4-02 | 渐变节点阶段演进时间轴 |  — | Stage progression or process timeline with 2-4 nodes. | Avoid unrelated prose, metrics, charts, and more than 4 nodes. | [reference](references/components/t4-02.md) |

## list-item

| ID | Summary | Motion feel | Use for | Avoid | Details |
| --- | --- | --- | --- | --- | --- |
| t5-01 | 圆点标记竖向清单 |  — | Vertical capability or item list with 2-3 items. | Avoid charts, long paragraphs, and more than 3 items. | [reference](references/components/t5-01.md) |
| t5-02 | 三色状态标签条目清单 |  — | Status-tagged task list with 2-3 items. | Avoid charts, long paragraphs, and more than 3 items. | [reference](references/components/t5-02.md) |
| t5-03 | 序号+大小标题列表 |  — | Numbered optimization directions with 2-3 items. | Avoid charts, long paragraphs, and more than 3 items. | [reference](references/components/t5-03.md) |
| t5-04 | 双列Key-Value信息清单 |  — | Key-value information list with 2-4 items. | Avoid charts, long paragraphs, and more than 4 items. | [reference](references/components/t5-04.md) |
| t5-05 | 侧边竖向堆叠标签卡片组 |  — | Parallel status or label cards with 2-3 cards. | Avoid charts, long paragraphs, and more than 3 cards. | [reference](references/components/t5-05.md) |
| t5-06 | 横向多列标签标题列表 |  — | Multi-column issue list with 2-3 items. | Avoid charts, long paragraphs, and more than 3 items. | [reference](references/components/t5-06.md) |

## mini-chart

| ID | Summary | Motion feel | Use for | Avoid | Details |
| --- | --- | --- | --- | --- | --- |
| t7-01 | 标题+竖向柱状图 |  — | Vertical category-value comparison with 2-4 bars. | Avoid large datasets, precision analysis, complex axes, and more than 4 bars. | [reference](references/components/t7-01.md) |
| t7-02 | 横向条形对比图 |  — | Horizontal ranking or option comparison with 2-3 bars. | Avoid large datasets, precision analysis, complex axes, and more than 3 bars. | [reference](references/components/t7-02.md) |
| t7-03 | 多段环形占比图 |  — | Composition or proportion with 2-3 segments; total should be 100 percent. | Avoid large datasets, precision analysis, complex axes, and more than 3 segments. | [reference](references/components/t7-03.md) |
| t7-04 | 双线条迷你折线图 |  — | Two-subject trend comparison with exactly 2 lines and 3-6 time points. | Avoid more than 2 lines, fewer than 3 or more than 6 time points, large datasets, and complex axes. | [reference](references/components/t7-04.md) |
| t7-05 | 多卡片指标快照 |  — | KPI snapshot cards with 2-3 cards. | Avoid large datasets, precision analysis, complex axes, and more than 3 cards. | [reference](references/components/t7-05.md) |
| t7-06 | 半环形占比仪表盘 |  — | Single completion rate, score, or percentage from 0-100 percent. | Avoid large datasets, precision analysis, complex axes, and multiple metrics. | [reference](references/components/t7-06.md) |

## special-fx

| ID | Summary | Motion feel | Use for | Avoid | Details |
| --- | --- | --- | --- | --- | --- |
| fx-01 | 英文标签+主标题+渐变分割线 |  整组淡入+上浮一次成型（Expo 缓出），无分步无点缀；稳重开场横幅。 | Chapter title or core viewpoint with a short English label and short title. | Avoid paragraphs and data lists. | [reference](references/components/fx-01.md) |
| fx-02 | 英文标签+主标题+渐变线+线下方小字 |  整组淡入+上浮一次成型，标题下多一行半透明小字；适合带副句的章头。 | Chapter title with a short supporting line. | Avoid long body copy and data. | [reference](references/components/fx-02.md) |
| fx-03 | 渐变警示条(菱形感叹号) |  警示条整条淡入上浮；红调渐变底+发光描边+菱形感叹号，静态强调，无往复。 | Warning, risk, or negative conclusion. | Avoid neutral exposition. | [reference](references/components/fx-03.md) |
| fx-04 | 大标题+指标块列表 |  金边外框先淡入，4 个指标块自左向右逐个淡入（每块间隔约 0.33s）。 | Capability or metric overview with exactly 4 items. | Avoid fewer or more than 4 items and prose paragraphs. | [reference](references/components/fx-04.md) |
| fx-05 | 竖线+胶囊标签+双行标题 |  整组淡入+上浮一次成型（主题色竖线+实心胶囊+双行标题+小标签组），无逐层；信息密度高。 | Two-line theme title with category tags; use 1-3 tags. | Avoid long paragraphs and more than 3 tags. | [reference](references/components/fx-05.md) |
| fx-06 | 大标题+多行列表 |  外框淡入后标题单独淡入，步骤行逐个浮现（每行间隔约 0.47s），底部脚注随之出现。 | Process or step explanation with 2-3 steps. | Avoid a single scalar summary and more than 3 steps. | [reference](references/components/fx-06.md) |
| fx-07 | 大标题+多行列表卡片 |  外框淡入后标题单独淡入，小卡片逐个浮现（两列网格、每张间隔约 0.4s）。 | Parallel feature or viewpoint cards with 2-4 cards. | Avoid a single narrative and more than 4 cards. | [reference](references/components/fx-07.md) |
| fx-08 | 大标题+多进度条 |  外框淡入后标题单独淡入，进度条逐行从左向右生长并淡入（每行间隔约 0.4s）；运动感最强的 fx 组件。 | Progress, score, or percentage comparison with 2-4 bars. | Avoid non-comparative prose and more than 4 bars. | [reference](references/components/fx-08.md) |
| fx-09 | 深色渐变数字卡片 |  整卡淡入，核心数字滚动计数约 1.3s 并带渐变与呼吸微光，底部出处随后淡入；单 KPI 高光。 | Single core KPI, count, or growth value. | Avoid multiple metrics and paragraphs. | [reference](references/components/fx-09.md) |

## text-line

| ID | Summary | Motion feel | Use for | Avoid | Details |
| --- | --- | --- | --- | --- | --- |
| t1-01 | 顶部标签+英文标签+主标题副标题 |  右侧四层文字（标签/英文/主标题/副标题）逐层上浮入场，每层间隔约 0.5s，顶部标签带呼吸。 | Chapter opening or technology topic introduction. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-01.md) |
| t1-02 | 左侧竖线引用注释 |  左侧竖线先自上而下生长，引用文字与底部注释先后淡入（注释轻微呼吸）；观点/引用质感。 | Quote, highlighted viewpoint, or key sentence; use 1-3 text lines. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-02.md) |
| t1-03 | 顶部小字注解+主标题 |  小字注解先上浮，主标题稍后上浮；两段式、轻快利落。 | Small annotation plus core conclusion with knowledge or fact emphasis. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-03.md) |
| t1-04 | 小标题-主标题-副标题层级 |  小标题、主标题、副标题三层逐层上浮入场，每层间隔约 0.5s；标准章节层级。 | Three-level section hierarchy. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-04.md) |
| t1-05 | 主标题副标题+底部渐变线 |  标题与副标题先后淡入，底部渐变线随后从左向右生长并带呼吸；收尾有动感。 | Main title plus short explanation for a viewpoint summary or transition. | Avoid two-sided comparisons that emphasise one side (e.g. quantity contrasts such as "150 vs 10"), metrics, lists, and long paragraphs. | [reference](references/components/t1-05.md) |
| t1-06 | 英文标签+主标题副标题+底部渐变线 |  英文标签、主标题、副标题逐层上浮，底部线最后自中心向两侧展开并带呼吸；比 t1-05 更对称。 | English label plus topic title for a technology or product chapter opening. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-06.md) |
| t1-07 | 顶部标签+主标题+辅助说明 |  顶部小标先淡入，主标题与说明文字依次上浮；三行快节奏，适合功能条目。 | Section label, main title, and one-line explanation for a feature introduction. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-07.md) |
| t1-08 | 顶部锚点标签+主标题+正文段落 |  标签与标题依次上浮，正文整体淡入，{{重点词}} 高亮并带呼吸；适合观点段+强调词。 | Topic label, main title, and explanatory paragraph; use 2-4 body lines. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-08.md) |
| t1-09 | 主文本块底部注释 |  正文块先上浮淡入，底部注释随后淡入并轻微呼吸；定义/出处引用。 | Highlighted body with footnote or source for a definition, quotation, or supporting note. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-09.md) |

## timeline-flow

| ID | Summary | Motion feel | Use for | Avoid | Details |
| --- | --- | --- | --- | --- | --- |
| t6-01 | 竖向时间轴时间线 |  — | Product or project evolution timeline with 2-3 nodes. | Avoid unrelated prose, metrics, charts, and more than 3 nodes. | [reference](references/components/t6-01.md) |
| t6-02 | 多节点横向箭头数据流 |  — | Data flow or pipeline with 2-4 nodes. | Avoid unrelated prose, metrics, charts, and more than 4 nodes. | [reference](references/components/t6-02.md) |
| t6-03 | 分段进度条指标 |  — | Single completion or progress metric. | Avoid unrelated prose, processes, lists, timelines, charts, and content beyond the stated capacity. | [reference](references/components/t6-03.md) |
| t6-04 | 单输入双分支分叉流向 |  — | Single input with two branch paths. | Avoid unrelated lists, timelines, charts, and long paragraphs. | [reference](references/components/t6-04.md) |
| t6-05 | 节点分步入场时间线 |  — | Step-by-step workflow timeline with 2-4 nodes. | Avoid unrelated prose, metrics, charts, and more than 4 nodes. | [reference](references/components/t6-05.md) |
| t6-06 | 多步骤向上浮动递进时间线 |  — | Iterative multi-step process with 2-4 steps. | Avoid unrelated prose, metrics, charts, and more than 4 steps. | [reference](references/components/t6-06.md) |
| t6-07 | 有序序号步骤列表·焦点滚动切换 |  左侧安全区步骤列表（序号方块+连接线+步骤文本）：首条即高亮，之后每条目在自身时段渐入放大成当前焦点（前一条目同步缩小变白），连接线红色段逐段下行，末段整体 600ms 淡出。 | Vertical ordered steps where each step is narrated in its own cue and should be highlighted one by one (focus-scroll stepper). | Avoid scalar summaries, unordered lists, metric charts, and more than 5 items. | [reference](references/components/t6-07.md) |
