import type { AgentInput, SubtitleCue } from '../project/types';

interface PortableVideoMetadata {
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  path?: string;
}

interface AgentInputSource {
  video: PortableVideoMetadata;
  cues: SubtitleCue[];
}

export function exportAgentInput(source: AgentInputSource): AgentInput {
  const { width, height, fps, durationMs } = source.video;
  return {
    kind: 'captionforge.agent-input',
    schemaVersion: 1,
    componentLibraryVersion: 1,
    video: { width, height, fps, durationMs },
    cues: source.cues.map(({ cueId, startMs, endMs, text }) => ({
      cueId,
      startMs,
      endMs,
      text,
    })),
  };
}
