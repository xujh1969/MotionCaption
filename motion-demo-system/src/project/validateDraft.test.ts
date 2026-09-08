import React from 'react';
import { describe, expect, it } from 'vitest';
import { createEffectRegistry, effectRegistry } from '../effects/registry';
import type { EffectDefinition } from '../effects/types';
import type { AgentDraft, AgentInput } from './types';
import { validateAgentDraft } from './validateDraft';

const component: React.FC = () => null;
const definition = (
  id: string,
  options: { exclusive?: boolean; footprint?: { width: number; height: number } } = {},
): EffectDefinition => ({
  id,
  version: 1,
  name: id,
  category: 'test',
  component,
  legacyProps: [],
  selection: {
    summary: id,
    suitableFor: ['test'],
    avoidFor: ['test'],
    semanticFamilies: ['title'],
    minItems: 2,
    maxItems: 3,
  },
  props: {
    title: {
      type: 'text', label: 'title', default: 'default', required: true,
      role: 'content', agentEditable: true, semanticRole: 'title',
      legacy: { key: 'title', label: 'title', kind: 'text', default: 'default' },
    },
    value: {
      type: 'number', label: 'value', default: 0, required: false,
      role: 'content', agentEditable: true, semanticRole: 'metric', min: 0, max: 100,
      legacy: { key: 'value', label: 'value', kind: 'number', default: 0 },
    },
    unitText: {
      type: 'text', label: 'unit', default: '%', required: false,
      role: 'content', agentEditable: true, semanticRole: 'label',
      legacy: { key: 'unitText', label: 'unit', kind: 'text', default: '%' },
    },
    items: {
      type: 'list', label: 'items', default: [], required: false,
      role: 'content', agentEditable: true, semanticRole: 'items',
      agentEditableItemFields: ['label'],
      legacy: {
        key: 'items', label: 'items', kind: 'list', default: '[]',
        listFields: [{ key: 'label', label: 'label' }],
      },
    },
  },
  layout: {
    roles: ['title'],
    preferredZones: ['left-top'],
    footprint: options.footprint ?? { width: 1000, height: 700 },
    exclusive: options.exclusive ?? false,
  },
});

const registry = createEffectRegistry([definition('card'), definition('exclusive', { exclusive: true })]);
const input: AgentInput = {
  kind: 'captionforge.agent-input', schemaVersion: 1, componentLibraryVersion: 1,
  video: { width: 1920, height: 1080, fps: 30, durationMs: 5000 },
  cues: [
    { cueId: 'cue-1', startMs: 0, endMs: 1000, text: '增长 58%' },
    { cueId: 'cue-2', startMs: 900, endMs: 2000, text: '未使用字幕' },
  ],
};
const draft = (components: AgentDraft['scenes'][number]['components']): AgentDraft => ({
  kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
  scenes: [{ sceneId: 'scene-1', sourceCueIds: ['cue-1'], components }],
});

describe('validateAgentDraft hard errors', () => {
  it('returns one aggregate capacity error before validating 257 component bodies', () => {
    const oversized = draft(Array.from({ length: 257 }, (_, index) => ({
      componentId: 'missing', componentVersion: 1, role: `role-${index}`, content: {},
    })));

    expect(validateAgentDraft(oversized, input, registry)).toEqual({
      valid: false,
      errors: [expect.objectContaining({ code: 'effect_capacity', path: ['scenes'] })],
      warnings: [],
    });
  });

  it('returns capacity before component validation when existing and pending total exceeds 256', () => {
    const existing = Array.from({ length: 256 }, (_, index) => ({
      track: 0, startFrame: index * 2, durationInFrames: 1,
    }));

    expect(validateAgentDraft(draft([{
      componentId: 'missing', componentVersion: 1, role: 'pending', content: {},
    }]), input, registry, existing)).toEqual({
      valid: false,
      errors: [expect.objectContaining({ code: 'effect_capacity', path: ['scenes'] })],
      warnings: [],
    });
  });

  it('fails closed with a structured diagnostic when constrained search reaches its budget', () => {
    const result = validateAgentDraft(
      draft([
        { componentId: 'card', componentVersion: 1, role: 'A', content: { title: '增长' } },
        { componentId: 'card', componentVersion: 1, role: 'B', content: { title: '增长' } },
      ]),
      input,
      registry,
      [],
      { searchStepLimit: 1 },
    );

    expect(result.errors.map(({ code }) => code)).toContain('search_limit');
  });

  it('uses fixed project reservations for both feasible and impossible capacity checks', () => {
    const fixedBase = Array.from({ length: 62 }, (_, track) => ({
      track, startFrame: 0, durationInFrames: 70,
    }));
    const constrainedInput: AgentInput = {
      ...input,
      video: { ...input.video, fps: 1000, durationMs: 100 },
      cues: [
        { cueId: 'A', startMs: 0, endMs: 5, text: '增长' },
        { cueId: 'B', startMs: 4, endMs: 8, text: '增长' },
        { cueId: 'X', startMs: 4, endMs: 6, text: '增长' },
      ],
    };
    const scene = (sceneId: string): AgentDraft['scenes'][number] => ({
      sceneId,
      sourceCueIds: [sceneId],
      components: [{ componentId: 'card', componentVersion: 1, role: sceneId, content: { title: '增长' } }],
    });
    const feasible = { ...draft([]), scenes: [scene('A'), scene('B')] };
    const impossible = { ...draft([]), scenes: [scene('X')] };

    expect(validateAgentDraft(feasible, constrainedInput, registry, [
      ...fixedBase,
      { track: 63, startFrame: 5, durationInFrames: 5 },
    ]).valid).toBe(true);
    expect(validateAgentDraft(impossible, constrainedInput, registry, [
      ...fixedBase,
      { track: 62, startFrame: 0, durationInFrames: 5 },
      { track: 63, startFrame: 5, durationInFrames: 5 },
    ]).errors.map(({ code }) => code)).toContain('track_capacity');
  });

  it('accepts the reviewer order whose true maximum concurrency is 64', () => {
    const concurrencyInput: AgentInput = {
      ...input,
      video: { ...input.video, fps: 1000, durationMs: 100 },
      cues: [
        { cueId: 'base', startMs: 0, endMs: 70, text: '增长' },
        { cueId: 'v1', startMs: 0, endMs: 20, text: '增长' },
        { cueId: 'v4', startMs: 50, endMs: 70, text: '增长' },
        { cueId: 'v2', startMs: 10, endMs: 40, text: '增长' },
        { cueId: 'v3', startMs: 30, endMs: 60, text: '增长' },
      ],
    };
    const scene = (sceneId: string, count = 1): AgentDraft['scenes'][number] => ({
      sceneId,
      sourceCueIds: [sceneId],
      components: Array.from({ length: count }, (_, index) => ({
        componentId: 'card', componentVersion: 1, role: `${sceneId}-${index}`, content: { title: '增长' },
      })),
    });
    const concurrencyDraft: AgentDraft = {
      kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
      scenes: [scene('base', 62), scene('v1'), scene('v4'), scene('v2'), scene('v3')],
    };

    expect(validateAgentDraft(concurrencyDraft, concurrencyInput, registry).valid).toBe(true);
  });

  it('accepts 64 disjoint short intervals plus one full-span interval using only two tracks', () => {
    const shortCues = Array.from({ length: 64 }, (_, index) => ({
      cueId: `short-${index}`,
      startMs: index * 60,
      endMs: index * 60 + 30,
      text: '增长',
    }));
    const concurrencyInput = { ...input, cues: [...shortCues, { cueId: 'long', startMs: 0, endMs: 4000, text: '增长' }] };
    const concurrencyDraft: AgentDraft = {
      kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
      scenes: [
        ...shortCues.map((cue, index) => ({
          sceneId: `short-scene-${index}`,
          sourceCueIds: [cue.cueId],
          components: [{ componentId: 'card', componentVersion: 1, role: 'title', content: { title: '增长' } }],
        })),
        {
          sceneId: 'long-scene', sourceCueIds: ['long'],
          components: [{ componentId: 'card', componentVersion: 1, role: 'title', content: { title: '增长' } }],
        },
      ],
    };

    const result = validateAgentDraft(concurrencyDraft, concurrencyInput, registry);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects more than 64 simultaneous components before compilation', () => {
    const components = Array.from({ length: 65 }, (_, index) => ({
      componentId: 'card', componentVersion: 1, role: `role-${index}`, content: { title: '增长' },
    }));

    expect(validateAgentDraft(draft(components), input, registry).errors.map(({ code }) => code))
      .toContain('track_capacity');
  });
  it.each([
    ['schemaVersion', 2, 'schema_version'],
    ['componentLibraryVersion', 2, 'library_version'],
  ])('reports an incompatible %s as a version error', (field, value, code) => {
    const result = validateAgentDraft({ ...draft([]), [field]: value }, input, registry);
    expect(result.errors.map((error) => error.code)).toContain(code);
  });

  it('distinguishes schema, registry, source, type, required, capacity, and exclusivity errors', () => {
    const result = validateAgentDraft(draft([
      { componentId: 'missing', componentVersion: 1, role: 'title', content: {} },
      { componentId: 'card', componentVersion: 2, role: 'title', content: {
        unknown: 'x', value: '58', unitText: 'kg',
        items: [{ label: '1' }, { label: '2' }, { label: '3' }, { label: '4' }],
      } },
      { componentId: 'exclusive', componentVersion: 1, role: 'title', content: { title: 'x' } },
    ]), input, registry);

    expect(result.valid).toBe(false);
    expect(result.errors.map(({ code }) => code)).toEqual(expect.arrayContaining([
      'unknown_component', 'component_version', 'unknown_content_field', 'content_type',
      'required_content', 'list_capacity', 'exclusive_conflict',
    ]));
  });

  it('rejects missing cues', () => {
    const result = validateAgentDraft({
      ...draft([{ componentId: 'card', componentVersion: 1, role: 'metric', content: {
        title: 'growth', value: 99, unitText: '%', items: [{ label: 'a' }, { label: 'b' }],
      } }]),
      scenes: [{ ...draft([]).scenes[0], sourceCueIds: ['cue-missing'], components: draft([
        { componentId: 'card', componentVersion: 1, role: 'metric', content: {
          title: 'growth', value: 99, unitText: '%', items: [{ label: 'a' }, { label: 'b' }],
        } },
      ]).scenes[0].components }],
    }, input, registry);

    expect(result.errors.map(({ code }) => code)).toEqual(expect.arrayContaining([
      'unknown_cue',
    ]));
  });

  it('rejects malformed and unknown list item fields', () => {
    const result = validateAgentDraft(draft([{
      componentId: 'card', componentVersion: 1, role: 'items',
      content: { title: '58%', items: [1, { label: 2, extra: 'x' }] },
    }]), input, registry);

    expect(result.errors.map(({ code }) => code)).toEqual(expect.arrayContaining([
      'content_type', 'unknown_content_field',
    ]));
  });

  it('rejects list items missing declared fields', () => {
    const result = validateAgentDraft(draft([{
      componentId: 'card', componentVersion: 1, role: 'items',
      content: { title: '58%', items: [{}, { label: 'complete' }] },
    }]), input, registry);

    expect(result.errors.map(({ code }) => code)).toContain('required_content');
  });

  it('no longer blocks numeric claims — grounding is enforced at authoring time (2026-09-08 product decision)', () => {
    // 数字/单位溯源校验已移除：编造或转写形式的数字不再在导入侧拦截，
    // 由 skill 工作流（先扫描转换字幕 + 展示字段一律阿拉伯）在生成端负责。
    const substringInput = {
      ...input,
      cues: [{ cueId: 'cue-1', startMs: 0, endMs: 1000, text: 'time 1580' }],
    };
    const result = validateAgentDraft(draft([{
      componentId: 'card', componentVersion: 1, role: 'metric',
      content: { title: 'claim', value: 58, unitText: 'm', items: [{ label: 'a' }, { label: 'b' }] },
    }]), substringInput, registry);

    expect(result.valid).toBe(true);
    expect(result.errors.map(({ code }) => code)).not.toContain('unsourced_number');
    expect(result.errors.map(({ code }) => code)).not.toContain('unsourced_unit');
  });

  it('rejects source cues that do not form a monotonic scene interval', () => {
    const result = validateAgentDraft({
      ...draft([{ componentId: 'card', componentVersion: 1, role: 'title', content: { title: 'x' } }]),
      scenes: [{
        ...draft([]).scenes[0], sourceCueIds: ['cue-later', 'cue-earlier'],
        components: draft([{ componentId: 'card', componentVersion: 1, role: 'title', content: { title: 'x' } }]).scenes[0].components,
      }],
    }, {
      ...input,
      cues: [
        { cueId: 'cue-earlier', startMs: 0, endMs: 900, text: 'x' },
        { cueId: 'cue-later', startMs: 1000, endMs: 2000, text: 'x' },
      ],
    }, registry);

    expect(result.errors.map(({ code }) => code)).toContain('cue_order');
  });

  it('rejects an exclusive component that overlaps another scene in time', () => {
    const result = validateAgentDraft({
      ...draft([]),
      scenes: [
        { ...draft([{ componentId: 'exclusive', componentVersion: 1, role: 'title', content: { title: '58%' } }]).scenes[0] },
        { ...draft([{ componentId: 'card', componentVersion: 1, role: 'body', content: {
          title: '未使用字幕', items: [{ label: 'a' }, { label: 'b' }],
        } }]).scenes[0], sceneId: 'scene-2', sourceCueIds: ['cue-2'] },
      ],
    }, input, registry);

    expect(result.errors.map(({ code }) => code)).toContain('exclusive_conflict');
  });
});

describe('validateAgentDraft warnings', () => {
  it('keeps opposite presets separate under the real registry planning declaration', () => {
    const content = { tagText: 'TAG', enText: 'TITLE', titleText: 'title', subText: 'subtitle' };
    const result = validateAgentDraft(draft([
      { componentId: 't1-01', componentVersion: 1, role: 'title', content, placementPreset: 'left-top' },
      { componentId: 't1-01', componentVersion: 1, role: 'body', content, placementPreset: 'right-bottom' },
    ]), input, effectRegistry);

    expect(result.warnings.map(({ code }) => code)).not.toContain('footprint_collision');
  });

  it('reports a collision for real registry components in the same declared preset', () => {
    const content = { tagText: 'TAG', enText: 'TITLE', titleText: 'title', subText: 'subtitle' };
    const result = validateAgentDraft(draft([
      { componentId: 't1-01', componentVersion: 1, role: 'title', content, placementPreset: 'left-top' },
      { componentId: 't1-01', componentVersion: 1, role: 'body', content, placementPreset: 'left-top' },
    ]), input, effectRegistry);

    expect(result.warnings.map(({ code }) => code)).toContain('footprint_collision');
  });

  it('warns for long content, actual overlap, too many subjects, unused cues, and duplicate roles', () => {
    const components = Array.from({ length: 3 }, (_, index) => ({
      componentId: 'card', componentVersion: 1, role: 'title',
      content: { title: `${index}${'x'.repeat(90)}`, items: [{ label: 'a' }, { label: 'b' }] },
      placementPreset: 'left-top' as const,
    }));
    const result = validateAgentDraft(draft(components), input, registry);

    expect(result.warnings.map(({ code }) => code)).toEqual(expect.arrayContaining([
      'recommended_length', 'footprint_collision', 'too_many_subjects',
      'unused_cue', 'duplicate_role',
    ]));
  });

  it('does not warn merely because referenced cue times overlap', () => {
    const result = validateAgentDraft({
      ...draft([{ componentId: 'card', componentVersion: 1, role: 'title', content: {
        title: '58%', items: [{ label: 'a' }, { label: 'b' }],
      } }]),
      scenes: [
        draft([{ componentId: 'card', componentVersion: 1, role: 'title', content: { title: '58%', items: [{ label: 'a' }, { label: 'b' }] } }]).scenes[0],
        { ...draft([{ componentId: 'card', componentVersion: 1, role: 'body', content: { title: '未使用字幕', items: [{ label: 'a' }, { label: 'b' }] } }]).scenes[0], sceneId: 'scene-2', sourceCueIds: ['cue-2'] },
      ],
    }, input, registry);

    expect(result.warnings.map(({ code }) => code)).toContain('footprint_collision');
    expect(result.warnings.map(({ code }) => code)).not.toContain('time_overlap');
  });
});
