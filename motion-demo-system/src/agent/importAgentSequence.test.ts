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
});
