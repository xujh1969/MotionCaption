import { describe, expect, it } from 'vitest';
import type { MotionEffectInstance, MotionProject } from '../project/types';
import { defaultConfig } from '../remotion/config';
import { createEditorStore } from './editorStore';

const effect = (instanceId: string): MotionEffectInstance => ({
  instanceId,
  componentId: 't1-01',
  componentVersion: 1,
  sourceCueIds: ['cue-1'],
  startFrame: 0,
  durationInFrames: 30,
  track: 0,
  zIndex: 1,
  props: {},
  transform: { x: 0, y: 0, scale: 1, rotation: 0 },
});

const project = (effects = [effect('formal')]): MotionProject => ({
  kind: 'captionforge.project',
  schemaVersion: 1,
  video: { width: 1920, height: 1080, fps: 30, durationInFrames: 300 },
  cues: [{ cueId: 'cue-1', startMs: 0, endMs: 1000, text: '字幕' }],
  effects,
});

describe('editor store formal effects', () => {
  it('adds a registered effect at the clamped frame with cloned defaults and the first free track', () => {
    const occupied = effect('occupied');
    occupied.startFrame = 250;
    occupied.durationInFrames = 50;
    occupied.track = 0;
    const store = createEditorStore(project([occupied]));

    const firstId = store.getState().addEffect('t1-01', 999);
    const secondId = store.getState().addEffect('t1-01', 999);
    const [first, second] = store.getState().project.effects.slice(1);

    expect(firstId).not.toBe(secondId);
    // 默认位置从 config 派生（可能被 bake-style-defaults 更新为用户保存的位置），不硬编码。
    const t1Defaults = defaultConfig('t1-01');
    expect(first).toMatchObject({
      instanceId: firstId,
      componentId: 't1-01',
      componentVersion: 1,
      sourceCueIds: [],
      startFrame: 299,
      durationInFrames: 1,
      track: 1,
      transform: {
        x: t1Defaults.posX as number,
        y: t1Defaults.posY as number,
        scale: ((t1Defaults.scale as number) ?? 100) / 100,
        rotation: 0,
      },
    });
    expect(first.props).toMatchObject({ titleText: 'AI智能算法迭代升级' });
    expect(second).toMatchObject({ instanceId: secondId, track: 2 });
    expect(second.props).not.toBe(first.props);
    expect(store.getState().selectedInstanceId).toBe(secondId);
  });

  it('leaves the project reference unchanged when adding an unknown component', () => {
    const store = createEditorStore(project());
    const before = store.getState().project;

    expect(() => store.getState().addEffect('missing-effect', 30)).toThrow(/Unknown effect definition/);
    expect(store.getState().project).toBe(before);
  });

  it('fails atomically when all 64 tracks overlap the requested interval', () => {
    const occupied = Array.from({ length: 64 }, (_, track) => ({ ...effect(`occupied-${track}`), track }));
    const store = createEditorStore(project(occupied));
    const before = store.getState().project;

    expect(() => store.getState().addEffect('t1-01', 0)).toThrow(/No timeline track/);
    expect(store.getState().project).toBe(before);
    expect(store.getState().project.effects).toHaveLength(64);
  });

  it('fails atomically at the 256 formal-effect project boundary', () => {
    const effects = Array.from({ length: 256 }, (_, index) => ({
      ...effect(`effect-${index}`),
      startFrame: index % 300,
      durationInFrames: 1,
    }));
    const store = createEditorStore(project(effects));
    const before = store.getState().project;

    expect(() => store.getState().addEffect('t1-01', 0)).toThrow(/256/);
    expect(store.getState().project).toBe(before);
  });

  it('keeps preview backgrounds in transient editor state', () => {
    const store = createEditorStore(project());

    expect(store.getState().previewBackground).toBe('checkerboard');
    store.getState().setPreviewBackground('dark');

    expect(store.getState().previewBackground).toBe('dark');
    expect(store.getState().project).not.toHaveProperty('previewBackground');
  });

  it('keeps timeline visibility transient without changing project data', () => {
    const store = createEditorStore(project());
    const before = store.getState().project;

    store.getState().toggleTimelineTrack('effect-track-0');
    store.getState().toggleTimelineTrack('subtitles');

    expect(store.getState().hiddenTimelineTrackIds).toEqual(['effect-track-0', 'subtitles']);
    expect(store.getState().project).toBe(before);
    expect(store.getState().project).not.toHaveProperty('hiddenTimelineTrackIds');
  });

  it('clears selection when deleting the selected instance', () => {
    const store = createEditorStore(project());
    store.getState().selectInstance('formal');

    store.getState().deleteEffect('formal');

    expect(store.getState().selectedInstanceId).toBeNull();
    expect(store.getState().project.effects).toEqual([]);
  });

  it('does not expose persistent draft state or draft actions', () => {
    const store = createEditorStore(project());
    const stateKeys = Object.keys(store.getState());

    expect(stateKeys).not.toEqual(expect.arrayContaining([
      'draftEffects', 'draftReview', 'importDraft', 'applyDraft', 'discardDraft',
    ]));
  });

  it('replaces formal effects with deep clones and clears selection', () => {
    const store = createEditorStore(project());
    const replacement = effect('replacement');
    replacement.props = { items: [{ label: 'original' }] };
    store.getState().selectInstance('formal');

    store.getState().replaceEffects([replacement]);
    (replacement.props.items as Array<{ label: string }>)[0].label = 'outside mutation';

    expect(store.getState().project.effects).toEqual([{
      ...replacement,
      props: { items: [{ label: 'original' }] },
    }]);
    expect(store.getState().project.effects[0]).not.toBe(replacement);
    expect(store.getState().selectedInstanceId).toBeNull();
  });
});

describe('editor store component preview', () => {
  it('mounts a transient preview instance without touching project.effects', () => {
    const store = createEditorStore(project());
    store.getState().selectInstance('formal');
    useFrame(store, 30);

    store.getState().startComponentPreview('t1-01');

    const preview = store.getState().componentPreview;
    expect(preview).not.toBeNull();
    expect(preview?.effect).toMatchObject({
      instanceId: 'preview-t1-01',
      componentId: 't1-01',
      startFrame: 0,
      durationInFrames: 90,
    });
    expect(preview?.endFrame).toBe(90);
    // 试播不进入工程数据，也不抢占选中态。
    expect(store.getState().project.effects).toHaveLength(1);
    expect(store.getState().project.effects[0].instanceId).toBe('formal');
    expect(store.getState().selectedInstanceId).toBeNull();
  });

  it('keeps the main timeline frozen: currentFrame and isPlaying untouched', () => {
    const store = createEditorStore(project());
    useFrame(store, 280);

    store.getState().startComponentPreview('t1-01');

    // 试播在独立叠加层时钟上播放，播放头留在原地、时间线不进入播放态。
    expect(store.getState().currentFrame).toBe(280);
    expect(store.getState().isPlaying).toBe(false);
    expect(store.getState().componentPreview?.effect.startFrame).toBe(0);
  });

  it('clears the preview explicitly and on project replacement', () => {
    const store = createEditorStore(project());
    store.getState().startComponentPreview('t1-01');
    expect(store.getState().componentPreview).not.toBeNull();

    store.getState().clearComponentPreview();
    expect(store.getState().componentPreview).toBeNull();

    store.getState().startComponentPreview('t1-01');
    store.getState().replaceEffects([]);
    expect(store.getState().componentPreview).toBeNull();
  });

  it('clears the preview when an effect is formally added', () => {
    const store = createEditorStore(project());
    store.getState().startComponentPreview('t1-01');
    expect(store.getState().componentPreview).not.toBeNull();

    store.getState().addEffect('t1-01', 0);
    expect(store.getState().componentPreview).toBeNull();
  });

  it('fails atomically for an unknown component id', () => {
    const store = createEditorStore(project());
    expect(() => store.getState().startComponentPreview('no-such-component')).toThrow();
    expect(store.getState().componentPreview).toBeNull();
  });
});

/** editorStore 的 currentFrame 需要通过 set 直接驱动（无 setCurrentFrame 之外的入口）。 */
function useFrame(store: ReturnType<typeof createEditorStore>, frame: number): void {
  (store as unknown as { setState: (partial: Record<string, unknown>) => void }).setState({ currentFrame: frame });
}

describe('editor store effect updates', () => {
  it('updates one instance without sharing nested props with another instance', () => {
    const first = effect('first');
    first.props = { items: [{ label: 'first' }] };
    const second = effect('second');
    second.props = { items: [{ label: 'second' }] };
    const store = createEditorStore(project([first, second]));
    const nextItems = [{ label: 'changed' }];

    store.getState().updateEffect('first', { props: { items: nextItems } });
    nextItems[0].label = 'mutated outside';

    expect(store.getState().project.effects[0].props.items).toEqual([{ label: 'changed' }]);
    expect(store.getState().project.effects[1].props.items).toEqual([{ label: 'second' }]);
  });

  it('clamps start, duration and track updates inside the project', () => {
    const store = createEditorStore(project());

    store.getState().updateEffect('formal', { startFrame: 299, durationInFrames: 50, track: -2 });
    expect(store.getState().project.effects[0]).toMatchObject({
      startFrame: 299, durationInFrames: 1, track: 0,
    });

    store.getState().updateEffect('formal', { startFrame: Number.NaN, durationInFrames: 0, track: 2.8 });
    expect(store.getState().project.effects[0]).toMatchObject({
      startFrame: 0, durationInFrames: 1, track: 3,
    });

    store.getState().updateEffect('formal', { track: 1e9 });
    expect(store.getState().project.effects[0].track).toBe(63);
  });

  it('clamps transforms to the project canvas and the declared max scale', () => {
    const store = createEditorStore(project());

    store.getState().updateEffect('formal', {
      transform: { x: 1900, y: -20, scale: 10, rotation: 15 },
    });

    expect(store.getState().project.effects[0].transform).toEqual({
      x: 1900,
      y: 0,
      scale: 2,
      rotation: 15,
    });
  });
});

describe('editor store project opening', () => {
  it('keeps the current project unchanged when opening an unknown version', () => {
    const store = createEditorStore(project());
    const before = store.getState().project;

    const result = store.getState().openProject(JSON.stringify({
      ...project([]),
      schemaVersion: 2,
    }));

    expect(result).toMatchObject({ ok: false, code: 'unsupported_version' });
    expect(store.getState().project).toBe(before);
  });

  it('replaces the project and resets transient editor state only after validation succeeds', () => {
    const store = createEditorStore(project());
    store.getState().selectInstance('formal');
    store.getState().setCurrentFrame(42);
    store.getState().setPlaying(true);
    const opened = project([effect('opened')]);

    const result = store.getState().openProject(JSON.stringify(opened));

    expect(result).toEqual({ ok: true, project: opened });
    expect(store.getState()).toMatchObject({
      project: opened,
      selectedInstanceId: null,
      currentFrame: 0,
      isPlaying: false,
    });
  });
});

describe('editor store playback frame', () => {
  it('keeps existing effects legal when video metadata shortens the project', () => {
    const existing = effect('formal');
    existing.startFrame = 250;
    existing.durationInFrames = 50;
    existing.transform = { x: 1800, y: 900, scale: 1, rotation: 0 };
    const store = createEditorStore(project([existing]));

    store.getState().setVideoMetadata({ width: 1280, height: 720, fps: 30, durationInFrames: 100 });

    expect(store.getState().project.effects[0]).toMatchObject({
      startFrame: 99,
      durationInFrames: 1,
      transform: { x: 1280, y: 720, scale: 1, rotation: 0 },
    });
  });

  it.each([
    [-1, 0],
    [1.6, 2],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [300, 299],
    [999, 299],
  ])('clamps %s to the legal integer frame %s', (input, expected) => {
    const store = createEditorStore(project());

    store.getState().setCurrentFrame(input);

    expect(store.getState().currentFrame).toBe(expected);
  });
});
