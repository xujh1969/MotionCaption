import type { MotionEffectInstance } from '../project/types';
import type { EffectUpdate } from '../store/editorStore';
import { MAX_TRACK_INDEX } from '../project/limits';

export interface TimelineViewport {
  pixelsPerFrame: number;
  scrollLeft: number;
  trackScrollTop: number;
}

export type TimelineDragMode = 'move' | 'start' | 'end';

const finiteInteger = (value: number, fallback = 0): number => (
  Number.isFinite(value) ? Math.round(value) : fallback
);

export function dragTimelineEffect(
  mode: TimelineDragMode,
  effect: MotionEffectInstance,
  deltaFrames: number,
  targetTrack: number,
  projectDuration: number,
): EffectUpdate {
  const projectEnd = Math.max(1, finiteInteger(projectDuration, 1));
  const originalStart = Math.min(projectEnd - 1, Math.max(0, finiteInteger(effect.startFrame)));
  const originalDuration = Math.min(
    projectEnd - originalStart,
    Math.max(1, finiteInteger(effect.durationInFrames, 1)),
  );
  const originalEnd = originalStart + originalDuration;
  const delta = finiteInteger(deltaFrames);

  if (mode === 'move') {
    return {
      startFrame: Math.min(projectEnd - originalDuration, Math.max(0, originalStart + delta)),
      durationInFrames: originalDuration,
      track: Math.min(MAX_TRACK_INDEX, Math.max(0, finiteInteger(targetTrack, effect.track))),
    };
  }

  if (mode === 'start') {
    const startFrame = Math.min(originalEnd - 1, Math.max(0, originalStart + delta));
    return { startFrame, durationInFrames: originalEnd - startFrame, track: effect.track };
  }

  const endFrame = Math.min(projectEnd, Math.max(originalStart + 1, originalEnd + delta));
  return { startFrame: originalStart, durationInFrames: endFrame - originalStart, track: effect.track };
}

export const frameDeltaFromPixels = (deltaPixels: number, pixelsPerFrame: number): number => (
  finiteInteger(deltaPixels / Math.max(Number.EPSILON, pixelsPerFrame))
);

export function screenXToFrame(
  screenX: number,
  viewportLeft: number,
  scrollLeft: number,
  pixelsPerFrame: number,
  projectDuration: number,
): number {
  const lastFrame = Math.max(0, finiteInteger(projectDuration, 1) - 1);
  const frame = finiteInteger(
    (screenX - viewportLeft + Math.max(0, scrollLeft))
      / Math.max(Number.EPSILON, pixelsPerFrame),
  );
  return Math.min(lastFrame, Math.max(0, frame));
}

export function screenYToTrack(
  screenY: number,
  viewportTop: number,
  trackScrollTop: number,
  rowHeight: number,
  trackAreaOffset: number,
): number {
  const contentY = screenY - viewportTop + Math.max(0, trackScrollTop) - trackAreaOffset;
  return Math.max(0, Math.floor(contentY / Math.max(1, rowHeight)));
}

export function scrollLeftForZoom(
  oldPixelsPerFrame: number,
  newPixelsPerFrame: number,
  scrollLeft: number,
  anchorX: number,
  viewportWidth: number,
  projectDuration: number,
): number {
  const oldScale = Math.max(Number.EPSILON, oldPixelsPerFrame);
  const newScale = Math.max(Number.EPSILON, newPixelsPerFrame);
  const frameAtAnchor = (Math.max(0, scrollLeft) + Math.max(0, anchorX)) / oldScale;
  const requested = frameAtAnchor * newScale - Math.max(0, anchorX);
  const maxScroll = Math.max(0, projectDuration * newScale - Math.max(0, viewportWidth));
  return Math.min(maxScroll, Math.max(0, requested));
}

const TICK_SECONDS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];

/**
 * Major/minor tick spacing in FRAMES, derived from whole-second intervals so
 * that second labels never repeat: the major step is always >= 1 second.
 */
export function timelineTickSteps(pixelsPerFrame: number, fps: number): { major: number; minor: number } {
  const scale = Math.max(Number.EPSILON, pixelsPerFrame);
  const safeFps = Math.max(1, fps);
  let majorSeconds = TICK_SECONDS[TICK_SECONDS.length - 1];
  for (const candidate of TICK_SECONDS) {
    if (candidate * safeFps * scale >= 72) {
      majorSeconds = candidate;
      break;
    }
  }
  const leading = majorSeconds / 10 ** Math.floor(Math.log10(majorSeconds));
  const minorDivisor = leading === 2 ? 4 : 5;
  const minorSeconds = majorSeconds / minorDivisor;
  return {
    major: Math.round(majorSeconds * safeFps),
    minor: Math.max(1, Math.round(minorSeconds * safeFps)),
  };
}

export function resolveZoomAnchor(pointerAnchor: number | null, viewportWidth: number): number {
  return pointerAnchor ?? Math.max(0, viewportWidth) / 2;
}

export function timelineTickFrames(
  duration: number,
  pixelsPerFrame: number,
  fps: number,
): { major: number[]; minor: number[] } {
  const end = Math.max(1, Math.round(duration));
  const steps = timelineTickSteps(pixelsPerFrame, fps);
  const major: number[] = [];
  const minor: number[] = [];
  for (let frame = 0; frame <= end; frame += steps.minor) {
    const rounded = Math.round(frame);
    if (rounded % steps.major === 0) major.push(rounded);
    else minor.push(rounded);
  }
  if (!major.includes(end)) major.push(end);
  return { major, minor: minor.filter((frame) => frame !== end) };
}
