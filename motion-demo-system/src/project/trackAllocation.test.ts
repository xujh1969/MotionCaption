import { describe, expect, it } from 'vitest';
import { allocateTimelineTracks } from './trackAllocation';

const fixedLongTracks = Array.from({ length: 62 }, (_, track) => ({
  track, startFrame: 0, endFrame: 70,
}));

describe('allocateTimelineTracks', () => {
  it('backtracks around a future fixed reservation instead of reporting a false capacity failure', () => {
    const result = allocateTimelineTracks(
      [...fixedLongTracks, { track: 63, startFrame: 5, endFrame: 10 }],
      [
        { key: 'A', startFrame: 0, endFrame: 5 },
        { key: 'B', startFrame: 4, endFrame: 8 },
      ],
    );

    expect(result).toEqual({ ok: true, tracks: [63, 62], searchSteps: 2 });
  });

  it('returns stable key assignments when pending input order changes', () => {
    const fixed = [...fixedLongTracks, { track: 63, startFrame: 5, endFrame: 10 }];
    const first = [{ key: 'A', startFrame: 0, endFrame: 5 }, { key: 'B', startFrame: 4, endFrame: 8 }];
    const second = [first[1], first[0]];
    const byKey = (pending: typeof first, result: ReturnType<typeof allocateTimelineTracks>) => (
      result.ok ? Object.fromEntries(pending.map(({ key }, index) => [key, result.tracks[index]])) : null
    );

    expect(byKey(first, allocateTimelineTracks(fixed, first))).toEqual({ A: 63, B: 62 });
    expect(byKey(second, allocateTimelineTracks(fixed, second))).toEqual({ A: 63, B: 62 });
  });

  it('returns a structured failure for fixed reservations with no legal extension', () => {
    const result = allocateTimelineTracks(
      [
        ...fixedLongTracks,
        { track: 62, startFrame: 0, endFrame: 5 },
        { track: 63, startFrame: 5, endFrame: 10 },
      ],
      [{ key: 'X', startFrame: 4, endFrame: 6 }],
    );

    expect(result).toEqual({
      ok: false, code: 'track_capacity', reason: 'constraints', searchSteps: 0,
    });
  });

  it('quickly rejects more than 64 simultaneously required tracks', () => {
    const pending = Array.from({ length: 65 }, (_, index) => ({
      key: `P${index}`, startFrame: 0, endFrame: 10,
    }));

    expect(allocateTimelineTracks([], pending)).toEqual({
      ok: false, code: 'track_capacity', reason: 'concurrency', searchSteps: 0,
    });
  });

  it('rejects 257 disjoint inputs before search while 256 completes in 256 logical steps', () => {
    const intervals = Array.from({ length: 257 }, (_, index) => ({
      key: `P${index}`, startFrame: index * 2, endFrame: index * 2 + 1,
    }));

    expect(allocateTimelineTracks([], intervals)).toEqual({
      ok: false, code: 'instance_limit', searchSteps: 0,
    });
    const boundary = allocateTimelineTracks([], intervals.slice(0, 256));
    expect(boundary.ok).toBe(true);
    if (boundary.ok) {
      expect(boundary.searchSteps).toBe(256);
      expect(boundary.tracks).toHaveLength(256);
    }
  });

  it('returns search_limit at a deterministic candidate-attempt budget', () => {
    const result = allocateTimelineTracks(
      [...fixedLongTracks, { track: 63, startFrame: 5, endFrame: 10 }],
      [{ key: 'A', startFrame: 0, endFrame: 5 }, { key: 'B', startFrame: 4, endFrame: 8 }],
      { searchStepLimit: 1 },
    );

    expect(result).toEqual({ ok: false, code: 'search_limit', searchSteps: 1 });
  });
});
