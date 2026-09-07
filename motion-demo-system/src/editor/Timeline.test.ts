import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MotionEffectInstance } from '../project/types';
import { useEditorStore } from '../store/editorStore';
import { TimelineView, formatFrameTime, resolveTimelineSeek, createScreenXSeeker } from './Timeline';
import { dragTimelineEffect } from './timelineMath';

const effect: MotionEffectInstance = {
  instanceId: 'effect', componentId: 't1-01', componentVersion: 1, sourceCueIds: [],
  startFrame: 100, durationInFrames: 50, track: 1, zIndex: 1, props: {},
  transform: { x: 0, y: 0, scale: 1, rotation: 0 },
};

describe('timeline drag math', () => {
  it('moves a whole block while preserving its legal duration and changing track', () => {
    expect(dragTimelineEffect('move', effect, 250, 3, 300)).toEqual({
      startFrame: 250, durationInFrames: 50, track: 3,
    });
    expect(dragTimelineEffect('move', effect, -500, 0, 300)).toEqual({
      startFrame: 0, durationInFrames: 50, track: 0,
    });
  });

  it('moves the start boundary while preserving the old end frame', () => {
    expect(dragTimelineEffect('start', effect, 60, 1, 300)).toEqual({
      startFrame: 149, durationInFrames: 1, track: 1,
    });
    expect(dragTimelineEffect('start', effect, -200, 1, 300)).toEqual({
      startFrame: 0, durationInFrames: 150, track: 1,
    });
  });

  it('moves the end boundary without producing an empty or overflowing interval', () => {
    expect(dragTimelineEffect('end', effect, -100, 1, 300)).toEqual({
      startFrame: 100, durationInFrames: 1, track: 1,
    });
    expect(dragTimelineEffect('end', effect, 500, 1, 300)).toEqual({
      startFrame: 100, durationInFrames: 200, track: 1,
    });
  });
});

const secondEffect: MotionEffectInstance = { ...effect, instanceId: 'track-three', track: 2 };

const renderTimeline = () => {
  const state = useEditorStore.getState();
  return renderToStaticMarkup(React.createElement(TimelineView, {
    cues: state.project.cues,
    effects: state.project.effects,
    duration: state.project.video.durationInFrames,
    fps: state.project.video.fps,
    currentFrame: state.currentFrame,
    selectedId: state.selectedInstanceId,
    hiddenTrackIds: state.hiddenTimelineTrackIds,
    selectInstance: state.selectInstance,
    updateEffect: state.updateEffect,
    onSeek: state.setCurrentFrame,
    toggleTrack: state.toggleTimelineTrack,
  }));
};

describe('Timeline tracks', () => {
  afterEach(() => {
    useEditorStore.getState().replaceEffects([]);
    useEditorStore.getState().setCues([]);
    useEditorStore.getState().showAllTimelineTracks();
    useEditorStore.getState().setVideoMetadata({ width: 1920, height: 1080, fps: 30, durationInFrames: 300 });
  });

  it('labels the end-of-timeline second only once for non-round durations', () => {
    useEditorStore.getState().setVideoMetadata({ width: 1920, height: 1080, fps: 30, durationInFrames: 623 });

    const markup = renderTimeline();

    expect(markup.match(/0:20/g)).toHaveLength(1);
    expect(markup).toContain('timeline-tick-label end');
  });

  it('renders a read-only subtitle row and an independent row with an eye for every formal track', () => {
    useEditorStore.getState().setCues([
      { cueId: 'cue-1', startMs: 0, endMs: 1000, text: '只读字幕' },
    ]);
    useEditorStore.getState().replaceEffects([effect, secondEffect]);

    const markup = renderTimeline();

    expect(markup).toContain('data-timeline-row="subtitles"');
    expect(markup).toContain('data-readonly="true"');
    expect(markup).toContain('data-timeline-row="effect-track-0"');
    expect(markup).toContain('data-timeline-row="effect-track-1"');
    expect(markup).toContain('data-timeline-row="effect-track-2"');
    expect(markup.match(/data-track-visibility=/g)).toHaveLength(4);
    expect(markup).not.toContain('调整 cue-1');
    expect(markup).toContain('调整 effect 起点');
  });

  it('hides only the selected row contents while keeping its label and visibility control', () => {
    useEditorStore.getState().replaceEffects([effect]);
    useEditorStore.getState().toggleTimelineTrack('effect-track-1');

    const markup = renderTimeline();

    expect(markup).toContain('data-timeline-row="effect-track-1"');
    expect(markup).toContain('显示轨 2');
    expect(markup).toContain('已隐藏');
    expect(markup).not.toContain('data-timeline-instance="effect"');
  });

  it('renders adaptive ticks and the current-frame playhead on the same pixel scale as blocks', () => {
    useEditorStore.getState().replaceEffects([effect]);
    useEditorStore.getState().setCurrentFrame(120);

    const markup = renderTimeline();

    expect(markup).toContain('data-timeline-ruler');
    expect(markup).toContain('data-tick-kind="major"');
    expect(markup).toContain('data-tick-kind="minor"');
    expect(markup).toContain('class="timeline-tick-label end"');
    expect(markup).toContain('data-playhead-frame="120"');
    expect(markup).toContain('data-start-frame="100"');
  });

  it('bounds defensive row rendering and shares fractional subtitle frame boundaries', () => {
    useEditorStore.getState().setCues([
      { cueId: 'fractional', startMs: 10, endMs: 1010, text: 'fractional' },
    ]);
    useEditorStore.getState().replaceEffects([{ ...effect, track: 1e9 }]);

    const markup = renderTimeline();

    expect(markup.match(/data-track-visibility=/g)).toHaveLength(65);
    expect(markup).toContain('data-start-frame="1"');
    expect(markup).toContain('data-end-frame="31"');
  });

  it('does not squeeze a subtitle wholly after the project into the final frame', () => {
    useEditorStore.getState().setCues([
      { cueId: 'outside', startMs: 10010, endMs: 11010, text: 'outside project' },
    ]);

    expect(renderTimeline()).not.toContain('outside project');
  });
});

describe('timeline playhead scrubbing', () => {
  it('labels ruler ticks with whole seconds only', () => {
    expect(formatFrameTime(0, 30)).toBe('0:00');
    expect(formatFrameTime(29, 30)).toBe('0:00');
    expect(formatFrameTime(47, 30)).toBe('0:01');
    expect(formatFrameTime(150, 30)).toBe('0:05');
    expect(formatFrameTime(1830, 30)).toBe('1:01');
  });

  it('renders a draggable playhead handle bound to the current frame', () => {
    useEditorStore.getState().setCurrentFrame(120);

    const markup = renderTimeline();

    expect(markup).toContain('data-playhead-handle');
    expect(markup).toContain('data-playhead-frame="120"');
    expect(markup).toContain('role="slider"');
    expect(markup).toContain('aria-valuenow="120"');
  });

  it('routes every seek through one handler and pauses playback when no host handler exists', () => {
    const onSeek = vi.fn();
    const setCurrentFrame = vi.fn();
    const setPlaying = vi.fn();

    resolveTimelineSeek(onSeek, setCurrentFrame, setPlaying)(42);
    expect(onSeek).toHaveBeenCalledWith(42);
    expect(setPlaying).not.toHaveBeenCalled();

    resolveTimelineSeek(undefined, setCurrentFrame, setPlaying)(42);
    expect(setCurrentFrame).toHaveBeenCalledWith(42);
    expect(setPlaying).toHaveBeenCalledWith(false);
  });

  it('converts pointer clientX pixels into frames instead of seeking raw pixel values', () => {
    const seeks: number[] = [];
    const viewport = {
      getBoundingClientRect: () => ({ left: 0 }), // track area origin; the seeker adds the label width itself
      scrollLeft: 0,
    };
    const seek = createScreenXSeeker(
      () => viewport,
      () => 2, // 2 px per frame → 60 px of drag = 30 frames
      () => 600,
      (frame) => seeks.push(frame),
    );

    seek(108); // label width offset → frame 0
    expect(seeks).toEqual([0]);

    seek(168); // +60 px drag → frame 30, not frame 168
    expect(seeks).toEqual([0, 30]);

    seek(1310); // clamped to the final frame 599
    expect(seeks).toEqual([0, 30, 599]);
  });
});
