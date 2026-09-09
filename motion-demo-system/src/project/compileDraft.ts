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
  const lockedFields = (definition.legacy.listFields ?? []).filter(({ key }) => !editable.has(key) && key !== 'at');
  return value.map((item, index) => {
    const base = defaultItems[index] ?? {};
    const locked = Object.fromEntries(lockedFields.map((field) => [
      field.key,
      cloneValue(base[field.key] ?? field.default ?? ''),
    ]));
    const source = cloneValue(item) as Record<string, unknown>;
    // at（出现时机，秒）为渲染层契约字段：AI 提供且合法则透传，否则不注入任何默认值
    // （缺省 = 渲染器回退均匀节奏；不能用样本默认的 at 覆盖 AI 的编排意图）
    const out: Record<string, unknown> = { ...locked, ...source };
    if ('at' in out) {
      // at 规范化：数值或可解析字符串 → 保留；null/空串/非法 → 删除（渲染层回退均匀节奏）
      const raw = out.at;
      const empty = raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '');
      const at = empty ? NaN : Number(raw);
      if (!Number.isFinite(at) || at < 0) delete out.at;
      else out.at = at;
    }
    return out;
  });
};

// 条目出现时机钳制：at（秒）超出实例时长时压回边界，避免 AI 给出越界值导致条目永不出现
const clampItemTiming = (
  props: Record<string, unknown>,
  durationInFrames: number,
  fps: number,
): void => {
  const maxSec = Math.max(0, durationInFrames / fps);
  for (const value of Object.values(props)) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (item && typeof item === 'object' && !Array.isArray(item) && 'at' in item) {
        const at = Number((item as Record<string, unknown>).at);
        if (Number.isFinite(at)) (item as Record<string, unknown>).at = Math.max(0, Math.min(at, maxSec));
      }
    }
  }
};

/**
 * 依据 placementPreset 分区 + 用户/内置默认位置计算落位。
 *
 * 优先级：用户存过的位置 > placementPreset 分区 > 内置默认。
 * 修 bug 前，非 auto 分区会直接按画布边缘算（left→0、top→0），
 * 把用户「存为默认样式」里调好的 posX/posY 彻底丢掉，
 * 表现为「明明调好了 t1-01 的位置，导入 JSON 后又跑回左上角」。
 * 现在只要用户为该组件存过位置，就以它为准（钳进画布）；
 * 没存过的仍按 placementPreset 分区落位，行为不变。
 */
const transformFor = (
  definition: EffectDefinition,
  preset: PlacementPreset | undefined,
  project: MotionProject,
  defaults: Record<string, unknown>,
  userLayout?: Record<string, unknown>,
): MotionEffectInstance['transform'] => {
  const defaultX = typeof defaults.posX === 'number' ? defaults.posX : 0;
  const defaultY = typeof defaults.posY === 'number' ? defaults.posY : 0;
  const scale = typeof defaults.scale === 'number' ? defaults.scale / 100 : 1;
  const width = definition.layout.footprint.width * scale;
  const height = definition.layout.footprint.height * scale;
  const clamp = (value: number, max: number) => Math.min(Math.max(0, value), Math.max(0, max));

  if (userLayout
    && (typeof userLayout.posX === 'number' || typeof userLayout.posY === 'number')) {
    return {
      x: clamp(typeof userLayout.posX === 'number' ? userLayout.posX : defaultX,
        project.video.width - width),
      y: clamp(typeof userLayout.posY === 'number' ? userLayout.posY : defaultY,
        project.video.height - height),
      scale,
      rotation: 0,
    };
  }

  if (!preset || preset === 'auto') return { x: defaultX, y: defaultY, scale, rotation: 0 };
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
    // 只并入「样式 + 位置缩放」：文字内容必须留给 AI 依据字幕写出的 content，
    // 否则用户快照里的旧文案会盖掉新文案（导入后文字改不动的元凶）。
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
      { definition, roles: ['style', 'layout'] },
    );
    const transform = transformFor(
      definition, component.placementPreset, project, props,
      options.userStyleDefaults?.[component.componentId],
    );
    clampItemTiming(props, durationInFrames, project.video.fps);
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
