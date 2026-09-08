import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentDraft, MotionProject } from '../project/types';
import { importAgentSequence } from './importAgentSequence';

const project = (): MotionProject => ({
  kind: 'captionforge.project', schemaVersion: 1,
  video: { width: 1920, height: 1080, fps: 30, durationInFrames: 300 },
  cues: [{ cueId: 'cue-1', startMs: 1000, endMs: 2000, text: '原子导入标题与说明' }],
  effects: [{
    instanceId: 'existing', componentId: 't1-05', componentVersion: 1,
    sourceCueIds: ['cue-1'], startFrame: 0, durationInFrames: 30, track: 0, zIndex: 1,
    props: { titleText: '旧标题' }, transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  }],
});

const component = (role = 'title') => ({
  componentId: 't1-05', componentVersion: 1, role,
  content: { titleText: '原子导入标题', descText: '原子导入说明' },
});

const draft = (components = [component()]): AgentDraft => ({
  kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
  scenes: [{ sceneId: 'scene-1', sourceCueIds: ['cue-1'], components }],
});

afterEach(() => vi.restoreAllMocks());

describe('importAgentSequence', () => {
  it('returns search_limit consistently when the shared logical budget is reached', () => {
    const result = importAgentSequence(project(), draft([component('A'), component('B')]), {
      searchStepLimit: 1,
    });

    expect(result).toMatchObject({ ok: false, errors: [{ code: 'search_limit' }] });
  });

  it('returns a new project that atomically replaces all formal effects after validation and compilation', () => {
    const original = project();
    const before = structuredClone(original);

    const result = importAgentSequence(original, draft());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project).not.toBe(original);
    expect(result.project.effects).toHaveLength(1);
    expect(result.project.effects[0]).toMatchObject({
      componentId: 't1-05', startFrame: 30, durationInFrames: 30,
      props: { titleText: '原子导入标题', descText: '原子导入说明' },
    });
    expect(result.project.effects[0].instanceId).not.toBe('existing');
    expect(original).toEqual(before);
  });

  it('returns validation errors without changing the input project', () => {
    const original = project();
    const before = structuredClone(original);
    const invalid = draft([{ ...component(), componentId: 'unknown' }]);

    const result = importAgentSequence(original, invalid);

    expect(result).toMatchObject({ ok: false, errors: [{ code: 'unknown_component' }] });
    expect(original).toEqual(before);
  });

  it('reports fixed-track capacity as validation rather than a later compiler failure', () => {
    const base = project().effects[0];
    const constrained: MotionProject = {
      ...project(),
      video: { ...project().video, fps: 1000, durationInFrames: 100 },
      cues: [{ cueId: 'cue-1', startMs: 4, endMs: 6, text: '原子导入标题与说明' }],
      effects: [
        ...Array.from({ length: 62 }, (_, track) => ({
          ...base, instanceId: `fixed-${track}`, track, startFrame: 0, durationInFrames: 70,
        })),
        { ...base, instanceId: 'fixed-62', track: 62, startFrame: 0, durationInFrames: 5 },
        { ...base, instanceId: 'fixed-63', track: 63, startFrame: 5, durationInFrames: 5 },
      ],
    };

    expect(importAgentSequence(constrained, draft())).toMatchObject({
      ok: false,
      errors: [{ code: 'track_capacity' }],
    });
  });

  it('returns warnings without blocking a valid replacement', () => {
    const original = project();

    const result = importAgentSequence(original, draft([component('duplicate'), component('duplicate')]));

    expect(result.ok).toBe(true);
    expect(result.warnings.map(({ code }) => code)).toContain('duplicate_role');
    if (result.ok) expect(result.project.effects).toHaveLength(2);
  });

  it('lays simultaneous components over one cue span onto distinct tracks', () => {
    const original = project();
    const layered: AgentDraft = {
      kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
      scenes: [{
        sceneId: 'scene-1',
        sourceCueIds: ['cue-1'],
        components: [
          { ...component('headline'), placementPreset: 'left-top' },
          { ...component('footnote'), placementPreset: 'right-bottom' },
        ],
      }],
    };

    const result = importAgentSequence(original, layered);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.effects).toHaveLength(2);
    const [upper, lower] = result.project.effects;
    expect(upper.startFrame).toBe(lower.startFrame);
    expect(upper.durationInFrames).toBe(lower.durationInFrames);
    expect(upper.track).not.toBe(lower.track);
  });

  it('stacks separate scenes that cite the same cue span onto distinct tracks', () => {
    const original = project();
    const stacked: AgentDraft = {
      kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
      scenes: [
        { sceneId: 'scene-1', sourceCueIds: ['cue-1'], components: [component('headline')] },
        { sceneId: 'scene-2', sourceCueIds: ['cue-1'], components: [{ ...component('footnote'), placementPreset: 'right-bottom' }] },
      ],
    };

    const result = importAgentSequence(original, stacked);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.effects).toHaveLength(2);
    expect(result.project.effects[0].track).not.toBe(result.project.effects[1].track);
  });

  it('turns compiler exceptions into errors and leaves the input project unchanged', () => {
    const original = project();
    const before = structuredClone(original);
    vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('id generator failed');
    });

    const result = importAgentSequence(original, draft());

    expect(result).toEqual({
      ok: false,
      errors: [{ code: 'compile_failed', message: 'Agent sequence compilation failed: id generator failed' }],
      warnings: [],
    });
    expect(original).toEqual(before);
  });

  it('bootstraps cues and extends duration when a self-contained draft is imported into an empty project', () => {
    const empty: MotionProject = {
      kind: 'captionforge.project', schemaVersion: 1,
      video: { width: 1920, height: 1080, fps: 30, durationInFrames: 300 },
      cues: [],
      effects: [],
    };
    const standalone: AgentDraft = {
      kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
      cues: [
        { cueId: 'cue-1', startMs: 0, endMs: 20000, text: '原子导入标题与说明' },
        { cueId: 'cue-2', startMs: 20000, endMs: 20800, text: '原子导入结尾' },
      ],
      scenes: [{ sceneId: 'scene-1', sourceCueIds: ['cue-1'], components: [component()] }],
    };

    const result = importAgentSequence(empty, standalone);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.cues).toEqual(standalone.cues);
    expect(result.project.video.durationInFrames).toBe(600);
    expect(result.project.effects).toHaveLength(1);
    expect(result.project.effects[0]).toMatchObject({
      startFrame: 0, durationInFrames: 600, props: { titleText: '原子导入标题', descText: '原子导入说明' },
    });
    expect(result.warnings.map(({ code }) => code)).toContain('unused_cue');
  });

  describe('display numerals are authoring-side (import keeps text verbatim)', () => {
    const projectWithCue = (text: string): MotionProject => ({
      ...project(),
      cues: [{ cueId: 'cue-1', startMs: 1000, endMs: 2000, text }],
    });

    it('does not rewrite Chinese numerals inside display copy (regression: previously misreported unsourced 1/2)', () => {
      // 字幕用“第一/第二”枚举，content 用“一个/二个”计数——旧逻辑把 content 改写为
      // “1个/2个”后因字幕归一化不出 1/2 而误报 unsourced_number + unsourced_unit。
      const cueText = '两个观点：第一是亮点，第二是重点';
      const result = importAgentSequence(projectWithCue(cueText), draft([{
        ...component(),
        content: { titleText: '一个是亮点，二个是重点', descText: '只留精要' },
      }]));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.project.effects[0].props.titleText).toBe('一个是亮点，二个是重点');
      expect(result.project.effects[0].props.descText).toBe('只留精要');
      expect(result.project.cues[0].text).toBe(cueText);
    });

    it('accepts Arabic claims that only appear as Chinese numerals in the cue text', () => {
      const result = importAgentSequence(projectWithCue('只剩十种精要'), draft([{
        ...component(),
        content: { titleText: '只留 10 种精要', descText: '十种就好' },
      }]));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.project.effects[0].props.titleText).toBe('只留 10 种精要');
      expect(result.project.effects[0].props.descText).toBe('十种就好');
    });

    it('keeps Chinese numerals in display copy verbatim when they match the cue text', () => {
      const cueText = '只留十种精要，精挑细选后胜出';
      const result = importAgentSequence(projectWithCue(cueText), draft([{
        ...component(),
        content: { titleText: '只留十种精要', descText: '精挑细选后胜出' },
      }]));

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const effect = result.project.effects[0];
      // 展示文案保持 JSON 原样，不再程序改写为阿拉伯；字幕原文同样不动。
      expect(effect.props.titleText).toBe('只留十种精要');
      expect(effect.props.descText).toBe('精挑细选后胜出');
      expect(result.project.cues[0].text).toBe(cueText);
    });
  });
});
