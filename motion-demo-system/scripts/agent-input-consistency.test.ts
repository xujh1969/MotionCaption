import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseSRT } from '../src/subtitle/parse';

/**
 * Regression gate for the SRT→Agent Input converter bundled in the skill
 * (skill/scripts/build-agent-input.mjs, mirrored from scripts/build-agent-input.mjs).
 * The standalone script must produce byte-identical cues to the application's
 * own parseSRT on the same SRT — including the empty-block-still-consumes-an-index
 * numbering rule — so the Agent never sees cue ids that differ from the host.
 */
const projectRoot = resolve(import.meta.dirname, '..');
const standalonePath = join(projectRoot, 'skill', 'scripts', 'build-agent-input.mjs');

// Deliberately nasty SRT: \r\n line endings, an empty-text block (consumes its
// cue index), a block with no --> line (dropped, still consumes its index), a
// comma and a dot fraction timestamp, an invalid block (end <= start), and a
// multi-line cue.
const NASTY_SRT = [
  '1',
  '00:00:00,100 --> 00:00:02,200',
  '第一条字幕',
  '',
  '2',
  '00:00:02,400 --> 00:00:03,266',
  '',
  '3',
  '00:00:03,433 --> 00:00:06,466',
  '第三条，含逗号时间戳',
  '',
  '4',
  '00:00:06,500 --> 00:00:07,000',
  '',
  '5',
  '00:00:07.500 --> 00:00:08.000',
  '第五行 点号时间戳',
  '第二行文本',
  '',
  '6',
  '00:00:08,000 --> 00:00:07,000',
  '结束早于开始，应丢弃',
  '',
  '7',
  '00:00:09,000 --> 00:00:10,000',
  '第七行',
].join('\r\n');

describe('standalone build-agent-input mirrors host parseSRT', () => {
  let fixtureRoot: string;

  beforeAll(() => {
    fixtureRoot = mkdtempSync(join(tmpdir(), 'agent-input-consistency-'));
    writeFileSync(join(fixtureRoot, 'nasty.srt'), NASTY_SRT);
  });

  afterAll(() => rmSync(fixtureRoot, { recursive: true, force: true }));

  it('emits exactly the cues the host parseSRT would produce', () => {
    const srtPath = join(fixtureRoot, 'nasty.srt');
    const out = execFileSync('node', [standalonePath, srtPath], { encoding: 'utf8' });
    const built = JSON.parse(out);

    const expectedCues = parseSRT(readFileSync(srtPath, 'utf8'));
    expect(built.kind).toBe('captionforge.agent-input');
    expect(built.schemaVersion).toBe(1);
    expect(built.componentLibraryVersion).toBe(1);
    expect(built.video).toMatchObject({ width: 1920, height: 1080, fps: 30 });
    expect(built.cues).toEqual(expectedCues);

    const last = expectedCues[expectedCues.length - 1];
    const lastEndFrame = Math.ceil((last.endMs * built.video.fps) / 1000);
    expect(Math.round((built.video.durationMs * built.video.fps) / 1000)).toBeGreaterThanOrEqual(lastEndFrame);
  });

  it('honors --fps / --width / --height overrides', () => {
    const srtPath = join(fixtureRoot, 'nasty.srt');
    const out = execFileSync(
      'node',
      [standalonePath, srtPath, '--fps', '25', '--width', '1280', '--height', '720'],
      { encoding: 'utf8' },
    );
    const built = JSON.parse(out);
    expect(built.video).toMatchObject({ width: 1280, height: 720, fps: 25 });
  });
});
