import { CATALOG } from '../../remotion/catalog';
import { CONFIGS, defaultConfig, type PropDef } from '../../remotion/config';
import {
  adaptLegacyComponent,
  applySelectionDraft,
  legacyPropIsAgentEditable,
  METRIC_NUMBER_KEYS as metricKeys,
} from '../legacyAdapter';
import type { EffectDefinition, SemanticRole } from '../types';


const semanticRoleOf = (definition: PropDef): SemanticRole | undefined => {
  if (definition.kind === 'list') return 'items';
  if (definition.kind === 'number') return metricKeys.has(definition.key) ? 'metric' : undefined;
  if (definition.kind !== 'text') return undefined;
  if (/title/i.test(definition.key) || definition.label.includes('标题')) return 'title';
  if (/numText/i.test(definition.key)) return 'metric';
  if (
    /(body|content|quote|desc|note|foot|source|slogan)/i.test(definition.key)
    || /(正文|内容|引用|说明|注释)/.test(definition.label)
  ) {
    return 'body';
  }
  return 'label';
};

const editableSemanticRoleOf = (definition: PropDef): SemanticRole | undefined => {
  return legacyPropIsAgentEditable(definition) ? semanticRoleOf(definition) : undefined;
};

type SelectionMetadata = Pick<
  EffectDefinition['selection'],
  'suitableFor' | 'avoidFor' | 'minItems' | 'maxItems' | 'motion'
>;

const scalarAvoid = 'Avoid metrics, processes, lists, charts, and long overflow text.';
const cardAvoid = 'Avoid lists, processes, metric comparisons, charts, and long paragraphs.';
const dataAvoid = 'Avoid unrelated prose, processes, lists, timelines, charts, and content beyond the stated capacity.';
const selectionMetadata: Record<string, SelectionMetadata> = {
  'fx-01': { suitableFor: ['Chapter title or core viewpoint with a short English label and short title.'], avoidFor: ['Avoid paragraphs and data lists.'], motion: '整组淡入+上浮一次成型（Expo 缓出），无分步无点缀；稳重开场横幅。' },
  'fx-02': { suitableFor: ['Chapter title with a short supporting line.'], avoidFor: ['Avoid long body copy and data.'], motion: '整组淡入+上浮一次成型，标题下多一行半透明小字；适合带副句的章头。' },
  'fx-03': { suitableFor: ['Warning, risk, or negative conclusion.'], avoidFor: ['Avoid neutral exposition.'], motion: '警示条整条淡入上浮；红调渐变底+发光描边+菱形感叹号，静态强调，无往复。' },
  'fx-04': { suitableFor: ['Capability or metric overview with exactly 4 items.'], avoidFor: ['Avoid fewer or more than 4 items and prose paragraphs.'], minItems: 4, maxItems: 4, motion: '金边外框先淡入，4 个指标块自左向右逐个淡入（每块间隔约 0.33s）。' },
  'fx-05': { suitableFor: ['Two-line theme title with category tags; use 1-3 tags.'], avoidFor: ['Avoid long paragraphs and more than 3 tags.'], minItems: 1, maxItems: 3, motion: '整组淡入+上浮一次成型（主题色竖线+实心胶囊+双行标题+小标签组），无逐层；信息密度高。' },
  'fx-06': { suitableFor: ['Process or step explanation with 2-3 steps.'], avoidFor: ['Avoid a single scalar summary and more than 3 steps.'], minItems: 2, maxItems: 3, motion: '外框淡入后标题单独淡入，步骤行逐个浮现（每行间隔约 0.47s），底部脚注随之出现。' },
  'fx-07': { suitableFor: ['Parallel feature or viewpoint cards with 2-4 cards.'], avoidFor: ['Avoid a single narrative and more than 4 cards.'], minItems: 2, maxItems: 4, motion: '外框淡入后标题单独淡入，小卡片逐个浮现（两列网格、每张间隔约 0.4s）。' },
  'fx-08': { suitableFor: ['Progress, score, or percentage comparison with 2-4 bars.'], avoidFor: ['Avoid non-comparative prose and more than 4 bars.'], minItems: 2, maxItems: 4, motion: '外框淡入后标题单独淡入，进度条逐行从左向右生长并淡入（每行间隔约 0.4s）；运动感最强的 fx 组件。' },
  'fx-09': { suitableFor: ['Single core KPI, count, or growth value.'], avoidFor: ['Avoid multiple metrics and paragraphs.'], motion: '整卡淡入，核心数字滚动计数约 1.3s 并带渐变与呼吸微光，底部出处随后淡入；单 KPI 高光。' },

  't1-01': { suitableFor: ['Chapter opening or technology topic introduction.'], avoidFor: [scalarAvoid], motion: '右侧四层文字（标签/英文/主标题/副标题）逐层上浮入场，每层间隔约 0.5s，顶部标签带呼吸。' },
  't1-02': { suitableFor: ['Quote, highlighted viewpoint, or key sentence; use 1-3 text lines.'], avoidFor: [scalarAvoid], motion: '左侧竖线先自上而下生长，引用文字与底部注释先后淡入（注释轻微呼吸）；观点/引用质感。' },
  't1-03': { suitableFor: ['Small annotation plus core conclusion with knowledge or fact emphasis.'], avoidFor: [scalarAvoid], motion: '小字注解先上浮，主标题稍后上浮；两段式、轻快利落。' },
  't1-04': { suitableFor: ['Three-level section hierarchy.'], avoidFor: [scalarAvoid], motion: '小标题、主标题、副标题三层逐层上浮入场，每层间隔约 0.5s；标准章节层级。' },
  't1-05': { suitableFor: ['Main title plus short explanation for a viewpoint summary or transition.'], avoidFor: ['Avoid two-sided comparisons that emphasise one side (e.g. quantity contrasts such as "150 vs 10"), metrics, lists, and long paragraphs.'], motion: '标题与副标题先后淡入，底部渐变线随后从左向右生长并带呼吸；收尾有动感。' },
  't1-06': { suitableFor: ['English label plus topic title for a technology or product chapter opening.'], avoidFor: [scalarAvoid], motion: '英文标签、主标题、副标题逐层上浮，底部线最后自中心向两侧展开并带呼吸；比 t1-05 更对称。' },
  't1-07': { suitableFor: ['Section label, main title, and one-line explanation for a feature introduction.'], avoidFor: [scalarAvoid], motion: '顶部小标先淡入，主标题与说明文字依次上浮；三行快节奏，适合功能条目。' },
  't1-08': { suitableFor: ['Topic label, main title, and explanatory paragraph; use 2-4 body lines.'], avoidFor: [scalarAvoid], motion: '标签与标题依次上浮，正文整体淡入，{{重点词}} 高亮并带呼吸；适合观点段+强调词。' },
  't1-09': { suitableFor: ['Highlighted body with footnote or source for a definition, quotation, or supporting note.'], avoidFor: [scalarAvoid], motion: '正文块先上浮淡入，底部注释随后淡入并轻微呼吸；定义/出处引用。' },

  't2-01': { suitableFor: ['Key viewpoint, quotation, reminder, or conclusion card; use 1-3 body lines.'], avoidFor: [cardAvoid] },
  't2-02': { suitableFor: ['Section label plus core title for a transition or product feature heading.'], avoidFor: [cardAvoid] },
  't2-03': { suitableFor: ['Title plus short explanation for a concept, feature, or key information.'], avoidFor: [cardAvoid] },

  't3-01': { suitableFor: ['Single KPI or numeric data display.'], avoidFor: [dataAvoid] },
  't3-02': { suitableFor: ['Single metric with a prefix label and unit.'], avoidFor: [dataAvoid] },
  't3-03': { suitableFor: ['Two-value metric comparison.'], avoidFor: [dataAvoid] },
  't3-04': { suitableFor: ['Multi-row key-value data display with 2-4 rows.'], avoidFor: ['Avoid narrative paragraphs, processes, timelines, and more than 4 rows.'], minItems: 2, maxItems: 4 },

  't3-05': { suitableFor: ['KPI, result, or performance metrics with 2-3 cards where each metric needs a number and a unit.'], avoidFor: ['Avoid narrative prose, processes, timelines, charts, and more than 3 cards.'], minItems: 2, maxItems: 3, motion: '卡片自左向右逐个渐亮（0.18→1.0，每张约 500ms），数字同步滚动计数（约 800ms 静止），底部迷你条形随点亮生长。' },
  't3-06': { suitableFor: ['Two-sided comparison such as old vs new or plan A vs plan B, with 1-2 comparison groups and 2-3 bullet points per side.'], avoidFor: ['Avoid single-sided lists, metrics without contrast, timelines, and more than 2 groups.'], minItems: 1, maxItems: 2, motion: '按「组」依次入场；组内左右两卡可分别设定出现时间（右卡 atB 留空时与左卡同步点亮），卡片上浮淡入，要点逐条上浮淡入跟进（间距由 staggerMs 控制），可跟着口播左右分开起落。' },

  't4-01': { suitableFor: ['Process or step explanation with 2-4 steps.'], avoidFor: ['Avoid scalar summaries, unrelated charts, and more than 4 steps.'], minItems: 2, maxItems: 4 },
  't4-02': { suitableFor: ['Stage progression or process timeline with 2-4 nodes.'], avoidFor: ['Avoid unrelated prose, metrics, charts, and more than 4 nodes.'], minItems: 2, maxItems: 4 },
  't4-03': { suitableFor: ['Linear process, decision chain, or execution pipeline where steps complete one after another; 2-4 arrow-connected cards.'], avoidFor: ['Avoid unordered parallel points, metric comparisons, charts, and more than 4 cards.'], minItems: 2, maxItems: 4, motion: '小标题与主标题先淡入；卡片自左向右逐个渐亮（0.15→1.0，每项约 500ms），箭头跟随左侧卡片颜色同步点亮，已点亮的不褪色。' },
  't4-04': { suitableFor: ['Additive composition where several elements combine into one result (A + B + C); 2-4 cards.'], avoidFor: ['Avoid sequential cause-effect processes, metrics, charts, and more than 4 cards.'], minItems: 2, maxItems: 4, motion: '卡片与「+」连接符自左向右逐个渐亮（0.18→1.0，每项约 480ms），加号与右侧卡片同步点亮。' },
  't4-05': { suitableFor: ['Parallel peer items such as capability, task, or acceptance checklists with 2-4 cards and no connectors.'], avoidFor: ['Avoid sequential processes, cause-effect chains, metrics, and more than 4 cards.'], minItems: 2, maxItems: 4, motion: '并列卡片各自独立渐亮（0.18→1.0，每张约 480ms），对勾标记同步清晰化，无连接线。' },
  't4-06': { suitableFor: ['Ordered numbered steps where each card carries a title and a one-line subtitle; 2-4 cards.'], avoidFor: ['Avoid unordered lists, metrics, charts, and more than 4 cards.'], minItems: 2, maxItems: 4, motion: '序号步骤卡片自左向右逐个渐亮（0.18→1.0，每张约 500ms），序号与边框同色，点亮后带同色外发光。' },

  't4-07': { suitableFor: ['Linear ordered steps with 2-4 arrow-connected cards where each step carries a title and a one-line description.'], avoidFor: ['Avoid unordered parallel points, metrics, charts, and more than 4 cards.'], minItems: 2, maxItems: 4, motion: '卡片自左向右逐个渐亮（0.18→1.0，每张约 500ms），前一卡到当前卡的箭头同步点亮并继承左侧卡片颜色，已走过的箭头保持高亮。' },
  't4-08': { suitableFor: ['Parallel capability, feature, or value-point inventory with 2-4 cards, each with an icon, a title, and a short line.'], avoidFor: ['Avoid sequential cause-effect processes, metrics, charts, and more than 4 cards.'], minItems: 2, maxItems: 4, motion: '卡片逐个渐亮（0.18→1.0，每张约 480ms），点亮后图标带 1400ms 周期的呼吸光，未入场无光效。' },
  't4-09': { suitableFor: ['Short keyword, feature tag, or concept highlights with 2-5 badges and no subtitles.'], avoidFor: ['Avoid long sentences, paragraphs, metrics, processes, and more than 5 badges.'], minItems: 2, maxItems: 5, motion: '胶囊标签自左向右快速渐亮（0.18→1.0，每个约 380ms），前置小圆点同步点亮。' },

  't4-10': { suitableFor: ['Multi-stage pipeline, project progress, or phase hand-off shown as a bottom-zone capsule slider sweeping a gradient fill across 2-5 stage labels.'], avoidFor: ['Avoid dense metrics, charts, long sentences, and more than 5 stages.'], minItems: 2, maxItems: 5, motion: '胶囊标签沿底部轨道自左向右拖拽（紫→橙→黄渐变条同步延展，每段 ease-out），阶段文字依次点亮：已过=浅蓝白、当前=白色、未到=灰色，黄色指示点呼吸发光。胶囊内为固定文字（capLabel，如 "Auto"），留空则跟随当前激活阶段名。' },

  't5-01': { suitableFor: ['Vertical capability or item list with 2-3 items.'], avoidFor: ['Avoid charts, long paragraphs, and more than 3 items.'], minItems: 2, maxItems: 3 },
  't5-02': { suitableFor: ['Status-tagged task list with 2-3 items.'], avoidFor: ['Avoid charts, long paragraphs, and more than 3 items.'], minItems: 2, maxItems: 3 },
  't5-03': { suitableFor: ['Numbered optimization directions with 2-3 items.'], avoidFor: ['Avoid charts, long paragraphs, and more than 3 items.'], minItems: 2, maxItems: 3 },
  't5-04': { suitableFor: ['Key-value information list with 2-4 items.'], avoidFor: ['Avoid charts, long paragraphs, and more than 4 items.'], minItems: 2, maxItems: 4 },
  't5-05': { suitableFor: ['Parallel status or label cards with 2-3 cards.'], avoidFor: ['Avoid charts, long paragraphs, and more than 3 cards.'], minItems: 2, maxItems: 3 },
  't5-06': { suitableFor: ['Multi-column issue list with 2-3 items.'], avoidFor: ['Avoid charts, long paragraphs, and more than 3 items.'], minItems: 2, maxItems: 3 },

  't6-01': { suitableFor: ['Product or project evolution timeline with 2-3 nodes.'], avoidFor: ['Avoid unrelated prose, metrics, charts, and more than 3 nodes.'], minItems: 2, maxItems: 3 },
  't6-02': { suitableFor: ['Data flow or pipeline with 2-4 nodes.'], avoidFor: ['Avoid unrelated prose, metrics, charts, and more than 4 nodes.'], minItems: 2, maxItems: 4 },
  't6-03': { suitableFor: ['Single completion or progress metric.'], avoidFor: [dataAvoid] },
  't6-04': { suitableFor: ['Single input with two branch paths.'], avoidFor: ['Avoid unrelated lists, timelines, charts, and long paragraphs.'] },
  't6-05': { suitableFor: ['Step-by-step workflow timeline with 2-4 nodes.'], avoidFor: ['Avoid unrelated prose, metrics, charts, and more than 4 nodes.'], minItems: 2, maxItems: 4 },
  't6-06': { suitableFor: ['Iterative multi-step process with 2-4 steps.'], avoidFor: ['Avoid unrelated prose, metrics, charts, and more than 4 steps.'], minItems: 2, maxItems: 4 },
  't6-07': { suitableFor: ['Vertical ordered steps where each step is narrated in its own cue and should be highlighted one by one (focus-scroll stepper).'], avoidFor: ['Avoid scalar summaries, unordered lists, metric charts, and more than 5 items.'], minItems: 2, maxItems: 5, motion: '左侧安全区步骤列表（序号方块+连接线+步骤文本）：首条即高亮，之后每条目在自身时段渐入放大成当前焦点（前一条目同步缩小变白），连接线红色段逐段下行，末段整体 600ms 淡出。' },

  't6-08': { suitableFor: ['Many ordered steps that no longer fit horizontally; use 2-5 vertical stack entries narrated one by one.'], avoidFor: ['Avoid unordered lists, scalar summaries, metric charts, and more than 5 entries.'], minItems: 2, maxItems: 5, motion: '条目自上而下依次渐亮（0.18→1.0，每条约 420ms），序号块随进度点亮（当前红、已过转灰），垂向连接线红色段同步向下延伸。' },

  't7-01': { suitableFor: ['Vertical category-value comparison with 2-4 bars.'], avoidFor: ['Avoid large datasets, precision analysis, complex axes, and more than 4 bars.'], minItems: 2, maxItems: 4 },
  't7-02': { suitableFor: ['Horizontal ranking or option comparison with 2-3 bars.'], avoidFor: ['Avoid large datasets, precision analysis, complex axes, and more than 3 bars.'], minItems: 2, maxItems: 3 },
  't7-03': { suitableFor: ['Composition or proportion with 2-3 segments; total should be 100 percent.'], avoidFor: ['Avoid large datasets, precision analysis, complex axes, and more than 3 segments.'], minItems: 2, maxItems: 3 },
  't7-04': { suitableFor: ['Two-subject trend comparison with exactly 2 lines and 3-6 time points.'], avoidFor: ['Avoid more than 2 lines, fewer than 3 or more than 6 time points, large datasets, and complex axes.'], minItems: 2, maxItems: 2 },
  't7-05': { suitableFor: ['KPI snapshot cards with 2-3 cards.'], avoidFor: ['Avoid large datasets, precision analysis, complex axes, and more than 3 cards.'], minItems: 2, maxItems: 3 },
  't7-06': { suitableFor: ['Single completion rate, score, or percentage from 0-100 percent.'], avoidFor: ['Avoid large datasets, precision analysis, complex axes, and multiple metrics.'] },
  't7-07': { suitableFor: ['Grouped A/B metric comparison with 2-4 categories and two series per category.'], avoidFor: ['Avoid single-series data, large datasets, precision analysis, complex axes, and more than 4 categories.'], minItems: 2, maxItems: 4, motion: '容器先整体渐亮，类别自左向右依次点亮，条形从 0 向上生长（约 600ms）并带单次斜向扫光。' },
  't7-08': { suitableFor: ['Time-series trend or growth curve with 3-6 sequential points.'], avoidFor: ['Avoid categorical comparisons, large datasets, complex axes, and fewer than 3 or more than 6 points.'], minItems: 3, maxItems: 6, motion: '折线自左向右生长绘制（约 700ms），数据点依次点亮（间隔约 180ms），绘制完成后光点沿折线循环巡游。' },
  't7-09': { suitableFor: ['Composition, share, or resource allocation with 2-4 ring segments; percentages should total 100.'], avoidFor: ['Avoid large datasets, precision analysis, time series, and more than 4 segments.'], minItems: 2, maxItems: 4, motion: '环形分段按数组顺序依次生长填充（每段约 550ms），中心数字同步计数跳变，图例随之点亮。' },
  't7-10': { suitableFor: ['Real-time signal, data stream, or performance fluctuation shown as a HUD waveform.'], avoidFor: ['Avoid categorical comparisons, large datasets, and precise labelled axes.'], motion: '波形自左向右一次性绘制（约 650ms），绘制完成后持续循环微小上下波动，模拟实时信号。' },
  't7-11': { suitableFor: ['Multi-dimensional capability scoring with 3-6 radar axes, each vertex scored 0-1 or 0-100.'], avoidFor: ['Avoid time series, categorical bar comparisons, large datasets, and fewer than 3 axes.'], minItems: 3, maxItems: 6, motion: '顶点按数组顺序依次点亮（间隔约 200ms），多边形轮廓随顶点逐个生长闭合，全部点亮后轮廓光点循环绕行。' },
};

const buildDefinition = (id: string): EffectDefinition => {
  const component = CATALOG.find((candidate) => candidate.id === id);
  if (!component) throw new Error(`Unknown catalog definition: ${id}`);
  const propDefinitions = CONFIGS[id];
  if (!propDefinitions) throw new Error(`Missing configuration: ${id}`);

  const selectionRoles = propDefinitions.flatMap((definition) => {
    const role = semanticRoleOf(definition);
    return role ? [role] : [];
  });
  const contentRoles = Object.fromEntries(
    propDefinitions.flatMap((definition) => {
      const role = editableSemanticRoleOf(definition);
      return role ? [[definition.key, role]] : [];
    }),
  );
  const semanticFamilies = [...new Set(selectionRoles)];
  const metadata = selectionMetadata[id];
  if (!metadata) throw new Error(`Missing approved selection metadata: ${id}`);

  const adapted = adaptLegacyComponent(component, propDefinitions, defaultConfig(id));
  return applySelectionDraft(adapted, {
    summary: component.name,
    ...metadata,
    semanticFamilies,
    contentRoles,
  });
};

export const defineCategory = (prefix: string): EffectDefinition[] =>
  CATALOG.filter(({ id }) => id.startsWith(`${prefix}-`)).map(({ id }) => buildDefinition(id));
