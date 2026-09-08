import { effectRegistry, type EffectRegistry } from '../effects/registry';
import { mergeUserStyleDefaults, type UserStyleDefaults } from '../effects/stylePrefs';
import type { EffectDefinition, PlacementPreset } from '../effects/types';
import type { AgentDraft, MotionEffectInstance, MotionProject, SubtitleCue } from './types';
import { cueFrameInterval } from './cueTiming';
import { allocateTimelineTracks } from './trackAllocation';
import { validateAgentDraft } from './validateDraft';

export interface CompileAgentDraftOptions {
  registry?: EffectRegistry;
  createInstanceId?: () => string;
  searchStepLimit?: number;
  /** 测试注入的用户全局默认；缺省读 localStorage（无记录时空操作）。 */
  userStyleDefaults?: UserStyleDefaults;
}

const randomInstanceId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `effect-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const cueFor = (cues: SubtitleCue[], cueId: string): SubtitleCue => {
  const cue = cues.find((candidate) => candidate.cueId === cueId);
  if (!cue) throw new Error(`Unknown source cue: ${cueId}`);
  return cue;
};

const cloneValue = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map((item) => cloneValue(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneValue(child)]),
    ) as T;
  }
  return value;
};

const mergeAgentListContent = (
  definition: EffectDefinition['props'][string],
  value: unknown,
): unknown => {
  if (definition.type !== 'list' || !Array.isArray(value)) return cloneValue(value);
  const editable = new Set(definition.agentEditableItemFields ?? []);
  let defaultItems: Array<Record<string, unknown>> = [];
  if (typeof definition.default === 'string') {
    try {
      const parsed = JSON.parse(definition.default);
      if (Array.isArray(parsed)) defaultItems = parsed;
    } catch {
      // Registry validation owns the content contract; malformed legacy defaults stay empty here.
    }
  }
  const lockedFields = (definition.legacy.listFields ?? []).filter(({ key }) => !editable.has(key));
  return value.map((item, index) => {
    const base = defaultItems[index] ?? {};
    const locked = Object.fromEntries(lockedFields.map((field) => [
      field.key,
      cloneValue(base[field.key] ?? field.default ?? ''),
    ]));
    return { ...locked, ...cloneValue(item) };
  });
};

const transformFor = (
  definition: EffectDefinition,
  preset: PlacementPreset | undefined,
  project: MotionProject,
  defaults: Record<string, unknown>,
): MotionEffectInstance['transform'] => {
  const defaultX = typeof defaults.posX === 'number' ? defaults.posX : 0;
  const defaultY = typeof defaults.posY === 'number' ? defaults.posY : 0;
  const scale = typeof defaults.scale === 'number' ? defaults.scale / 100 : 1;
  if (!preset || preset === 'auto') return { x: defaultX, y: defaultY, scale, rotation: 0 };

  const width = definition.layout.footprint.width * scale;
  const height = definition.layout.footprint.height * scale;
  const x = preset.startsWith('right') ? project.video.width - width : 0;
  const y = preset.endsWith('bottom') ? project.video.height - height
    : preset.endsWith('center') || preset === 'full-width'
      ? (project.video.height - height) / 2 : 0;
  return { x, y, scale, rotation: 0 };
};

export function compileAgentDraft(
  project: MotionProject,
  draft: AgentDraft,
  options: CompileAgentDraftOptions = {},
): MotionEffectInstance[] {
  const registry = options.registry ?? effectRegistry;
  const validation = validateAgentDraft(draft, {
    kind: 'captionforge.agent-input',
    schemaVersion: 1,
    componentLibraryVersion: 1,
    video: {
      width: project.video.width,
      height: project.video.height,
      fps: project.video.fps,
      durationMs: project.video.durationInFrames / project.video.fps * 1000,
    },
    cues: project.cues,
  }, registry, project.effects, { searchStepLimit: options.searchStepLimit });
  if (!validation.valid) {
    throw new Error(`Invalid agent draft: ${validation.errors.map(({ message }) => message).join('; ')}`);
  }

  const createInstanceId = options.createInstanceId ?? randomInstanceId;
  const pending: Array<{
    originalIndex: number;
    scene: AgentDraft['scenes'][number];
    component: AgentDraft['scenes'][number]['components'][number];
    startFrame: number;
    durationInFrames: number;
  }> = [];

  for (const scene of draft.scenes) {
    const firstCue = cueFor(project.cues, scene.sourceCueIds[0]);
    const lastCue = cueFor(project.cues, scene.sourceCueIds[scene.sourceCueIds.length - 1]);
    const interval = cueFrameInterval(
      { startMs: firstCue.startMs, endMs: lastCue.endMs },
      project.video.fps,
      project.video.durationInFrames,
    );
    if (!interval) throw new Error('Source cues do not intersect the project frame range.');
    const { startFrame, durationInFrames } = interval;

    for (const component of scene.components) {
      pending.push({
        originalIndex: pending.length,
        scene,
        component,
        startFrame,
        durationInFrames,
      });
    }
  }

  const allocation = allocateTimelineTracks(
    project.effects.map(({ track, startFrame, durationInFrames }) => ({
      track, startFrame, endFrame: startFrame + durationInFrames,
    })),
    pending.map(({ scene, originalIndex, startFrame, durationInFrames }) => ({
      key: `${scene.sceneId}:${originalIndex}`,
      startFrame,
      endFrame: startFrame + durationInFrames,
    })),
    { searchStepLimit: options.searchStepLimit },
  );
  if (!allocation.ok) {
    if (allocation.code === 'search_limit') throw new Error('Timeline track allocation search limit was reached.');
    throw new Error('No timeline track allocation is available.');
  }
  const tracks = allocation.tracks;

  return pending.map(({ originalIndex, scene, component, startFrame, durationInFrames }) => {
    const definition = registry.get(component.componentId);
    const defaults = Object.fromEntries(
      Object.entries(definition.props).map(([key, prop]) => [key, cloneValue(prop.default)]),
    );
    const props = mergeUserStyleDefaults(
      component.componentId,
      cloneValue({
        ...defaults,
        ...Object.fromEntries(Object.entries(component.content).map(([key, value]) => [
          key,
          mergeAgentListContent(definition.props[key], value),
        ])),
      }),
      options.userStyleDefaults,
    );
    const transform = transformFor(definition, component.placementPreset, project, defaults);
    const effect: MotionEffectInstance = {
      instanceId: createInstanceId(),
      sceneId: scene.sceneId,
      componentId: component.componentId,
      componentVersion: component.componentVersion,
      sourceCueIds: [...scene.sourceCueIds],
      startFrame,
      durationInFrames,
      track: tracks[originalIndex],
      zIndex: project.effects.length + originalIndex + 1,
      props,
      transform,
    };
    return effect;
  });
}
