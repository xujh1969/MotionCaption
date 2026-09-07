import { describe, expect, it } from 'vitest';
import { parseSRT } from './parse';

describe('parseSRT', () => {
  it('parses comma and dot SRT timestamps with stable cue IDs', () => {
    const raw = [
      '1',
      '00:00:01,250 --> 00:00:02,500',
      '中文字幕',
      '',
      '2',
      '00:00:03.000 --> 00:00:04.125',
      'second line',
    ].join('\n');

    expect(parseSRT(raw)).toEqual([
      { cueId: 'cue-1', startMs: 1250, endMs: 2500, text: '中文字幕' },
      { cueId: 'cue-2', startMs: 3000, endMs: 4125, text: 'second line' },
    ]);
  });

  it('filters blocks without subtitle text without changing later stable IDs', () => {
    const raw = [
      '1',
      '00:00:00,000 --> 00:00:01,000',
      '',
      '2',
      '00:00:01,000 --> 00:00:02,000',
      '保留',
    ].join('\n');

    expect(parseSRT(raw)).toEqual([
      { cueId: 'cue-2', startMs: 1000, endMs: 2000, text: '保留' },
    ]);
  });
});
