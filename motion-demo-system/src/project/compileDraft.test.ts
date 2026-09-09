import React from 'react';
import { describe, expect, it } from 'vitest';
import { createEffectRegistry, effectRegistry } from '../effects/registry';
import type { EffectDefinition } from '../effects/types';
import type { AgentDraft, MotionEffectInstance, MotionProject } from './types';
import { compileAgentDraft } from './compileDraft';

const project: MotionProject = {
  kind: 'captionforge.project', schemaVersion: 1,
  video: { width: 1920, height: 1080, fps: 25, durationInFrames: 250 },
  cues: [
    { cueId: 'cue-1', startMs: 1000, endMs: 2000, text: '第一句' },
    { cueId: 'cue-2', startMs: 2000, endMs: 3600, text: '第二句' },
  ],
  effects: [{
    instanceId: 'existing', componentId: 't1-01', componentVersion: 1,
    sourceCueIds: ['cue-1'], startFrame: 20, durationInFrames: 80, track: 0, zIndex: 1,
    props: {}, transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  }],
};
const draft: AgentDraft = {
  kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
  scenes: [{
    sceneId: 'scene-1', sourceCueIds: ['cue-1', 'cue-2'],
    components: [
      { componentId: 't1-01', componentVersion: 1, role: 'title', placementPreset: 'left-top', content: {
        tagText: 'TAG', enText: 'TITLE', titleText: '第一句', subText: '第二句',
      } },
      { componentId: 't2-01', componentVersion: 1, role: 'body', content: { contentText: '第二句' } },
    ],
  }],
};

describe('compileAgentDraft', () => {
  it('fails closed before ID generation when allocation search reaches its budget', () => {
    let idCalls = 0;
    expect(() => compileAgentDraft({ ...project, effects: [] }, draft, {
      createInstanceId: () => { idCalls += 1; return `id-${idCalls}`; },
      searchStepLimit: 1,
    })).toThrow(/search limit/i);
    expect(idCalls).toBe(0);
  });

  it('shares constrained allocation for existing fixed-track reservations and preserves output order', () => {
    const fixed = [
      ...Array.from({ length: 62 }, (_, track) => ({
        ...project.effects[0], instanceId: `fixed-${track}`, track, startFrame: 0, durationInFrames: 70,
      })),
      { ...project.effects[0], instanceId: 'fixed-63', track: 63, startFrame: 5, durationInFrames: 5 },
    ];
    const constrainedProject: MotionProject = {
      ...project,
      video: { ...project.video, fps: 1000, durationInFrames: 100 },
      cues: [
        { cueId: 'A', startMs: 0, endMs: 5, text: '第一句 第二句' },
        { cueId: 'B', startMs: 4, endMs: 8, text: '第一句 第二句' },
      ],
      effects: fixed,
    };
    const component = draft.scenes[0].components[0];
    const constrainedDraft: AgentDraft = {
      ...draft,
      scenes: ['A', 'B'].map((sceneId) => ({ sceneId, sourceCueIds: [sceneId], components: [component] })),
    };
    let nextId = 0;

    const compiled = compileAgentDraft(constrainedProject, constrainedDraft, {
      createInstanceId: () => `fixed-order-${++nextId}`,
    });

    expect(compiled.map(({ sceneId, track, instanceId }) => ({ sceneId, track, instanceId }))).toEqual([
      { sceneId: 'A', track: 63, instanceId: 'fixed-order-1' },
      { sceneId: 'B', track: 62, instanceId: 'fixed-order-2' },
    ]);
  });

  it('rejects a truly impossible fixed-track reservation through shared validation', () => {
    const fixed = [
      ...Array.from({ length: 62 }, (_, track) => ({
        ...project.effects[0], instanceId: `fixed-${track}`, track, startFrame: 0, durationInFrames: 70,
      })),
      { ...project.effects[0], instanceId: 'fixed-62', track: 62, startFrame: 0, durationInFrames: 5 },
      { ...project.effects[0], instanceId: 'fixed-63', track: 63, startFrame: 5, durationInFrames: 5 },
    ];
    const impossibleProject: MotionProject = {
      ...project,
      video: { ...project.video, fps: 1000, durationInFrames: 100 },
      cues: [{ cueId: 'X', startMs: 4, endMs: 6, text: '第一句 第二句' }],
      effects: fixed,
    };
    const impossibleDraft: AgentDraft = {
      ...draft,
      scenes: [{ ...draft.scenes[0], sceneId: 'X', sourceCueIds: ['X'], components: [draft.scenes[0].components[0]] }],
    };

    expect(() => compileAgentDraft(impossibleProject, impossibleDraft)).toThrow(/No timeline track/);
  });

  it('allocates the reviewer interval order optimally while preserving output and ID order', () => {
    const intervalProject: MotionProject = {
      ...project,
      video: { ...project.video, fps: 1000, durationInFrames: 100 },
      cues: [
        { cueId: 'base', startMs: 0, endMs: 70, text: '第一句 第二句' },
        { cueId: 'v1', startMs: 0, endMs: 20, text: '第一句 第二句' },
        { cueId: 'v4', startMs: 50, endMs: 70, text: '第一句 第二句' },
        { cueId: 'v2', startMs: 10, endMs: 40, text: '第一句 第二句' },
        { cueId: 'v3', startMs: 30, endMs: 60, text: '第一句 第二句' },
      ],
      effects: [],
    };
    const component = draft.scenes[0].components[0];
    const scene = (sceneId: string, count = 1): AgentDraft['scenes'][number] => ({
      sceneId,
      sourceCueIds: [sceneId],
      components: Array.from({ length: count }, (_, index) => ({ ...component, role: `${sceneId}-${index}` })),
    });
    const intervalDraft: AgentDraft = {
      ...draft,
      scenes: [scene('base', 62), scene('v1'), scene('v4'), scene('v2'), scene('v3')],
    };
    let nextId = 0;

    const compiled = compileAgentDraft(intervalProject, intervalDraft, {
      createInstanceId: () => `ordered-${++nextId}`,
    });
    const permuted = compileAgentDraft(intervalProject, {
      ...intervalDraft,
      scenes: [scene('base', 62), scene('v3'), scene('v2'), scene('v4'), scene('v1')],
    }, { createInstanceId: () => 'permuted' });
    const variableTracks = (effects: MotionEffectInstance[]) => Object.fromEntries(
      effects.filter(({ sceneId }) => sceneId !== 'base').map(({ sceneId, track }) => [sceneId, track]),
    );

    expect(Math.max(...compiled.map(({ track }) => track))).toBe(63);
    expect(compiled.slice(62).map(({ sceneId }) => sceneId)).toEqual(['v1', 'v4', 'v2', 'v3']);
    expect(compiled.map(({ instanceId }) => instanceId)).toEqual(
      Array.from({ length: 66 }, (_, index) => `ordered-${index + 1}`),
    );
    expect(variableTracks(compiled)).toEqual(variableTracks(permuted));
    expect(permuted.slice(62).map(({ sceneId }) => sceneId)).toEqual(['v3', 'v2', 'v4', 'v1']);
  });

  it('derives timing, injects defaults, and assigns the first free track without mutating the project', () => {
    const before = structuredClone(project.effects);
    let id = 0;
    const effects = compileAgentDraft(project, draft, { createInstanceId: () => `new-${++id}` });

    expect(project.effects).toEqual(before);
    expect(effects).toHaveLength(2);
    expect(effects[0]).toMatchObject({
      instanceId: 'new-1', sceneId: 'scene-1', startFrame: 25, durationInFrames: 65,
      track: 1, sourceCueIds: ['cue-1', 'cue-2'], props: { titleText: '第一句' },
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    });
    expect(effects[0].props).toHaveProperty('titleColor');
    expect(effects[1].track).toBe(2);
  });

  it('is deterministic apart from generated instance IDs', () => {
    const normalize = (effects: ReturnType<typeof compileAgentDraft>) => effects.map(({ instanceId: _id, ...effect }) => effect);
    expect(normalize(compileAgentDraft(project, draft))).toEqual(normalize(compileAgentDraft(project, draft)));
  });

  it('throws on invalid input without changing formal effects', () => {
    const before = structuredClone(project.effects);
    expect(() => compileAgentDraft(project, {
      ...draft,
      scenes: [{ ...draft.scenes[0], sourceCueIds: ['missing'] }],
    })).toThrow(/Invalid agent draft/);
    expect(project.effects).toEqual(before);
  });

  it('fails safely when all 64 shared timeline tracks overlap', () => {
    const saturatedProject = {
      ...project,
      effects: Array.from({ length: 64 }, (_, track) => ({ ...project.effects[0], instanceId: `occupied-${track}`, track })),
    };
    const oneComponentDraft = {
      ...draft,
      scenes: [{ ...draft.scenes[0], components: [draft.scenes[0].components[0]] }],
    };

    expect(() => compileAgentDraft(saturatedProject, oneComponentDraft)).toThrow(/No timeline track/);
  });

  it('clamps a cue interval that partially extends beyond the project duration', () => {
    const projectWithOverflow = {
      ...project,
      cues: [{ ...project.cues[0], endMs: 11000 }],
    };
    const overflowDraft = {
      ...draft,
      scenes: [{ ...draft.scenes[0], sourceCueIds: ['cue-1'] }],
    };

    expect(compileAgentDraft(projectWithOverflow, overflowDraft)[0]).toMatchObject({
      startFrame: 25,
      durationInFrames: 225,
    });
  });

  it('accepts a millisecond endpoint that rounds to the final project frame', () => {
    const edgeProject = {
      ...project,
      cues: [{ ...project.cues[0], endMs: 10019 }],
    };
    const edgeDraft = {
      ...draft,
      scenes: [{ ...draft.scenes[0], sourceCueIds: ['cue-1'] }],
    };

    expect(compileAgentDraft(edgeProject, edgeDraft)[0]).toMatchObject({
      startFrame: 25,
      durationInFrames: 225,
    });
  });

  it('compiles fractional cue times with shared ceil half-open boundaries', () => {
    const fractionalProject = {
      ...project,
      video: { ...project.video, fps: 30, durationInFrames: 300 },
      cues: [{ cueId: 'cue-1', startMs: 10, endMs: 1010, text: '第一句 第二句' }],
      effects: [],
    };
    const fractionalDraft = {
      ...draft,
      scenes: [{ ...draft.scenes[0], sourceCueIds: ['cue-1'], components: [draft.scenes[0].components[0]] }],
    };

    expect(compileAgentDraft(fractionalProject, fractionalDraft)[0]).toMatchObject({
      startFrame: 1,
      durationInFrames: 30,
    });
  });

  it('rejects a scene whose cue interval has no project intersection', () => {
    const outsideProject = {
      ...project,
      cues: [{ cueId: 'cue-1', startMs: 10010, endMs: 11010, text: '第一句 第二句' }],
    };
    const outsideDraft = {
      ...draft,
      scenes: [{ ...draft.scenes[0], sourceCueIds: ['cue-1'], components: [draft.scenes[0].components[0]] }],
    };

    expect(() => compileAgentDraft(outsideProject, outsideDraft)).toThrow(/frame range/i);
  });

  it('aligns the real registry planning declaration to distinct placement presets', () => {
    const placedDraft = {
      ...draft,
      scenes: [{
        ...draft.scenes[0],
        components: [{ ...draft.scenes[0].components[0], placementPreset: 'right-bottom' as const }],
      }],
    };

    // 落位 = 画布右下角 - 规划包络；包络由 config 默认锚点推导（可能被 bake 更新），不硬编码。
    const { width, height } = effectRegistry.get('t1-01').layout.footprint;
    expect(compileAgentDraft(project, placedDraft, { registry: effectRegistry })[0].transform).toEqual({
      x: 1920 - width,
      y: 1080 - height,
      scale: 1,
      rotation: 0,
    });
  });

  it('deep-clones defaults and draft content for isolated read-only previews', () => {
    const nestedDefault = [{ label: 'default' }];
    const testDefinition: EffectDefinition = {
      id: 'nested', version: 1, name: 'nested', category: 'test', component: (() => null) as React.FC,
      legacyProps: [],
      selection: { summary: 'nested', suitableFor: ['test'], avoidFor: ['test'], semanticFamilies: ['items'] },
      props: {
        title: {
          type: 'text', label: 'title', default: 'title', required: true, role: 'content',
          agentEditable: true, semanticRole: 'title',
          legacy: { key: 'title', label: 'title', kind: 'text', default: 'title' },
        },
        items: {
          type: 'list', label: 'items', default: [], required: true, role: 'content',
          agentEditable: true, semanticRole: 'items',
          agentEditableItemFields: ['label'],
          legacy: { key: 'items', label: 'items', kind: 'list', default: '[]', listFields: [{ key: 'label', label: 'label' }] },
        },
        lockedItems: {
          type: 'list', label: 'locked', default: nestedDefault, required: true, role: 'style',
          agentEditable: false,
          legacy: { key: 'lockedItems', label: 'locked', kind: 'list', default: '[]' },
        },
      },
      layout: { roles: ['items'], preferredZones: ['auto'], footprint: { width: 960, height: 540 }, exclusive: false },
    };
    const nestedRegistry = createEffectRegistry([testDefinition]);
    const sharedItems = [{ label: 'draft' }];
    const nestedDraft: AgentDraft = {
      kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
      scenes: [{
        sceneId: 'nested-scene', sourceCueIds: ['cue-1'],
        components: [0, 1].map((index) => ({
          componentId: 'nested', componentVersion: 1, role: `items-${index}`,
          content: { title: '第一句', items: sharedItems },
        })),
      }],
    };

    const preview = compileAgentDraft(project, nestedDraft, { registry: nestedRegistry });
    (preview[0].props.items as Array<{ label: string }>)[0].label = 'changed';
    (preview[0].props.lockedItems as Array<{ label: string }>)[0].label = 'changed';

    expect(sharedItems).toEqual([{ label: 'draft' }]);
    expect(nestedDefault).toEqual([{ label: 'default' }]);
    expect(preview[1].props.items).toEqual([{ label: 'draft' }]);
    expect(preview[1].props.lockedItems).toEqual([{ label: 'default' }]);
    expect(project.effects).toHaveLength(1);
  });

  it('leaves formal effects unchanged when the user discards a compiled preview', () => {
    const before = structuredClone(project.effects);
    compileAgentDraft(project, draft);
    expect(project.effects).toEqual(before);
  });

  it('keeps Agent-authored content when a user default snapshot also carries text', () => {
    const compiled = compileAgentDraft(project, draft, {
      userStyleDefaults: {
        // 用户快照含「文字 + 样式 + 位置」三类键（存为默认样式是完整快照）
        't1-01': { titleText: '旧默认标题', subText: '旧默认副标', titleSize: 88, posX: 321, posY: 210 },
      },
    });
    const t1 = compiled.find(({ componentId }) => componentId === 't1-01');
    expect(t1?.props.titleText).toBe('第一句');
    expect(t1?.props.subText).toBe('第二句');
    // 样式键仍然并入用户默认
    expect(t1?.props.titleSize).toBe(88);
    // left-top 分区下位置也采用用户默认内边距，而不是硬贴画布左上角
    expect(t1?.transform.x).toBe(321);
    expect(t1?.transform.y).toBe(210);
  });

  it('honours a stored user position over the placement preset and clamps it into the canvas', () => {
    const placed = compileAgentDraft(project, {
      ...draft,
      scenes: [{
        sceneId: 'scene-1', sourceCueIds: ['cue-1', 'cue-2'],
        components: [
          { componentId: 't1-01', componentVersion: 1, role: 'title', placementPreset: 'right-bottom', content: {
            tagText: '标签', enText: 'EN', titleText: '甲', subText: '乙',
          } },
        ],
      }],
    }, { userStyleDefaults: { 't1-01': { posX: 120, posY: 90 } } });
    // 用户存过位置 → 即便 preset 是 right-bottom 也以存过的位置为准
    expect(placed[0].transform).toMatchObject({ x: 120, y: 90 });

    const clamped = compileAgentDraft(project, {
      ...draft,
      scenes: [{
        sceneId: 'scene-1', sourceCueIds: ['cue-1'],
        components: [
          { componentId: 't1-01', componentVersion: 1, role: 'title', placementPreset: 'left-top', content: {
            tagText: '标签', enText: 'EN', titleText: '甲', subText: '乙',
          } },
        ],
      }],
    }, { userStyleDefaults: { 't1-01': { posX: 4000, posY: 4000 } } });
    const { width, height } = effectRegistry.get('t1-01').layout.footprint;
    expect(clamped[0].transform.x).toBe(Math.max(0, 1920 - width));
    expect(clamped[0].transform.y).toBe(Math.max(0, 1080 - height));
  });
});
