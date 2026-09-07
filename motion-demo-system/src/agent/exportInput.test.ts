import { describe, expect, it } from 'vitest';
import { AgentInputSchema } from '../project/schema';
import { exportAgentInput } from './exportInput';

describe('exportAgentInput', () => {
  it('exports the versioned portable input without a local video path', () => {
    const result = exportAgentInput({
      video: {
        width: 1920,
        height: 1080,
        fps: 30,
        durationMs: 5000,
        path: 'C:\\private\\video.mp4',
      },
      cues: [{ cueId: 'cue-1', startMs: 0, endMs: 1000, text: '中文' }],
    });

    expect(result).toEqual({
      kind: 'captionforge.agent-input',
      schemaVersion: 1,
      componentLibraryVersion: 1,
      video: { width: 1920, height: 1080, fps: 30, durationMs: 5000 },
      cues: [{ cueId: 'cue-1', startMs: 0, endMs: 1000, text: '中文' }],
    });
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it('rebuilds cues from the strict whitelist instead of spreading runtime fields', () => {
    const result = exportAgentInput({
      video: { width: 1920, height: 1080, fps: 30, durationMs: 5000 },
      cues: [{
        cueId: 'cue-1', startMs: 0, endMs: 1000, text: 'safe',
        path: 'C:\\private\\subtitle.srt', metadata: { localPath: 'secret' },
      } as never],
    });

    expect(AgentInputSchema.safeParse(result).success).toBe(true);
    expect(result.cues).toEqual([{ cueId: 'cue-1', startMs: 0, endMs: 1000, text: 'safe' }]);
    expect(JSON.stringify(result)).not.toContain('private');
  });
});
