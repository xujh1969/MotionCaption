import { CATALOG } from '../../remotion/catalog';
import { CONFIGS, defaultConfig, type PropDef } from '../../remotion/config';
import {
  adaptLegacyComponent,
  applySelectionDraft,
  legacyPropIsAgentEditable,
} from '../legacyAdapter';
import type { EffectDefinition, SemanticRole } from '../types';

const metricKeys = new Set(['value', 'valueL', 'valueR', 'percent']);
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
  'suitableFor' | 'avoidFor' | 'minItems' | 'maxItems'
>;

const scalarAvoid = 'Avoid metrics, processes, lists, charts, and long overflow text.';
const cardAvoid = 'Avoid lists, processes, metric comparisons, charts, and long paragraphs.';
const dataAvoid = 'Avoid unrelated prose, processes, lists, timelines, charts, and content beyond the stated capacity.';
const selectionMetadata: Record<string, SelectionMetadata> = {
  'fx-01': { suitableFor: ['Chapter title or core viewpoint with a short English label and short title.'], avoidFor: ['Avoid paragraphs and data lists.'] },
  'fx-02': { suitableFor: ['Chapter title with a short supporting line.'], avoidFor: ['Avoid long body copy and data.'] },
  'fx-03': { suitableFor: ['Warning, risk, or negative conclusion.'], avoidFor: ['Avoid neutral exposition.'] },
  'fx-04': { suitableFor: ['Capability or metric overview with exactly 4 items.'], avoidFor: ['Avoid fewer or more than 4 items and prose paragraphs.'], minItems: 4, maxItems: 4 },
  'fx-05': { suitableFor: ['Two-line theme title with category tags; use 1-3 tags.'], avoidFor: ['Avoid long paragraphs and more than 3 tags.'], minItems: 1, maxItems: 3 },
  'fx-06': { suitableFor: ['Process or step explanation with 2-3 steps.'], avoidFor: ['Avoid a single scalar summary and more than 3 steps.'], minItems: 2, maxItems: 3 },
  'fx-07': { suitableFor: ['Parallel feature or viewpoint cards with 2-4 cards.'], avoidFor: ['Avoid a single narrative and more than 4 cards.'], minItems: 2, maxItems: 4 },
  'fx-08': { suitableFor: ['Progress, score, or percentage comparison with 2-4 bars.'], avoidFor: ['Avoid non-comparative prose and more than 4 bars.'], minItems: 2, maxItems: 4 },
  'fx-09': { suitableFor: ['Single core KPI, count, or growth value.'], avoidFor: ['Avoid multiple metrics and paragraphs.'] },

  't1-01': { suitableFor: ['Chapter opening or technology topic introduction.'], avoidFor: [scalarAvoid] },
  't1-02': { suitableFor: ['Quote, highlighted viewpoint, or key sentence; use 1-3 text lines.'], avoidFor: [scalarAvoid] },
  't1-03': { suitableFor: ['Small annotation plus core conclusion with knowledge or fact emphasis.'], avoidFor: [scalarAvoid] },
  't1-04': { suitableFor: ['Three-level section hierarchy.'], avoidFor: [scalarAvoid] },
  't1-05': { suitableFor: ['Main title plus short explanation for a viewpoint summary or transition.'], avoidFor: [scalarAvoid] },
  't1-06': { suitableFor: ['English label plus topic title for a technology or product chapter opening.'], avoidFor: [scalarAvoid] },
  't1-07': { suitableFor: ['Section label, main title, and one-line explanation for a feature introduction.'], avoidFor: [scalarAvoid] },
  't1-08': { suitableFor: ['Topic label, main title, and explanatory paragraph; use 2-4 body lines.'], avoidFor: [scalarAvoid] },
  't1-09': { suitableFor: ['Highlighted body with footnote or source for a definition, quotation, or supporting note.'], avoidFor: [scalarAvoid] },

  't2-01': { suitableFor: ['Key viewpoint, quotation, reminder, or conclusion card; use 1-3 body lines.'], avoidFor: [cardAvoid] },
  't2-02': { suitableFor: ['Section label plus core title for a transition or product feature heading.'], avoidFor: [cardAvoid] },
  't2-03': { suitableFor: ['Title plus short explanation for a concept, feature, or key information.'], avoidFor: [cardAvoid] },

  't3-01': { suitableFor: ['Single KPI or numeric data display.'], avoidFor: [dataAvoid] },
  't3-02': { suitableFor: ['Single metric with a prefix label and unit.'], avoidFor: [dataAvoid] },
  't3-03': { suitableFor: ['Two-value metric comparison.'], avoidFor: [dataAvoid] },
  't3-04': { suitableFor: ['Multi-row key-value data display with 2-4 rows.'], avoidFor: ['Avoid narrative paragraphs, processes, timelines, and more than 4 rows.'], minItems: 2, maxItems: 4 },

  't4-01': { suitableFor: ['Process or step explanation with 2-4 steps.'], avoidFor: ['Avoid scalar summaries, unrelated charts, and more than 4 steps.'], minItems: 2, maxItems: 4 },
  't4-02': { suitableFor: ['Stage progression or process timeline with 2-4 nodes.'], avoidFor: ['Avoid unrelated prose, metrics, charts, and more than 4 nodes.'], minItems: 2, maxItems: 4 },

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

  't7-01': { suitableFor: ['Vertical category-value comparison with 2-4 bars.'], avoidFor: ['Avoid large datasets, precision analysis, complex axes, and more than 4 bars.'], minItems: 2, maxItems: 4 },
  't7-02': { suitableFor: ['Horizontal ranking or option comparison with 2-3 bars.'], avoidFor: ['Avoid large datasets, precision analysis, complex axes, and more than 3 bars.'], minItems: 2, maxItems: 3 },
  't7-03': { suitableFor: ['Composition or proportion with 2-3 segments; total should be 100 percent.'], avoidFor: ['Avoid large datasets, precision analysis, complex axes, and more than 3 segments.'], minItems: 2, maxItems: 3 },
  't7-04': { suitableFor: ['Two-subject trend comparison with exactly 2 lines and 3-6 time points.'], avoidFor: ['Avoid more than 2 lines, fewer than 3 or more than 6 time points, large datasets, and complex axes.'], minItems: 2, maxItems: 2 },
  't7-05': { suitableFor: ['KPI snapshot cards with 2-3 cards.'], avoidFor: ['Avoid large datasets, precision analysis, complex axes, and more than 3 cards.'], minItems: 2, maxItems: 3 },
  't7-06': { suitableFor: ['Single completion rate, score, or percentage from 0-100 percent.'], avoidFor: ['Avoid large datasets, precision analysis, complex axes, and multiple metrics.'] },
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
