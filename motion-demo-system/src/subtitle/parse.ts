import type { SubtitleCue } from '../project/types';

const timestampToMs = (value: string): number | undefined => {
  const match = value.trim().match(/^(\d+):(\d{2}):(\d{2})[,.](\d{1,3})$/);
  if (!match) return undefined;
  const [, hours, minutes, seconds, fraction] = match;
  const ms = Number(fraction.padEnd(3, '0'));
  return ((Number(hours) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000 + ms;
};

export function parseSRT(raw: string): SubtitleCue[] {
  if (!raw.trim()) return [];

  return raw.replace(/\r/g, '').trim().split(/\n\s*\n/).flatMap((block, blockIndex) => {
    const lines = block.split('\n');
    const timeIndex = lines.findIndex((line) => line.includes('-->'));
    if (timeIndex < 0) return [];

    const [startText, endText] = lines[timeIndex].split('-->');
    const startMs = timestampToMs(startText);
    const endMs = timestampToMs(endText);
    const text = lines.slice(timeIndex + 1).join('\n').trim();
    if (startMs === undefined || endMs === undefined || endMs <= startMs || !text) return [];

    return [{ cueId: `cue-${blockIndex + 1}`, startMs, endMs, text }];
  });
}
