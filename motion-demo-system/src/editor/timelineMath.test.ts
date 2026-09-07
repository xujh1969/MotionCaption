import { describe, expect, it } from 'vitest';
import type { MotionEffectInstance } from '../project/types';
import {
  dragTimelineEffect,
  frameDeltaFromPixels,
  screenXToFrame,
  screenYToTrack,
  scrollLeftForZoom,
  resolveZoomAnchor,
  timelineTickFrames,
  timelineTickSteps,
} from './timelineMath';
import { cueFrameInterval } from '../project/cueTiming';
import { MAX_TRACK_INDEX } from '../project/limits';

const effect: MotionEffectInstance = {
  instanceId: 'effect', componentId: 't1-01', componentVersion: 1, sourceCueIds: [],
  startFrame: 100, durationInFrames: 50, track: 1, zIndex: 1, props: {},
  transform: { x: 0, y: 0, scale: 1, rotation: 0 },
};

describe('dragTimelineEffect', () => {
  it('moves a whole block to an integer frame and track while preserving its duration', () => {
    expect(dragTimelineEffect('move', effect, 250.4, 3.4, 300)).toEqual({
      startFrame: 250, durationInFrames: 50, track: 3,
    });
    expect(dragTimelineEffect('move', effect, -500, -2, 300)).toEqual({
      startFrame: 0, durationInFrames: 50, track: 0,
    });
    expect(dragTimelineEffect('move', effect, 0, 999, 300).track).toBe(MAX_TRACK_INDEX);
  });

  it('clamps the start and end handles to the first and last legal frames', () => {
    expect(dragTimelineEffect('start', effect, -500, 8, 300)).toEqual({
      startFrame: 0, durationInFrames: 150, track: 1,
    });
    expect(dragTimelineEffect('end', effect, 500, 8, 300)).toEqual({
      startFrame: 100, durationInFrames: 200, track: 1,
    });
  });

  it('rejects zero-length results at either handle', () => {
    expect(dragTimelineEffect('start', effect, 50, 1, 300).durationInFrames).toBe(1);
    expect(dragTimelineEffect('end', effect, -50, 1, 300).durationInFrames).toBe(1);
  });
});

describe('timeline viewport math', () => {
  it('converts pixel movement and a vertically scrolled pointer to integer frames and tracks', () => {
    expect(frameDeltaFromPixels(12.6, 5)).toBe(3);
    expect(screenYToTrack(250, 100, 88, 44, 76)).toBe(3);
  });

  it('converts screen X to a frame with nonzero horizontal scroll', () => {
    expect(screenXToFrame(260, 100, 90, 5, 100)).toBe(50);
    expect(screenXToFrame(-100, 100, 0, 5, 100)).toBe(0);
    expect(screenXToFrame(9999, 100, 0, 5, 100)).toBe(99);
  });

  it('keeps the frame under the zoom anchor stable', () => {
    const nextScrollLeft = scrollLeftForZoom(2, 4, 100, 150, 400, 300);

    expect(nextScrollLeft).toBe(350);
    expect((100 + 150) / 2).toBe((nextScrollLeft + 150) / 4);
  });

  it('falls back to the viewport center after the pointer leaves the time canvas', () => {
    expect(resolveZoomAnchor(120, 800)).toBe(120);
    expect(resolveZoomAnchor(null, 800)).toBe(400);
  });

  it('chooses whole-second major ticks that never repeat a label', () => {
    expect(timelineTickSteps(1, 30)).toEqual({ major: 150, minor: 30 });
    expect(timelineTickSteps(2, 30)).toEqual({ major: 60, minor: 15 });
    expect(timelineTickSteps(5, 30)).toEqual({ major: 30, minor: 6 });
    expect(timelineTickSteps(100, 30)).toEqual({ major: 30, minor: 6 });
  });

  it('never emits the duration as both a major and minor tick', () => {
    const ticks = timelineTickFrames(60, 1, 30);
    expect(ticks.major).toContain(60);
    expect(ticks.minor).not.toContain(60);
  });

  it('keeps second labels unique across the whole duration', () => {
    const fps = 30;
    const fmt = (frame: number) => Math.floor(frame / fps);
    for (const ppf of [1.97, 2.31, 3.64, 4.31]) {
      const labels = timelineTickFrames(300, ppf, fps).major.map(fmt);
      expect(new Set(labels).size).toBe(labels.length);
    }
    // 90 frames = exactly 3 seconds at 30fps
    expect(timelineTickFrames(300, 3.64, 30).major).toContain(90);
  });
});

describe('cueFrameInterval', () => {
  it('uses clamped half-open ceil boundaries for non-integral cue times', () => {
    expect(cueFrameInterval({ startMs: 10, endMs: 1010 }, 30, 300))
      .toEqual({ startFrame: 1, endFrame: 31, durationInFrames: 30 });
  });

  it('returns no interval for cues wholly outside the project', () => {
    expect(cueFrameInterval({ startMs: 10010, endMs: 11010 }, 30, 300)).toBeNull();
    expect(cueFrameInterval({ startMs: -1010, endMs: -10 }, 30, 300)).toBeNull();
  });

  it('clamps cues that partially intersect the project', () => {
    expect(cueFrameInterval({ startMs: -10, endMs: 10 }, 30, 300))
      .toEqual({ startFrame: 0, endFrame: 1, durationInFrames: 1 });
    expect(cueFrameInterval({ startMs: 9960, endMs: 11000 }, 30, 300))
      .toEqual({ startFrame: 299, endFrame: 300, durationInFrames: 1 });
  });
});
