import {
  MAX_ALLOCATION_SEARCH_STEPS,
  MAX_EFFECT_INSTANCES,
  MAX_TRACK_COUNT,
  MAX_TRACK_INDEX,
} from './limits';

export interface FixedTrackInterval {
  track: number;
  startFrame: number;
  endFrame: number;
}

export interface PendingTrackInterval {
  key: string;
  startFrame: number;
  endFrame: number;
}

export interface TrackAllocationOptions {
  searchStepLimit?: number;
}

export type TrackAllocationResult =
  | { ok: true; tracks: number[]; searchSteps: number }
  | { ok: false; code: 'track_capacity'; reason: 'concurrency' | 'constraints'; searchSteps: number }
  | { ok: false; code: 'instance_limit'; searchSteps: 0 }
  | { ok: false; code: 'search_limit'; searchSteps: number };

const overlaps = (
  left: Pick<PendingTrackInterval, 'startFrame' | 'endFrame'>,
  right: Pick<PendingTrackInterval, 'startFrame' | 'endFrame'>,
): boolean => left.startFrame < right.endFrame && right.startFrame < left.endFrame;

function exceedsMaximumConcurrency(
  fixed: readonly FixedTrackInterval[],
  pending: readonly PendingTrackInterval[],
): boolean {
  const events = [
    ...fixed.flatMap(({ track, startFrame, endFrame }) => ([
      { frame: startFrame, delta: 1, track },
      { frame: endFrame, delta: -1, track },
    ])),
    ...pending.flatMap(({ startFrame, endFrame }) => ([
      { frame: startFrame, delta: 1, track: null },
      { frame: endFrame, delta: -1, track: null },
    ])),
  ].sort((left, right) => left.frame - right.frame || left.delta - right.delta);
  const fixedCounts = new Map<number, number>();
  let activePending = 0;
  for (const event of events) {
    if (event.track === null) {
      activePending += event.delta;
    } else {
      const count = (fixedCounts.get(event.track) ?? 0) + event.delta;
      if (count === 0) fixedCounts.delete(event.track);
      else fixedCounts.set(event.track, count);
    }
    if (fixedCounts.size + activePending > MAX_TRACK_COUNT) return true;
  }
  return false;
}

export function allocateTimelineTracks(
  fixed: readonly FixedTrackInterval[],
  pending: readonly PendingTrackInterval[],
  options: TrackAllocationOptions = {},
): TrackAllocationResult {
  if (fixed.length + pending.length > MAX_EFFECT_INSTANCES) {
    return { ok: false, code: 'instance_limit', searchSteps: 0 };
  }
  if (fixed.some(({ track }) => !Number.isInteger(track) || track < 0 || track > MAX_TRACK_INDEX)) {
    return { ok: false, code: 'track_capacity', reason: 'constraints', searchSteps: 0 };
  }
  if (exceedsMaximumConcurrency(fixed, pending)) {
    return { ok: false, code: 'track_capacity', reason: 'concurrency', searchSteps: 0 };
  }

  const conflicts = pending.map(() => new Set<number>());
  for (let left = 0; left < pending.length; left += 1) {
    for (let right = left + 1; right < pending.length; right += 1) {
      if (!overlaps(pending[left], pending[right])) continue;
      conflicts[left].add(right);
      conflicts[right].add(left);
    }
  }

  const baseCandidates = pending.map((interval) => {
    const futureReservation = (track: number) => fixed.reduce((next, reservation) => (
      reservation.track === track && reservation.startFrame >= interval.endFrame
        ? Math.min(next, reservation.startFrame)
        : next
    ), Number.POSITIVE_INFINITY);
    return Array.from({ length: MAX_TRACK_COUNT }, (_, track) => track)
      .filter((track) => !fixed.some((reservation) => (
        reservation.track === track && overlaps(interval, reservation)
      )))
      .sort((left, right) => futureReservation(left) - futureReservation(right) || left - right);
  });
  if (baseCandidates.some((candidates) => candidates.length === 0)) {
    return { ok: false, code: 'track_capacity', reason: 'constraints', searchSteps: 0 };
  }

  const requestedSearchStepLimit = options.searchStepLimit === undefined
    || !Number.isFinite(options.searchStepLimit)
    ? MAX_ALLOCATION_SEARCH_STEPS
    : Math.max(0, Math.floor(options.searchStepLimit));
  const searchStepLimit = Math.min(MAX_ALLOCATION_SEARCH_STEPS, requestedSearchStepLimit);
  let searchSteps = 0;
  let searchLimitReached = false;
  const assignments = new Array<number>(pending.length).fill(-1);
  const availableTracks = (index: number): number[] => baseCandidates[index].filter((track) => (
    ![...conflicts[index]].some((other) => assignments[other] === track)
  ));
  const assign = (remaining: number): boolean => {
    if (remaining === 0) return true;
    let selected = -1;
    let selectedCandidates: number[] = [];
    for (let index = 0; index < pending.length; index += 1) {
      if (assignments[index] !== -1) continue;
      const candidates = availableTracks(index);
      if (candidates.length === 0) return false;
      if (
        selected === -1
        || candidates.length < selectedCandidates.length
        || (candidates.length === selectedCandidates.length
          && (pending[index].key.localeCompare(pending[selected].key) < 0
            || (pending[index].key === pending[selected].key && index < selected)))
      ) {
        selected = index;
        selectedCandidates = candidates;
      }
    }

    for (const track of selectedCandidates) {
      if (searchSteps >= searchStepLimit) {
        searchLimitReached = true;
        return false;
      }
      searchSteps += 1;
      assignments[selected] = track;
      const forwardValid = [...conflicts[selected]].every((other) => (
        assignments[other] !== -1 || availableTracks(other).length > 0
      ));
      if (forwardValid && assign(remaining - 1)) return true;
      assignments[selected] = -1;
    }
    return false;
  };

  if (assign(pending.length)) return { ok: true, tracks: assignments, searchSteps };
  if (searchLimitReached) return { ok: false, code: 'search_limit', searchSteps };
  return { ok: false, code: 'track_capacity', reason: 'constraints', searchSteps };
}
