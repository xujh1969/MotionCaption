import type { PlacementPreset } from '../effects/types';

export const FILE_KINDS = {
  agentInput: 'captionforge.agent-input',
  agentDraft: 'captionforge.agent-draft',
  project: 'captionforge.project',
} as const;

export interface SubtitleCue {
  cueId: string;
  startMs: number;
  endMs: number;
  text: string;
}

export interface AgentInput {
  kind: 'captionforge.agent-input';
  schemaVersion: 1;
  componentLibraryVersion: 1;
  video: {
    width: number;
    height: number;
    fps: number;
    durationMs: number;
  };
  cues: SubtitleCue[];
}

export interface AgentDraft {
  kind: 'captionforge.agent-draft';
  schemaVersion: 1;
  componentLibraryVersion: 1;
  scenes: Array<{
    sceneId: string;
    sourceCueIds: string[];
    components: Array<{
      componentId: string;
      componentVersion: number;
      role: string;
      content: Record<string, unknown>;
      placementPreset?: PlacementPreset;
    }>;
  }>;
}

export interface MotionEffectInstance {
  instanceId: string;
  sceneId?: string;
  componentId: string;
  componentVersion: number;
  sourceCueIds: string[];
  startFrame: number;
  durationInFrames: number;
  track: number;
  zIndex: number;
  props: Record<string, unknown>;
  transform: { x: number; y: number; scale: number; rotation: number };
}

export interface MotionProject {
  kind: 'captionforge.project';
  schemaVersion: 1;
  video: {
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
  };
  cues: SubtitleCue[];
  effects: MotionEffectInstance[];
}
