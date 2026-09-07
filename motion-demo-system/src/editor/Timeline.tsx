import React, { useEffect, useMemo, useRef, useState } from 'react';
import { effectRegistry } from '../effects/registry';
import type { MotionEffectInstance, SubtitleCue } from '../project/types';
import { cueFrameInterval } from '../project/cueTiming';
import { MAX_TRACK_COUNT } from '../project/limits';
import { useEditorStore, type EffectUpdate, type TimelineTrackId } from '../store/editorStore';
import {
  dragTimelineEffect,
  frameDeltaFromPixels,
  screenXToFrame,
  screenYToTrack,
  resolveZoomAnchor,
  scrollLeftForZoom,
  timelineTickFrames,
  type TimelineDragMode,
} from './timelineMath';

const LABEL_WIDTH = 108;
const RULER_HEIGHT = 32;
const ROW_HEIGHT = 44;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const DEFAULT_VIEWPORT_WIDTH = 800;

interface TimelinePointerSession {
  mode: TimelineDragMode;
  effect: MotionEffectInstance;
  startX: number;
}

interface TrackLabelProps {
  id: TimelineTrackId;
  label: string;
  hidden: boolean;
  onToggle: (id: TimelineTrackId) => void;
}

const EyeIcon: React.FC<{ hidden: boolean }> = ({ hidden }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M2.2 10s2.8-4.3 7.8-4.3 7.8 4.3 7.8 4.3-2.8 4.3-7.8 4.3S2.2 10 2.2 10Z" />
    <circle cx="10" cy="10" r="2.3" />
    {hidden && <path className="timeline-eye-slash" d="m3 3 14 14" />}
  </svg>
);

const TrackLabel: React.FC<TrackLabelProps> = ({ id, label, hidden, onToggle }) => (
  <div className="timeline-track-label">
    <button
      type="button"
      className={`timeline-eye${hidden ? ' off' : ''}`}
      data-track-visibility={id}
      aria-label={`${hidden ? '显示' : '隐藏'}${label}`}
      aria-pressed={!hidden}
      onClick={() => onToggle(id)}
    >
      <EyeIcon hidden={hidden} />
    </button>
    <span>{label}</span>
  </div>
);

export const formatFrameTime = (frame: number, fps: number): string => {
  const totalSeconds = Math.floor(Math.max(0, frame) / Math.max(1, fps));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

export const resolveTimelineSeek = (
  onSeek: ((frame: number) => void) | undefined,
  setCurrentFrame: (frame: number) => void,
  setPlaying: (playing: boolean) => void,
) => (frame: number): void => {
  if (onSeek) {
    onSeek(frame);
    return;
  }
  setPlaying(false);
  setCurrentFrame(frame);
};

export interface ScrubViewportLike {
  getBoundingClientRect(): { left: number };
  scrollLeft: number;
}

/**
 * Builds a pointer-x seek handler that converts clientX pixels into timeline
 * frames. Window-level pointermove listeners must route through this — never
 * pass raw clientX to an onSeek(frame) callback.
 */
export const createScreenXSeeker = (
  getViewport: () => ScrubViewportLike | null,
  getPixelsPerFrame: () => number,
  getDuration: () => number,
  onSeek: (frame: number) => void,
) => (clientX: number): void => {
  const viewport = getViewport();
  if (!viewport) return;
  onSeek(screenXToFrame(
    clientX,
    viewport.getBoundingClientRect().left + LABEL_WIDTH,
    viewport.scrollLeft,
    getPixelsPerFrame(),
    getDuration(),
  ));
};

interface TimelineViewProps {
  cues: readonly SubtitleCue[];
  effects: readonly MotionEffectInstance[];
  duration: number;
  fps: number;
  currentFrame: number;
  selectedId: string | null;
  hiddenTrackIds: readonly TimelineTrackId[];
  selectInstance: (instanceId: string | null) => void;
  updateEffect: (instanceId: string, update: EffectUpdate) => void;
  onSeek: (frame: number) => void;
  toggleTrack: (trackId: TimelineTrackId) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  cues,
  effects,
  duration: requestedDuration,
  fps,
  currentFrame,
  selectedId,
  hiddenTrackIds,
  selectInstance,
  updateEffect,
  onSeek,
  toggleTrack,
}) => {
  const duration = Math.max(1, requestedDuration);
  const [zoom, setZoom] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(DEFAULT_VIEWPORT_WIDTH);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragSession = useRef<TimelinePointerSession | null>(null);
  const pointerAnchor = useRef<number | null>(null);
  const scrubPointerId = useRef<number | null>(null);
  const trackCount = Math.min(
    MAX_TRACK_COUNT,
    effects.reduce((count, { track }) => Math.max(count, track + 1), 2),
  );
  const timeViewportWidth = Math.max(1, viewportWidth - LABEL_WIDTH);
  const basePixelsPerFrame = timeViewportWidth / duration;
  const pixelsPerFrame = basePixelsPerFrame * zoom;
  const timeWidth = Math.max(timeViewportWidth, duration * pixelsPerFrame);
  const contentWidth = LABEL_WIDTH + timeWidth;
  const hidden = useMemo(() => new Set(hiddenTrackIds), [hiddenTrackIds]);
  const { major: majorTicks, minor: minorTicks } = timelineTickFrames(duration, pixelsPerFrame, fps);
  // A non-round duration (e.g. 623 frames ≈ 20.77s) formats to the same second
  // as the preceding major tick; keep only the end-of-timeline label.
  const endLabel = formatFrameTime(duration, fps);
  const labeledMajorTicks = majorTicks.filter(
    (frame) => frame === duration || formatFrameTime(frame, fps) !== endLabel,
  );

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const measure = () => setViewportWidth(Math.max(LABEL_WIDTH + 1, viewport.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [trackCount]);

  useEffect(() => {
    const cancel = () => { dragSession.current = null; scrubPointerId.current = null; };
    const onScrubMove = (event: PointerEvent) => {
      if (scrubPointerId.current !== event.pointerId) return;
      scrubSeekRef.current(event.clientX);
    };
    window.addEventListener('blur', cancel);
    window.addEventListener('pointermove', onScrubMove);
    window.addEventListener('pointerup', cancel);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('blur', cancel);
      window.removeEventListener('pointermove', onScrubMove);
      window.removeEventListener('pointerup', cancel);
      window.removeEventListener('pointercancel', cancel);
      cancel();
    };
  }, []);

  const trackPointer = (event: React.PointerEvent<HTMLElement>) => {
    const bounds = scrollRef.current?.getBoundingClientRect();
    if (!bounds) return;
    pointerAnchor.current = Math.min(
      timeViewportWidth,
      Math.max(0, event.clientX - bounds.left - LABEL_WIDTH),
    );
  };

  const startScrub = (event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    scrubPointerId.current = event.pointerId;
    scrubSeekRef.current(event.clientX);
  };

  const seekAtClientX = createScreenXSeeker(
    () => scrollRef.current,
    () => pixelsPerFrame,
    () => duration,
    onSeek,
  );

  // Clicking empty track space seeks AND drops the current component selection.
  const seekEmptyTrackAtClientX = (event: React.PointerEvent<HTMLElement>) => {
    selectInstance(null);
    seekAtClientX(event.clientX);
  };

  // The window-level pointermove handler outlives renders, so it goes through a
  // ref that always holds the latest screen-x → frame conversion closure.
  const scrubSeekRef = useRef(seekAtClientX);
  scrubSeekRef.current = seekAtClientX;

  const nudgeScrub = (event: React.KeyboardEvent<HTMLElement>) => {
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!step) return;
    event.preventDefault();
    onSeek(Math.min(duration - 1, Math.max(0, currentFrame + step)));
  };

  const begin = (
    event: React.PointerEvent<HTMLElement>,
    effect: MotionEffectInstance,
    mode: TimelineDragMode,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    selectInstance(effect.instanceId);
    dragSession.current = { mode, effect: structuredClone(effect), startX: event.clientX };
  };

  const move = (event: React.PointerEvent<HTMLElement>) => {
    const active = dragSession.current;
    const viewport = scrollRef.current;
    if (!active || !viewport) return;
    const bounds = viewport.getBoundingClientRect();
    const targetTrack = screenYToTrack(
      event.clientY,
      bounds.top,
      viewport.scrollTop,
      ROW_HEIGHT,
      RULER_HEIGHT + ROW_HEIGHT,
    );
    updateEffect(active.effect.instanceId, dragTimelineEffect(
      active.mode,
      active.effect,
      frameDeltaFromPixels(event.clientX - active.startX, pixelsPerFrame),
      targetTrack,
      duration,
    ));
  };

  const end = (event: React.PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragSession.current = null;
  };

  const changeZoom = (nextZoom: number) => {
    const viewport = scrollRef.current;
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    if (!viewport || clampedZoom === zoom) return;
    const anchor = resolveZoomAnchor(pointerAnchor.current, timeViewportWidth);
    const nextPixelsPerFrame = basePixelsPerFrame * clampedZoom;
    const nextScrollLeft = scrollLeftForZoom(
      pixelsPerFrame,
      nextPixelsPerFrame,
      viewport.scrollLeft,
      anchor,
      timeViewportWidth,
      duration,
    );
    setZoom(clampedZoom);
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollLeft = nextScrollLeft;
    });
  };

  const renderPlayhead = () => (
    <span
      className="timeline-row-playhead"
      data-playhead-frame={currentFrame}
      style={{ left: currentFrame * pixelsPerFrame }}
    />
  );

  return (
    <div className="timeline" aria-label="多轨时间线">
      <div className="timeline-toolbar">
        <strong>时间轴</strong>
        <div className="timeline-zoom-controls" data-timeline-zoom-controls>
          <button type="button" aria-label="缩小时间轴" disabled={zoom <= MIN_ZOOM} onClick={() => changeZoom(zoom / 1.5)}>−</button>
          <button type="button" aria-label="放大时间轴" disabled={zoom >= MAX_ZOOM} onClick={() => changeZoom(zoom * 1.5)}>+</button>
          <button type="button" aria-label="重置时间轴缩放" disabled={zoom === 1} onClick={() => changeZoom(1)}>重置</button>
          <output aria-label="时间轴缩放比例">{Math.round(zoom * 100)}%</output>
        </div>
      </div>
      <div
        className="timeline-scroll"
        ref={scrollRef}
        data-timeline-scroll
      >
        <div className="timeline-content" style={{ width: contentWidth }}>
          <div className="timeline-ruler-row" data-timeline-ruler>
            <div className="timeline-ruler-corner">时间</div>
            <div className="timeline-ruler-canvas" style={{ width: timeWidth }} onPointerMove={trackPointer} onPointerLeave={() => { pointerAnchor.current = null; }} onPointerDown={(event) => seekAtClientX(event.clientX)}>
              {minorTicks.map((frame) => (
                <span key={`minor-${frame}`} className="timeline-tick minor" data-tick-kind="minor" style={{ left: frame * pixelsPerFrame }} />
              ))}
              {labeledMajorTicks.map((frame) => (
                <React.Fragment key={`major-${frame}`}>
                  <span className={`timeline-tick major${frame === duration ? ' end' : ''}`} data-tick-kind="major" style={{ left: frame * pixelsPerFrame }} />
                  <span className={`timeline-tick-label${frame === duration ? ' end' : ''}`} style={{ left: frame * pixelsPerFrame }}>{formatFrameTime(frame, fps)}</span>
                </React.Fragment>
              ))}
              <span
                className="timeline-playhead-handle"
                data-playhead-handle
                data-playhead-frame={currentFrame}
                role="slider"
                tabIndex={0}
                aria-label="播放位置"
                aria-valuemin={0}
                aria-valuemax={Math.max(0, duration - 1)}
                aria-valuenow={currentFrame}
                style={{ left: currentFrame * pixelsPerFrame }}
                onPointerDown={startScrub}
                onKeyDown={nudgeScrub}
              >
                <span className="timeline-playhead-grip" />
              </span>
            </div>
          </div>

          <div className={`timeline-row${hidden.has('subtitles') ? ' hidden' : ''}`} data-timeline-row="subtitles">
            <TrackLabel id="subtitles" label="字幕轨" hidden={hidden.has('subtitles')} onToggle={toggleTrack} />
            <div className="timeline-row-canvas" style={{ width: timeWidth }} onPointerMove={trackPointer} onPointerLeave={() => { pointerAnchor.current = null; }} onPointerDown={seekEmptyTrackAtClientX}>
              {hidden.has('subtitles') ? <span className="timeline-hidden-hint">已隐藏</span> : cues.map((cue) => {
                const frames = cueFrameInterval(cue, fps, duration);
                if (!frames) return null;
                return (
                  <span
                    key={cue.cueId}
                    className="timeline-block subtitle"
                    data-readonly="true"
                    data-start-frame={frames.startFrame}
                    data-end-frame={frames.endFrame}
                    title={cue.text}
                    style={{
                      left: frames.startFrame * pixelsPerFrame,
                      width: frames.durationInFrames * pixelsPerFrame,
                    }}
                  ><span className="timeline-block-label">{cue.text}</span></span>
                );
              })}
              {renderPlayhead()}
            </div>
          </div>

          {Array.from({ length: trackCount }, (_, track) => {
            const trackId = `effect-track-${track}` as const;
            const trackHidden = hidden.has(trackId);
            return (
              <div key={trackId} className={`timeline-row${trackHidden ? ' hidden' : ''}`} data-timeline-row={trackId}>
                <TrackLabel id={trackId} label={`轨 ${track + 1}`} hidden={trackHidden} onToggle={toggleTrack} />
                <div className="timeline-row-canvas" style={{ width: timeWidth }} onPointerMove={trackPointer} onPointerLeave={() => { pointerAnchor.current = null; }} onPointerDown={seekEmptyTrackAtClientX}>
                  {trackHidden ? <span className="timeline-hidden-hint">已隐藏</span> : effects.filter((effect) => effect.track === track).map((effect) => (
                    <div
                      key={effect.instanceId}
                      className={`timeline-block formal${selectedId === effect.instanceId ? ' selected' : ''}`}
                      data-timeline-instance={effect.instanceId}
                      data-start-frame={effect.startFrame}
                      data-end-frame={effect.startFrame + effect.durationInFrames}
                      style={{
                        left: effect.startFrame * pixelsPerFrame,
                        width: effect.durationInFrames * pixelsPerFrame,
                      }}
                      onPointerDown={(event) => begin(event, effect, 'move')}
                      onPointerMove={move}
                      onPointerUp={end}
                      onPointerCancel={end}
                      onLostPointerCapture={end}
                    >
                      <button
                        type="button"
                        className="timeline-handle start"
                        aria-label={`调整 ${effect.instanceId} 起点`}
                        onPointerDown={(event) => begin(event, effect, 'start')}
                        onPointerMove={move}
                        onPointerUp={end}
                        onPointerCancel={end}
                        onLostPointerCapture={end}
                      />
                      <span className="timeline-block-label">{effectRegistry.get(effect.componentId).name}</span>
                      <button
                        type="button"
                        className="timeline-handle end"
                        aria-label={`调整 ${effect.instanceId} 终点`}
                        onPointerDown={(event) => begin(event, effect, 'end')}
                        onPointerMove={move}
                        onPointerUp={end}
                        onPointerCancel={end}
                        onLostPointerCapture={end}
                      />
                    </div>
                  ))}
                  {renderPlayhead()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export interface TimelineProps {
  onSeek?: (frame: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ onSeek }) => {
  const cues = useEditorStore((state) => state.project.cues);
  const effects = useEditorStore((state) => state.project.effects);
  const duration = useEditorStore((state) => state.project.video.durationInFrames);
  const fps = useEditorStore((state) => state.project.video.fps);
  const currentFrame = useEditorStore((state) => state.currentFrame);
  const selectedId = useEditorStore((state) => state.selectedInstanceId);
  const hiddenTrackIds = useEditorStore((state) => state.hiddenTimelineTrackIds);
  const selectInstance = useEditorStore((state) => state.selectInstance);
  const updateEffect = useEditorStore((state) => state.updateEffect);
  const setCurrentFrame = useEditorStore((state) => state.setCurrentFrame);
  const setPlaying = useEditorStore((state) => state.setPlaying);
  const toggleTrack = useEditorStore((state) => state.toggleTimelineTrack);
  const seek = useMemo(
    () => resolveTimelineSeek(onSeek, setCurrentFrame, setPlaying),
    [onSeek, setCurrentFrame, setPlaying],
  );

  return <TimelineView {...{
    cues,
    effects,
    duration,
    fps,
    currentFrame,
    selectedId,
    hiddenTrackIds,
    selectInstance,
    updateEffect,
    onSeek: seek,
    toggleTrack,
  }} />;
};
