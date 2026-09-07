import type { SubtitleCue } from './types';

export interface CueFrameInterval {
  startFrame: number;
  endFrame: number;
  durationInFrames: number;
}

export function cueFrameInterval(
  cue: Pick<SubtitleCue, 'startMs' | 'endMs'>,
  fps: number,
  projectDuration: number,
): CueFrameInterval | null {
  const duration = Math.max(1, Math.round(projectDuration));
  const safeFps = Math.max(Number.EPSILON, fps);
  const rawStart = Math.ceil(cue.startMs * safeFps / 1000);
  const rawEnd = Math.ceil(cue.endMs * safeFps / 1000);
  if (rawEnd <= 0 || rawStart >= duration) return null;
  const startFrame = Math.max(0, rawStart);
  const endFrame = Math.min(duration, rawEnd);
  if (endFrame <= startFrame) return null;
  return { startFrame, endFrame, durationInFrames: endFrame - startFrame };
}
