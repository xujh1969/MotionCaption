import React from 'react';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../remotion/catalog';
import { CONFIGS, defaultConfig, type PropDef } from '../remotion/config';
import * as propertyPanel from '../app/PropertyPanel';
import { adaptLegacyCatalog, adaptLegacyComponent, applySelectionDraft } from './legacyAdapter';
import { createEffectRegistry, effectRegistry } from './registry';
import type { ComponentDef, EffectDefinition } from './types';

const component: React.FC = () => null;

const componentDef = (id: string): ComponentDef => ({
  id,
  name: id,
  category: 'test',
  component,
});

const prop = (key = 'titleText'): PropDef => ({
  key,
  label: key,
  kind: 'text',
  default: 'legacy default',
});

const definition = (id: string): EffectDefinition =>
  adaptLegacyComponent(componentDef(id), [prop()], { titleText: 'resolved default' });

describe('effect registry validation', () => {
  it('rejects duplicate effect IDs instead of overwriting them', () => {
    expect(() => createEffectRegistry([definition('same'), definition('same')])).toThrow(
      /Duplicate effect ID: same/,
    );
  });

  it('rejects a missing component', () => {
    const invalid = { ...definition('missing-component'), component: undefined } as unknown as EffectDefinition;
    expect(() => createEffectRegistry([invalid])).toThrow(/Missing component: missing-component/);
  });

  it('rejects a missing resolved default value', () => {
    const invalid = definition('missing-default');
    invalid.props.titleText.default = undefined;
    expect(() => createEffectRegistry([invalid])).toThrow(
      /Missing default value: missing-default\.titleText/,
    );
  });

  it.each([
    { width: 0, height: 1080 },
    { width: 1920, height: -1 },
    { width: Number.NaN, height: 1080 },
  ])('rejects an invalid footprint: %j', (footprint) => {
    const invalid = definition('bad-footprint');
    invalid.layout.footprint = footprint;
    expect(() => createEffectRegistry([invalid])).toThrow(/Invalid footprint: bad-footprint/);
  });

  it('throws when an unknown effect is requested', () => {
    const registry = createEffectRegistry([definition('known')]);
    expect(() => registry.get('unknown')).toThrow(/Unknown effect definition: unknown/);
  });

  it.each([
    { key: 'titleColor', kind: 'color' as const, default: '#fff', role: 'style' as const },
    { key: 'titleSize', kind: 'number' as const, default: 48, role: 'style' as const },
    { key: 'posX', kind: 'number' as const, default: 0, role: 'layout' as const },
    { key: 'gap', kind: 'number' as const, default: 12, role: 'style' as const },
  ])('rejects %s props incorrectly opened through contentRoles', (legacy) => {
    const invalid = adaptLegacyComponent(
      componentDef(`invalid-${legacy.key}`),
      [{ ...legacy, label: legacy.key }],
      { [legacy.key]: legacy.default },
    );
    const opened = applySelectionDraft(invalid, {
      summary: invalid.name,
      suitableFor: ['invalid'],
      avoidFor: ['invalid'],
      semanticFamilies: ['label'],
      contentRoles: { [legacy.key]: 'label' },
    });

    expect(() => createEffectRegistry([opened])).toThrow(
      new RegExp(`Agent-editable non-content prop: invalid-${legacy.key}\\.${legacy.key}`),
    );
  });
});

describe('legacy adapter parity', () => {
  it('rejects orphan configuration IDs', () => {
    const catalog = [componentDef('known')];
    const configs = { known: [prop()], orphan: [prop()] };
    expect(() => adaptLegacyCatalog(catalog, configs, () => ({ titleText: 'resolved' }))).toThrow(
      /Orphan configuration: orphan/,
    );
  });

  it('rejects catalog definitions without configuration', () => {
    expect(() => adaptLegacyCatalog([componentDef('unknown')], {}, () => ({}))).toThrow(
      /Missing configuration: unknown/,
    );
  });

  it('keeps every adapter-generated field locked for agents', () => {
    const adapted = adaptLegacyComponent(componentDef('locked'), [prop()], {
      titleText: 'resolved default',
    });
    expect(Object.values(adapted.props).every(({ agentEditable }) => !agentEditable)).toBe(true);
  });
});

describe('migrated effect registry', () => {
  it('derives a bounded planning footprint from real legacy anchors', () => {
    // footprint = min(半画布, 画布 - 默认锚点)。默认锚点可能被 bake 成用户保存的位置，
    // 因此期望值从 config DEFAULTS 派生而非硬编码。
    const d = defaultConfig('t1-01');
    expect(effectRegistry.get('t1-01').layout.footprint).toEqual({
      width: Math.max(1, Math.min(960, 1920 - (d.posX as number))),
      height: Math.max(1, Math.min(540, 1080 - (d.posY as number))),
    });
    expect(effectRegistry.get('t1-01').layout.footprint).not.toEqual({ width: 1920, height: 1080 });
  });

  it('keeps all 61 IDs in the frozen category order', () => {
    expect(effectRegistry.list().map(({ id }) => id)).toEqual([
      'fx-01', 'fx-02', 'fx-03', 'fx-04', 'fx-05', 'fx-06', 'fx-07', 'fx-08', 'fx-09',
      't1-01', 't1-02', 't1-03', 't1-04', 't1-05', 't1-06', 't1-07', 't1-08', 't1-09',
      't2-01', 't2-02', 't2-03',
      't3-01', 't3-02', 't3-03', 't3-04', 't3-05', 't3-06',
      't4-01', 't4-02', 't4-03', 't4-04', 't4-05', 't4-06', 't4-07', 't4-08', 't4-09',
      't5-01', 't5-02', 't5-03', 't5-04', 't5-05', 't5-06',
      't6-01', 't6-02', 't6-03', 't6-04', 't6-05', 't6-06', 't6-07', 't6-08',
      't7-01', 't7-02', 't7-03', 't7-04', 't7-05', 't7-06', 't7-07', 't7-08', 't7-09', 't7-10', 't7-11',
    ]);
  });
  it('has one definition for every frozen catalog component', () => {
    expect(effectRegistry.list()).toHaveLength(CATALOG.length);
  });

  it('has no CONFIGS or definition orphans', () => {
    const catalogIds = new Set(CATALOG.map(({ id }) => id));
    const registryIds = new Set(effectRegistry.list().map(({ id }) => id));

    expect(Object.keys(CONFIGS).filter((id) => !catalogIds.has(id))).toEqual([]);
    expect([...registryIds].filter((id) => !catalogIds.has(id))).toEqual([]);
    expect([...catalogIds].filter((id) => !registryIds.has(id))).toEqual([]);
  });

  it('preserves every resolved default configuration value', () => {
    for (const definition of effectRegistry.list()) {
      const expected = defaultConfig(definition.id);
      const actual = Object.fromEntries(
        Object.entries(definition.props).map(([key, value]) => [key, value.default]),
      );
      expect(actual, definition.id).toEqual(expected);
    }
  });

  it('only exposes content fields to agents in formal category definitions', () => {
    for (const definition of effectRegistry.list()) {
      for (const propDefinition of Object.values(definition.props)) {
        expect(
          !propDefinition.agentEditable || propDefinition.role === 'content',
          `${definition.id}.${propDefinition.legacy.key}`,
        ).toBe(true);
      }
    }
  });

  it.each([
    ['fx-01', 'titleText'],
    ['t1-01', 'titleText'],
    ['t2-01', 'contentText'],
    ['t3-01', 'value'],
    ['t4-01', 'steps'],
    ['t5-01', 'items'],
    ['t6-01', 'nodes'],
    ['t7-01', 'titleText'],
  ])('classifies a real content field in %s', (id, key) => {
    expect(effectRegistry.get(id).props[key].agentEditable).toBe(true);
  });

  it('keeps style and layout controls locked', () => {
    const definition = effectRegistry.get('t1-01');
    expect(definition.props.titleSize.agentEditable).toBe(false);
    expect(definition.props.titleColor.agentEditable).toBe(false);
    expect(definition.props.posX.agentEditable).toBe(false);
    expect(definition.props.scale.agentEditable).toBe(false);
  });

  it.each([
    ['fx-04', 'items', ['name', 'val']],
    ['fx-08', 'bars', ['g', 'n']],
    ['t3-04', 'rows', ['d', 'k', 'v']],
    ['t4-02', 'nodes', ['cn', 'en']],
    ['t5-02', 'items', ['d', 't', 'tag']],
    ['t5-05', 'cards', ['main', 'small']],
    ['t5-06', 'items', ['label', 'title']],
    ['t7-01', 'items', ['cat', 'val']],
    ['t7-03', 'segs', ['name', 'pct']],
    ['t7-04', 'lines', ['data', 'name']],
  ] as const)('opens reviewed content keys while locking mixed list style/animation keys for %s', (id, key, fields) => {
    const prop = effectRegistry.get(id).props[key];
    expect(prop.agentEditable).toBe(true);
    expect(prop.agentEditableItemFields).toEqual(fields);
    const locked = prop.legacy.listFields?.filter(({ key: field }) => !fields.includes(field as never)) ?? [];
    expect(locked.length).toBeGreaterThan(0);
    expect(locked.every(({ key: field, kind }) => kind === 'color' || field === 'at' || field === 'hl')).toBe(true);
  });

  it('only mentions editable legacy content fields in suitableFor', () => {
    for (const definition of effectRegistry.list()) {
      const suitableFor = definition.selection.suitableFor.join(' ');
      for (const prop of definition.legacyProps) {
        const formal = definition.props[prop.key];
        if (!formal.agentEditable) {
          expect(suitableFor, `${definition.id}.${prop.key}`).not.toContain(prop.label);
        }
      }
    }
  });

  it('publishes approved selection metadata instead of field-description drafts', () => {
    for (const definition of effectRegistry.list()) {
      expect(definition.selection.summary).toBe(definition.name);
      expect(definition.selection.suitableFor.length, definition.id).toBeGreaterThan(0);
      expect(definition.selection.avoidFor.length, definition.id).toBeGreaterThan(0);
      expect(definition.selection.semanticFamilies.length, definition.id).toBeGreaterThan(0);
      expect(definition.selection.suitableFor.join(' '), definition.id).not.toMatch(/使用现有.*字段/);
      expect(definition.selection.avoidFor.join(' '), definition.id).not.toMatch(/字段结构不同于/);
      expect(definition.selection.avoidFor.join(' '), definition.id).not.toContain('需要动态增减重复条目');
    }
  });

  it('publishes every approved item capacity', () => {
    const capacities: Record<string, [number, number]> = {
      'fx-04': [4, 4],
      'fx-05': [1, 3],
      'fx-06': [2, 3],
      'fx-07': [2, 4],
      'fx-08': [2, 4],
      't3-04': [2, 4],
      't3-05': [2, 3],
      't3-06': [1, 2],
      't4-01': [2, 4],
      't4-02': [2, 4],
      't4-03': [2, 4],
      't4-04': [2, 4],
      't4-05': [2, 4],
      't4-06': [2, 4],
      't4-07': [2, 4],
      't4-08': [2, 4],
      't4-09': [2, 5],
      't5-01': [2, 3],
      't5-02': [2, 3],
      't5-03': [2, 3],
      't5-04': [2, 4],
      't5-05': [2, 3],
      't5-06': [2, 3],
      't6-01': [2, 3],
      't6-02': [2, 4],
      't6-05': [2, 4],
      't6-06': [2, 4],
      't6-07': [2, 5],
      't6-08': [2, 5],
      't7-01': [2, 4],
      't7-02': [2, 3],
      't7-03': [2, 3],
      't7-04': [2, 2],
      't7-05': [2, 3],
      't7-07': [2, 4],
      't7-08': [3, 6],
      't7-09': [2, 4],
      't7-11': [3, 6],
    };

    for (const definition of effectRegistry.list()) {
      const expected = capacities[definition.id];
      expect(
        [definition.selection.minItems, definition.selection.maxItems],
        definition.id,
      ).toEqual(expected ?? [undefined, undefined]);
    }
  });

  it.each([
    ['fx-01', 'chapter title', 'short English label'],
    ['fx-03', 'warning', 'negative conclusion'],
    ['fx-04', 'capability', 'metric overview'],
    ['t1-02', 'quote', 'highlighted viewpoint'],
    ['t1-08', 'explanatory paragraph', 'topic label'],
    ['t2-01', 'key viewpoint', 'conclusion card'],
    ['t3-04', 'data display', '2-4'],
    ['t4-01', 'process', '2-4'],
    ['t6-01', 'timeline', '2-3'],
    ['t7-03', 'composition', '100 percent'],
    ['t7-04', 'two-subject trend', '3-6 time points'],
    ['t7-06', 'completion rate', '0-100 percent'],
  ])('publishes the approved real scene for %s', (id, ...phrases) => {
    const suitableFor = effectRegistry.get(id).selection.suitableFor.join(' ');
    expect(suitableFor.toLowerCase(), id).toEqual(expect.stringContaining(phrases[0].toLowerCase()));
    for (const phrase of phrases.slice(1)) {
      expect(suitableFor.toLowerCase(), id).toEqual(expect.stringContaining(phrase.toLowerCase()));
    }
  });

  it('keeps t7-06 percent bounded to 0-100', () => {
    expect(effectRegistry.get('t7-06').props.percent.legacy).toMatchObject({ min: 0, max: 100 });
  });

  it('derives the frozen property-panel definitions from the registry', () => {
    const panelDefinitionsFor = (propertyPanel as typeof propertyPanel & {
      panelDefinitionsFor?: (id: string) => PropDef[];
    }).panelDefinitionsFor;

    expect(panelDefinitionsFor).toBeTypeOf('function');
    for (const { id } of CATALOG) {
      expect(panelDefinitionsFor?.(id), id).toEqual(CONFIGS[id]);
    }
    expect(panelDefinitionsFor?.('unknown')).toEqual([]);
  });
});
