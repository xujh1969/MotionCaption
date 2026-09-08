import { create } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { effectRegistry } from '../effects/registry';
import { toInstanceConfig } from '../composition/instanceConfig';
import type { PaletteState } from '../effects/paletteSlots';
import {
  applyPaletteToInstance,
  applyStylesToTarget,
  collectStyleValues,
  mergeUserStyleDefaults,
} from '../effects/stylePrefs';
import { parseProject, type ParseProjectResult } from '../project/serialize';
import type { MotionEffectInstance, MotionProject, SubtitleCue } from '../project/types';
import { MAX_EFFECT_INSTANCES, MAX_TRACK_INDEX } from '../project/limits';

export type PreviewBackground = 'checkerboard' | 'dark' | 'video';
export type TimelineTrackId = 'subtitles' | `effect-track-${number}`;

export type EffectUpdate = Partial<Pick<
  MotionEffectInstance,
  'startFrame' | 'durationInFrames' | 'track' | 'zIndex'
>> & {
  props?: Record<string, unknown>;
  transform?: Partial<MotionEffectInstance['transform']>;
};

export interface EditorStoreState {
  project: MotionProject;
  selectedInstanceId: string | null;
  currentFrame: number;
  isPlaying: boolean;
  previewBackground: PreviewBackground;
  hiddenTimelineTrackIds: TimelineTrackId[];
  setVideoMetadata: (video: MotionProject['video']) => void;
  setCues: (cues: SubtitleCue[]) => void;
  replaceEffects: (effects: readonly MotionEffectInstance[]) => void;
  addEffect: (componentId: string, atFrame: number) => string;
  /** 当前实例的样式键覆盖到工程内所有同类组件；返回被更新的实例数。 */
  applySameStyle: (instanceId: string) => number;
  /** 按语义色槽把调色板颜色写进全工程实例；返回被更新的实例数。 */
  applyPaletteToProject: (palette: PaletteState) => number;
  selectInstance: (instanceId: string | null) => void;
  deleteEffect: (instanceId: string) => void;
  updateEffect: (instanceId: string, update: EffectUpdate) => void;
  setCurrentFrame: (frame: number) => void;
  setPlaying: (playing: boolean) => void;
  setPreviewBackground: (mode: PreviewBackground) => void;
  toggleTimelineTrack: (trackId: TimelineTrackId) => void;
  showAllTimelineTracks: () => void;
  openProject: (serialized: string) => ParseProjectResult;
}

const emptyProject = (): MotionProject => ({
  kind: 'captionforge.project',
  schemaVersion: 1,
  video: { width: 1920, height: 1080, fps: 30, durationInFrames: 300 },
  cues: [],
  effects: [],
});

const cloneEffect = (effect: MotionEffectInstance): MotionEffectInstance => ({
  ...effect,
  sourceCueIds: [...effect.sourceCueIds],
  props: structuredClone(effect.props),
  transform: { ...effect.transform },
});

const cloneProject = (project: MotionProject): MotionProject => ({
  ...project,
  video: { ...project.video },
  cues: project.cues.map((cue) => ({ ...cue })),
  effects: project.effects.map(cloneEffect),
});

const overlaps = (
  left: Pick<MotionEffectInstance, 'startFrame' | 'durationInFrames'>,
  right: Pick<MotionEffectInstance, 'startFrame' | 'durationInFrames'>,
): boolean => left.startFrame < right.startFrame + right.durationInFrames
  && right.startFrame < left.startFrame + left.durationInFrames;

const firstFreeTrack = (
  candidate: Pick<MotionEffectInstance, 'startFrame' | 'durationInFrames'>,
  effects: readonly MotionEffectInstance[],
): number | null => {
  for (let track = 0; track <= MAX_TRACK_INDEX; track += 1) {
    if (!effects.some((effect) => effect.track === track && overlaps(effect, candidate))) return track;
  }
  return null;
};

let fallbackInstance = 0;
const createInstanceId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  fallbackInstance += 1;
  return `effect-${Date.now()}-${fallbackInstance}`;
};

const stateCreator = (initialProject: MotionProject) => (
  set: (updater: Partial<EditorStoreState> | ((state: EditorStoreState) => Partial<EditorStoreState>)) => void,
  get: () => EditorStoreState,
): EditorStoreState => ({
  project: cloneProject(initialProject),
  selectedInstanceId: null,
  currentFrame: 0,
  isPlaying: false,
  previewBackground: 'checkerboard',
  hiddenTimelineTrackIds: [],
  setVideoMetadata: (video) => set((state) => {
    const duration = Math.max(1, video.durationInFrames);
    const effects = state.project.effects.map((effect) => {
      const startFrame = Math.min(duration - 1, Math.max(0, effect.startFrame));
      const durationInFrames = Math.min(duration - startFrame, Math.max(1, effect.durationInFrames));
      const footprint = effectRegistry.get(effect.componentId).layout.footprint;
      const scale = Math.max(0.05, Math.min(
        effect.transform.scale,
        video.width / footprint.width,
        video.height / footprint.height,
      ));
      return {
        ...effect,
        startFrame,
        durationInFrames,
        transform: {
          ...effect.transform,
          x: Math.min(Math.max(0, effect.transform.x), Math.max(0, video.width)),
          y: Math.min(Math.max(0, effect.transform.y), Math.max(0, video.height)),
          scale,
        },
      };
    });
    return {
      project: { ...state.project, video: { ...video }, effects },
      currentFrame: 0,
      isPlaying: false,
    };
  }),
  setCues: (cues) => set((state) => ({
    project: { ...state.project, cues: cues.map((cue) => ({ ...cue })) },
  })),
  replaceEffects: (effects) => {
    if (effects.length > MAX_EFFECT_INSTANCES) {
      throw new Error(`A project supports at most ${MAX_EFFECT_INSTANCES} effect instances.`);
    }
    set((state) => ({
      project: { ...state.project, effects: effects.map(cloneEffect) },
      selectedInstanceId: null,
    }));
  },
  addEffect: (componentId, atFrame) => {
    const definition = effectRegistry.get(componentId);
    const instanceId = createInstanceId();
    set((state) => {
      if (state.project.effects.length >= MAX_EFFECT_INSTANCES) {
        throw new Error(`A project supports at most ${MAX_EFFECT_INSTANCES} effect instances.`);
      }
      const projectDuration = Math.max(1, state.project.video.durationInFrames);
      const requestedFrame = Number.isFinite(atFrame) ? Math.round(atFrame) : 0;
      const startFrame = Math.min(projectDuration - 1, Math.max(0, requestedFrame));
      const durationInFrames = Math.min(projectDuration - startFrame, Math.max(1, Math.round(state.project.video.fps * 3)));
      const defaults = mergeUserStyleDefaults(
        componentId,
        structuredClone(Object.fromEntries(
          Object.entries(definition.props).map(([key, prop]) => [key, prop.default]),
        )),
      );
      const requestedScale = typeof defaults.scale === 'number' ? defaults.scale / 100 : 1;
      const scale = Math.max(0.05, Math.min(
        requestedScale,
        state.project.video.width / definition.layout.footprint.width,
        state.project.video.height / definition.layout.footprint.height,
      ));
      const transform = {
        x: Math.min(
          Math.max(0, typeof defaults.posX === 'number' ? defaults.posX : 0),
          Math.max(0, state.project.video.width),
        ),
        y: Math.min(
          Math.max(0, typeof defaults.posY === 'number' ? defaults.posY : 0),
          Math.max(0, state.project.video.height),
        ),
        scale,
        rotation: 0,
      };
      const candidate = { startFrame, durationInFrames };
      const track = firstFreeTrack(candidate, state.project.effects);
      if (track === null) throw new Error('No timeline track is available.');
      const effect: MotionEffectInstance = {
        instanceId,
        componentId,
        componentVersion: definition.version,
        sourceCueIds: [],
        ...candidate,
        track,
        zIndex: Math.max(0, ...state.project.effects.map(({ zIndex }) => zIndex)) + 1,
        props: defaults,
        transform,
      };
      return {
        project: { ...state.project, effects: [...state.project.effects, effect] },
        selectedInstanceId: instanceId,
      };
    });
    return instanceId;
  },
  selectInstance: (selectedInstanceId) => set({ selectedInstanceId }),
  applySameStyle: (instanceId) => {
    const { effects } = get().project;
    const source = effects.find((effect) => effect.instanceId === instanceId);
    if (!source) return 0;
    const definition = effectRegistry.get(source.componentId);
    const sourceStyles = collectStyleValues(definition, toInstanceConfig(source, { source: 'formal-project' }));
    const targets = effects.filter((effect) => (
      effect.instanceId !== instanceId && effect.componentId === source.componentId
    ));
    if (!targets.length) return 0;
    let updated = 0;
    set((state) => ({
      project: {
        ...state.project,
        effects: state.project.effects.map((effect) => {
          if (effect.instanceId === instanceId || effect.componentId !== source.componentId) return effect;
          const { props, changed } = applyStylesToTarget(sourceStyles, effect.props);
          if (changed === 0) return effect;
          updated += 1;
          return { ...effect, props };
        }),
      },
    }));
    return updated;
  },
  applyPaletteToProject: (palette) => {
    const { effects } = get().project;
    if (!effects.length) return 0;
    let updated = 0;
    set((state) => ({
      project: {
        ...state.project,
        effects: state.project.effects.map((effect) => {
          const definition = effectRegistry.get(effect.componentId);
          const { props, changed } = applyPaletteToInstance(effect.componentId, definition, effect.props, palette);
          if (changed === 0) return effect;
          updated += 1;
          return { ...effect, props };
        }),
      },
    }));
    return updated;
  },
  deleteEffect: (instanceId) => set((state) => ({
    project: {
      ...state.project,
      effects: state.project.effects.filter((effect) => effect.instanceId !== instanceId),
    },
    selectedInstanceId: state.selectedInstanceId === instanceId ? null : state.selectedInstanceId,
  })),
  updateEffect: (instanceId, update) => set((state) => {
    const duration = Math.max(1, state.project.video.durationInFrames);
    return {
      project: {
        ...state.project,
        effects: state.project.effects.map((effect) => {
          if (effect.instanceId !== instanceId) return effect;
          const requestedStart = update.startFrame === undefined
            ? effect.startFrame
            : Number.isFinite(update.startFrame) ? Math.round(update.startFrame) : 0;
          const startFrame = Math.min(duration - 1, Math.max(0, requestedStart));
          const requestedDuration = update.durationInFrames === undefined
            ? effect.durationInFrames
            : Number.isFinite(update.durationInFrames) ? Math.round(update.durationInFrames) : 1;
          const durationInFrames = Math.min(duration - startFrame, Math.max(1, requestedDuration));
          const trackValue = update.track === undefined
            ? effect.track
            : Number.isFinite(update.track) ? Math.round(update.track) : 0;
          const zIndex = update.zIndex === undefined
            ? effect.zIndex
            : Number.isFinite(update.zIndex) ? Math.round(update.zIndex) : effect.zIndex;
          const requestedTransform = update.transform
            ? { ...effect.transform, ...structuredClone(update.transform) }
            : effect.transform;
          const footprint = effectRegistry.get(effect.componentId).layout.footprint;
          const maxScale = Math.max(0.05, Math.min(
            state.project.video.width / footprint.width,
            state.project.video.height / footprint.height,
          ));
          const scale = Math.min(maxScale, Math.max(
            0.05,
            Number.isFinite(requestedTransform.scale) ? requestedTransform.scale : effect.transform.scale,
          ));
          const transform = {
            x: Math.min(
              Math.max(0, Number.isFinite(requestedTransform.x) ? requestedTransform.x : effect.transform.x),
              Math.max(0, state.project.video.width),
            ),
            y: Math.min(
              Math.max(0, Number.isFinite(requestedTransform.y) ? requestedTransform.y : effect.transform.y),
              Math.max(0, state.project.video.height),
            ),
            scale,
            rotation: Number.isFinite(requestedTransform.rotation)
              ? requestedTransform.rotation
              : effect.transform.rotation,
          };
          return {
            ...effect,
            startFrame,
            durationInFrames,
            track: Math.min(MAX_TRACK_INDEX, Math.max(0, trackValue)),
            zIndex,
            props: update.props
              ? { ...structuredClone(effect.props), ...structuredClone(update.props) }
              : effect.props,
            transform,
          };
        }),
      },
    };
  }),
  setCurrentFrame: (frame) => set((state) => {
    const roundedFrame = Number.isFinite(frame) ? Math.round(frame) : 0;
    const lastFrame = Math.max(0, state.project.video.durationInFrames - 1);
    return { currentFrame: Math.min(lastFrame, Math.max(0, roundedFrame)) };
  }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setPreviewBackground: (previewBackground) => set({ previewBackground }),
  toggleTimelineTrack: (trackId) => set((state) => ({
    hiddenTimelineTrackIds: state.hiddenTimelineTrackIds.includes(trackId)
      ? state.hiddenTimelineTrackIds.filter((id) => id !== trackId)
      : [...state.hiddenTimelineTrackIds, trackId],
  })),
  showAllTimelineTracks: () => set({ hiddenTimelineTrackIds: [] }),
  openProject: (serialized) => {
    const result = parseProject(serialized);
    if (result.ok) {
      set({
        project: cloneProject(result.project),
        selectedInstanceId: null,
        currentFrame: 0,
        isPlaying: false,
        hiddenTimelineTrackIds: [],
      });
    }
    return result;
  },
});

export function createEditorStore(initialProject: MotionProject = emptyProject()) {
  return createStore<EditorStoreState>()(stateCreator(initialProject));
}

export const useEditorStore = create<EditorStoreState>()(stateCreator(emptyProject()));
