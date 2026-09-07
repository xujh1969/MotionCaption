import { describe, expect, it } from 'vitest';
import type { MotionEffectInstance, MotionProject } from '../project/types';
import { editableEffectsAtFrame, projectForEditableSelection, subtitleCuesAtFrame } from './VideoStage';

const effect = (
  instanceId: string,
  startFrame: number,
  durationInFrames: number,
  zIndex: number,
): MotionEffectInstance => ({
  instanceId, componentId: 't1-01', componentVersion: 1, sourceCueIds: [],
  startFrame, durationInFrames, track: 0, zIndex, props: {},
  transform: { x: 0, y: 0, scale: 1, rotation: 0 },
});

describe('projectForEditableSelection', () => {
  it('keeps hidden-track instances out of the editable selection without mutating the export project', () => {
    const lower = effect('lower', 0, 30, 1);
    const upper = { ...effect('upper', 0, 30, 2), track: 2 };
    const project: MotionProject = {
      kind: 'captionforge.project', schemaVersion: 1,
      video: { width: 1920, height: 1080, fps: 30, durationInFrames: 300 },
      cues: [{ cueId: 'cue', startMs: 0, endMs: 1000, text: '字幕' }],
      effects: [lower, upper],
    };

    const selection = projectForEditableSelection(project, ['subtitles', 'effect-track-2']);

    expect(selection.cues).toEqual(project.cues);
    expect(selection.effects.map(({ instanceId }) => instanceId)).toEqual(['lower']);
    expect(project.cues).toHaveLength(1);
    expect(project.effects).toHaveLength(2);
    expect(selection).not.toBe(project);
  });
});

describe('subtitleCuesAtFrame', () => {
  it('uses frame time and exclusive cue ends for the editor subtitle preview', () => {
    const cues = [
      { cueId: 'first', startMs: 0, endMs: 1000, text: '第一句' },
      { cueId: 'second', startMs: 1000, endMs: 2000, text: '第二句' },
    ];

    expect(subtitleCuesAtFrame(cues, 29, 30, 300).map(({ cueId }) => cueId)).toEqual(['first']);
    expect(subtitleCuesAtFrame(cues, 30, 30, 300).map(({ cueId }) => cueId)).toEqual(['second']);
  });

  it('matches half-open timeline frames for non-integral cue times', () => {
    const cues = [{ cueId: 'fractional', startMs: 10, endMs: 1010, text: 'fractional' }];
    expect(subtitleCuesAtFrame(cues, 0, 30, 300)).toEqual([]);
    expect(subtitleCuesAtFrame(cues, 1, 30, 300)).toEqual(cues);
    expect(subtitleCuesAtFrame(cues, 30, 30, 300)).toEqual(cues);
    expect(subtitleCuesAtFrame(cues, 31, 30, 300)).toEqual([]);
  });

  it('does not show cues wholly outside the project on an edge frame', () => {
    const after = [{ cueId: 'after', startMs: 10010, endMs: 11010, text: 'after' }];
    const before = [{ cueId: 'before', startMs: -1010, endMs: -10, text: 'before' }];

    expect(subtitleCuesAtFrame(after, 299, 30, 300)).toEqual([]);
    expect(subtitleCuesAtFrame(before, 0, 30, 300)).toEqual([]);
  });
});

describe('editableEffectsAtFrame', () => {
  it('keeps only visible formal instances and orders hit targets by composition z-index', () => {
    const effects = [effect('higher', 0, 30, 4), effect('expired', 0, 10, 9), effect('lower', 5, 30, 1)];

    expect(editableEffectsAtFrame(effects, 15).map(({ instanceId }) => instanceId)).toEqual(['lower', 'higher']);
  });

});
