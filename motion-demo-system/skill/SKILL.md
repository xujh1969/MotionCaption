---
name: motion-caption-components
description: Select existing MotionCaption motion components and produce validated captionforge.agent-draft JSON from subtitle cues. Use for component selection and orchestration, not for creating component code or changing visual styles.
---

# MotionCaption Component Orchestration

Use this skill to select registered components and produce a strict Agent Draft from a supplied Agent Input.

## Workflow

1. Read [the project schema](references/project-schema.md) and [composition guidelines](references/composition-guidelines.md).
2. Choose component IDs from the index below using the request and source cues.
3. Read only the references for the selected IDs; do not load unrelated component references.
4. Populate every required `content` field from the source cues. Never supply visual style or layout property fields.
5. Save strict JSON and run `node scripts/validate-agent-draft.mjs <draft.json> <agent-input.json>`. Return the draft only when it exits 0.

## card-glow

| ID | Summary | Use for | Avoid | Details |
| --- | --- | --- | --- | --- |
| t2-01 | 单侧渐变发光边框文本卡片 | Key viewpoint, quotation, reminder, or conclusion card; use 1-3 body lines. | Avoid lists, processes, metric comparisons, charts, and long paragraphs. | [reference](references/components/t2-01.md) |
| t2-02 | 半透底色发光圆角标题卡片 | Section label plus core title for a transition or product feature heading. | Avoid lists, processes, metric comparisons, charts, and long paragraphs. | [reference](references/components/t2-02.md) |
| t2-03 | 弱底色高亮信息模块 | Title plus short explanation for a concept, feature, or key information. | Avoid lists, processes, metric comparisons, charts, and long paragraphs. | [reference](references/components/t2-03.md) |

## data-show

| ID | Summary | Use for | Avoid | Details |
| --- | --- | --- | --- | --- |
| t3-01 | 大数字+单位底部说明 | Single KPI or numeric data display. | Avoid unrelated prose, processes, lists, timelines, charts, and content beyond the stated capacity. | [reference](references/components/t3-01.md) |
| t3-02 | 前缀标签-数值-单位单行 | Single metric with a prefix label and unit. | Avoid unrelated prose, processes, lists, timelines, charts, and content beyond the stated capacity. | [reference](references/components/t3-02.md) |
| t3-03 | 双栏对比数据 | Two-value metric comparison. | Avoid unrelated prose, processes, lists, timelines, charts, and content beyond the stated capacity. | [reference](references/components/t3-03.md) |
| t3-04 | 多行key-value数据条目 | Multi-row key-value data display with 2-4 rows. | Avoid narrative paragraphs, processes, timelines, and more than 4 rows. | [reference](references/components/t3-04.md) |

## flow-track

| ID | Summary | Use for | Avoid | Details |
| --- | --- | --- | --- | --- |
| t4-01 | 多步横向流程 | Process or step explanation with 2-4 steps. | Avoid scalar summaries, unrelated charts, and more than 4 steps. | [reference](references/components/t4-01.md) |
| t4-02 | 渐变节点阶段演进时间轴 | Stage progression or process timeline with 2-4 nodes. | Avoid unrelated prose, metrics, charts, and more than 4 nodes. | [reference](references/components/t4-02.md) |

## list-item

| ID | Summary | Use for | Avoid | Details |
| --- | --- | --- | --- | --- |
| t5-01 | 圆点标记竖向清单 | Vertical capability or item list with 2-3 items. | Avoid charts, long paragraphs, and more than 3 items. | [reference](references/components/t5-01.md) |
| t5-02 | 三色状态标签条目清单 | Status-tagged task list with 2-3 items. | Avoid charts, long paragraphs, and more than 3 items. | [reference](references/components/t5-02.md) |
| t5-03 | 序号+大小标题列表 | Numbered optimization directions with 2-3 items. | Avoid charts, long paragraphs, and more than 3 items. | [reference](references/components/t5-03.md) |
| t5-04 | 双列Key-Value信息清单 | Key-value information list with 2-4 items. | Avoid charts, long paragraphs, and more than 4 items. | [reference](references/components/t5-04.md) |
| t5-05 | 侧边竖向堆叠标签卡片组 | Parallel status or label cards with 2-3 cards. | Avoid charts, long paragraphs, and more than 3 cards. | [reference](references/components/t5-05.md) |
| t5-06 | 横向多列标签标题列表 | Multi-column issue list with 2-3 items. | Avoid charts, long paragraphs, and more than 3 items. | [reference](references/components/t5-06.md) |

## mini-chart

| ID | Summary | Use for | Avoid | Details |
| --- | --- | --- | --- | --- |
| t7-01 | 标题+竖向柱状图 | Vertical category-value comparison with 2-4 bars. | Avoid large datasets, precision analysis, complex axes, and more than 4 bars. | [reference](references/components/t7-01.md) |
| t7-02 | 横向条形对比图 | Horizontal ranking or option comparison with 2-3 bars. | Avoid large datasets, precision analysis, complex axes, and more than 3 bars. | [reference](references/components/t7-02.md) |
| t7-03 | 多段环形占比图 | Composition or proportion with 2-3 segments; total should be 100 percent. | Avoid large datasets, precision analysis, complex axes, and more than 3 segments. | [reference](references/components/t7-03.md) |
| t7-04 | 双线条迷你折线图 | Two-subject trend comparison with exactly 2 lines and 3-6 time points. | Avoid more than 2 lines, fewer than 3 or more than 6 time points, large datasets, and complex axes. | [reference](references/components/t7-04.md) |
| t7-05 | 多卡片指标快照 | KPI snapshot cards with 2-3 cards. | Avoid large datasets, precision analysis, complex axes, and more than 3 cards. | [reference](references/components/t7-05.md) |
| t7-06 | 半环形占比仪表盘 | Single completion rate, score, or percentage from 0-100 percent. | Avoid large datasets, precision analysis, complex axes, and multiple metrics. | [reference](references/components/t7-06.md) |

## s

| ID | Summary | Use for | Avoid | Details |
| --- | --- | --- | --- | --- |
| fx-01 | 英文标签+主标题+渐变分割线 | Chapter title or core viewpoint with a short English label and short title. | Avoid paragraphs and data lists. | [reference](references/components/fx-01.md) |
| fx-02 | 英文标签+主标题+渐变线+线下方小字 | Chapter title with a short supporting line. | Avoid long body copy and data. | [reference](references/components/fx-02.md) |
| fx-03 | 渐变警示条(菱形感叹号) | Warning, risk, or negative conclusion. | Avoid neutral exposition. | [reference](references/components/fx-03.md) |
| fx-04 | 大标题+指标块列表 | Capability or metric overview with exactly 4 items. | Avoid fewer or more than 4 items and prose paragraphs. | [reference](references/components/fx-04.md) |
| fx-05 | 竖线+胶囊标签+双行标题 | Two-line theme title with category tags; use 1-3 tags. | Avoid long paragraphs and more than 3 tags. | [reference](references/components/fx-05.md) |
| fx-06 | 大标题+多行列表 | Process or step explanation with 2-3 steps. | Avoid a single scalar summary and more than 3 steps. | [reference](references/components/fx-06.md) |
| fx-07 | 大标题+多行列表卡片 | Parallel feature or viewpoint cards with 2-4 cards. | Avoid a single narrative and more than 4 cards. | [reference](references/components/fx-07.md) |
| fx-08 | 大标题+多进度条 | Progress, score, or percentage comparison with 2-4 bars. | Avoid non-comparative prose and more than 4 bars. | [reference](references/components/fx-08.md) |
| fx-09 | 深色渐变数字卡片 | Single core KPI, count, or growth value. | Avoid multiple metrics and paragraphs. | [reference](references/components/fx-09.md) |

## text-line

| ID | Summary | Use for | Avoid | Details |
| --- | --- | --- | --- | --- |
| t1-01 | 顶部标签+英文标签+主标题副标题 | Chapter opening or technology topic introduction. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-01.md) |
| t1-02 | 左侧竖线引用注释 | Quote, highlighted viewpoint, or key sentence; use 1-3 text lines. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-02.md) |
| t1-03 | 顶部小字注解+主标题 | Small annotation plus core conclusion with knowledge or fact emphasis. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-03.md) |
| t1-04 | 小标题-主标题-副标题层级 | Three-level section hierarchy. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-04.md) |
| t1-05 | 主标题副标题+底部渐变线 | Main title plus short explanation for a viewpoint summary or transition. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-05.md) |
| t1-06 | 英文标签+主标题副标题+底部渐变线 | English label plus topic title for a technology or product chapter opening. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-06.md) |
| t1-07 | 顶部标签+主标题+辅助说明 | Section label, main title, and one-line explanation for a feature introduction. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-07.md) |
| t1-08 | 顶部锚点标签+主标题+正文段落 | Topic label, main title, and explanatory paragraph; use 2-4 body lines. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-08.md) |
| t1-09 | 主文本块底部注释 | Highlighted body with footnote or source for a definition, quotation, or supporting note. | Avoid metrics, processes, lists, charts, and long overflow text. | [reference](references/components/t1-09.md) |

## timeline-flow

| ID | Summary | Use for | Avoid | Details |
| --- | --- | --- | --- | --- |
| t6-01 | 竖向时间轴时间线 | Product or project evolution timeline with 2-3 nodes. | Avoid unrelated prose, metrics, charts, and more than 3 nodes. | [reference](references/components/t6-01.md) |
| t6-02 | 多节点横向箭头数据流 | Data flow or pipeline with 2-4 nodes. | Avoid unrelated prose, metrics, charts, and more than 4 nodes. | [reference](references/components/t6-02.md) |
| t6-03 | 分段进度条指标 | Single completion or progress metric. | Avoid unrelated prose, processes, lists, timelines, charts, and content beyond the stated capacity. | [reference](references/components/t6-03.md) |
| t6-04 | 单输入双分支分叉流向 | Single input with two branch paths. | Avoid unrelated lists, timelines, charts, and long paragraphs. | [reference](references/components/t6-04.md) |
| t6-05 | 节点分步入场时间线 | Step-by-step workflow timeline with 2-4 nodes. | Avoid unrelated prose, metrics, charts, and more than 4 nodes. | [reference](references/components/t6-05.md) |
| t6-06 | 多步骤向上浮动递进时间线 | Iterative multi-step process with 2-4 steps. | Avoid unrelated prose, metrics, charts, and more than 4 steps. | [reference](references/components/t6-06.md) |
