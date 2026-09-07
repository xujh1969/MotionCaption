import { effectRegistry, type EffectRegistry } from '../effects/registry';
import type { EffectDefinition, EffectPropDefinition, PlacementPreset } from '../effects/types';
import { AgentDraftSchema } from './schema';
import type { AgentDraft, AgentInput, MotionEffectInstance } from './types';
import { MAX_EFFECT_INSTANCES } from './limits';
import { cueFrameInterval } from './cueTiming';
import {
  allocateTimelineTracks,
  type PendingTrackInterval,
  type TrackAllocationOptions,
} from './trackAllocation';

export interface DraftDiagnostic {
  code: string;
  message: string;
  path?: Array<string | number>;
}

export interface AgentDraftValidationResult {
  valid: boolean;
  errors: DraftDiagnostic[];
  warnings: DraftDiagnostic[];
}

interface Box { left: number; top: number; right: number; bottom: number }
interface PlacedComponent {
  index: number;
  sceneIndex: number;
  componentId: string;
  exclusive: boolean;
  startMs: number;
  endMs: number;
  box: Box;
}

const warningLength = (prop: EffectPropDefinition): number => {
  if (prop.semanticRole === 'title' || prop.semanticRole === 'label') return 40;
  if (prop.semanticRole === 'body') return 80;
  return 120;
};

const contentMatchesType = (value: unknown, definition: EffectPropDefinition): boolean => {
  if (definition.type === 'number') {
    return typeof value === 'number'
      && Number.isFinite(value)
      && (definition.min === undefined || value >= definition.min)
      && (definition.max === undefined || value <= definition.max);
  }
  if (definition.type === 'list') return Array.isArray(value);
  return typeof value === 'string';
};

const normalizedSource = (input: AgentInput, cueIds: string[]): string => {
  const wanted = new Set(cueIds);
  return input.cues.filter(({ cueId }) => wanted.has(cueId)).map(({ text }) => text).join('\n');
};

const numbersIn = (value: string): number[] => (
  (value.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
);

const knownUnitTokens = [
  '百分比', '毫秒', '微秒', '纳秒', '厘米', '毫米', '千米', '公里', '公斤', '千克',
  '分钟', '小时', '万元', '亿元', '像素', '帧', '米', '秒', '克', '元', '个', '次',
  '倍', '人', '天',
  'Mbps', 'Kbps', 'Gbps', 'fps', 'kHz', 'MHz', 'GHz', 'px', 'ms', 'kg', 'km',
  'cm', 'mm', 'Hz', 'dB', 'KB', 'MB', 'GB', 'TB', 'bps', 'dpi', 'min', 's', 'g',
  'm', 'h', 'B', '°C', '°F', '℃', '℉', '%', '‰',
] as const;

const unitTokenPattern = [...knownUnitTokens]
  .sort((left, right) => right.length - left.length)
  .map((unit) => unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
const unitClaimPattern = new RegExp(
  `-?\\d+(?:\\.\\d+)?\\s*(?:${unitTokenPattern})(?![A-Za-z])`,
  'giu',
);

const unitClaimsIn = (value: string): string[] => (
  value.match(unitClaimPattern) ?? []
);

const normalizeClaim = (value: string): string => value.replace(/\s/g, '').toLowerCase();

const sourceContainsUnit = (source: string, value: string): boolean => {
  if (!value) return false;
  const normalizedUnit = normalizeClaim(value);
  if (unitClaimsIn(source).some((claim) => (
    normalizeClaim(claim.replace(/^-?\d+(?:\.\d+)?\s*/, '')) === normalizedUnit
  ))) return true;
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'iu').test(source);
};

const validateProvenance = (
  value: unknown,
  key: string,
  source: string,
  path: Array<string | number>,
  errors: DraftDiagnostic[],
): void => {
  const sourceNumbers = numbersIn(source);
  const sourceUnitClaims = new Set(unitClaimsIn(source).map(normalizeClaim));

  if (typeof value === 'number') {
    if (!sourceNumbers.includes(value)) {
      errors.push({ code: 'unsourced_number', message: `Numeric claim is absent from source cues: ${value}`, path });
    }
    return;
  }
  if (typeof value === 'string') {
    for (const number of numbersIn(value)) {
      if (!sourceNumbers.includes(number)) {
        errors.push({ code: 'unsourced_number', message: `Numeric claim is absent from source cues: ${number}`, path });
      }
    }
    for (const claim of unitClaimsIn(value)) {
      if (!sourceUnitClaims.has(normalizeClaim(claim))) {
        errors.push({ code: 'unsourced_unit', message: `Unit-bearing claim is absent from source cues: ${claim}`, path });
      }
    }
    if (/unit/i.test(key) && !sourceContainsUnit(source, value)) {
      errors.push({ code: 'unsourced_unit', message: `Unit is absent from source cues: ${value}`, path });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateProvenance(item, key, source, [...path, index], errors));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      validateProvenance(childValue, childKey, source, [...path, childKey], errors);
    }
  }
};

const boxFor = (
  preset: PlacementPreset,
  definition: EffectDefinition,
  video: AgentInput['video'],
): Box => {
  const defaultScale = definition.props.scale?.default;
  const scale = typeof defaultScale === 'number' ? defaultScale / 100 : 1;
  const width = preset === 'full-width' ? video.width : definition.layout.footprint.width * scale;
  const height = definition.layout.footprint.height * scale;
  const defaultX = definition.props.posX?.default;
  const defaultY = definition.props.posY?.default;
  const horizontal = preset.startsWith('right') ? video.width - width
    : preset === 'full-width' ? 0
      : preset === 'auto' && typeof defaultX === 'number' ? defaultX : 0;
  const vertical = preset.endsWith('bottom') ? video.height - height
    : preset.endsWith('center') || preset === 'full-width' ? (video.height - height) / 2
      : preset === 'auto' && typeof defaultY === 'number' ? defaultY : 0;
  return { left: horizontal, top: vertical, right: horizontal + width, bottom: vertical + height };
};

const boxesOverlap = (left: Box, right: Box): boolean => (
  left.left < right.right && left.right > right.left
  && left.top < right.bottom && left.bottom > right.top
);

const registryDefinition = (
  registry: EffectRegistry,
  componentId: string,
): EffectDefinition | undefined => {
  try {
    return registry.get(componentId);
  } catch {
    return undefined;
  }
};

export function validateAgentDraft(
  draftValue: unknown,
  input: AgentInput,
  registry: EffectRegistry = effectRegistry,
  existingEffects: readonly Pick<MotionEffectInstance, 'track' | 'startFrame' | 'durationInFrames'>[] = [],
  allocationOptions: TrackAllocationOptions = {},
): AgentDraftValidationResult {
  const errors: DraftDiagnostic[] = [];
  const warnings: DraftDiagnostic[] = [];
  const parsed = AgentDraftSchema.safeParse(draftValue);

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const code = issue.path[0] === 'schemaVersion' ? 'schema_version'
        : issue.path[0] === 'componentLibraryVersion' ? 'library_version'
          : issue.code === 'too_big' && issue.path[0] === 'scenes' ? 'effect_capacity'
            : 'invalid_schema';
      errors.push({ code, message: issue.message, path: issue.path });
    }
    return { valid: false, errors, warnings };
  }

  const draft: AgentDraft = parsed.data;
  const pendingEffectCount = draft.scenes.reduce((total, scene) => total + scene.components.length, 0);
  if (existingEffects.length + pendingEffectCount > MAX_EFFECT_INSTANCES) {
    return {
      valid: false,
      errors: [{
        code: 'effect_capacity',
        message: `Projects support at most ${MAX_EFFECT_INSTANCES} effect instances.`,
        path: ['scenes'],
      }],
      warnings,
    };
  }
  if (draft.schemaVersion !== input.schemaVersion) {
    errors.push({ code: 'schema_version', message: 'Draft schema version is incompatible with the input.' });
  }
  if (draft.componentLibraryVersion !== input.componentLibraryVersion) {
    errors.push({ code: 'library_version', message: 'Draft component library version is incompatible with the input.' });
  }

  const cueIds = new Set(input.cues.map(({ cueId }) => cueId));
  const usedCueIds = new Set<string>();
  const placed: PlacedComponent[] = [];
  const pendingIntervals: PendingTrackInterval[] = [];
  const projectDuration = Math.max(1, Math.round(input.video.durationMs * input.video.fps / 1000));

  draft.scenes.forEach((scene, sceneIndex) => {
    const sourceText = normalizedSource(input, scene.sourceCueIds);
    const firstCue = input.cues.find(({ cueId }) => cueId === scene.sourceCueIds[0]);
    const lastCue = input.cues.find(({ cueId }) => cueId === scene.sourceCueIds[scene.sourceCueIds.length - 1]);
    scene.sourceCueIds.forEach((cueId, cueIndex) => {
      usedCueIds.add(cueId);
      const cue = input.cues.find((candidate) => candidate.cueId === cueId);
      if (!cueIds.has(cueId) || !cue) {
        errors.push({
          code: 'unknown_cue', message: `Unknown source cue: ${cueId}`,
          path: ['scenes', sceneIndex, 'sourceCueIds', cueIndex],
        });
      }
    });

    const referencedCues = scene.sourceCueIds.flatMap((cueId) => {
      const cue = input.cues.find((candidate) => candidate.cueId === cueId);
      return cue ? [cue] : [];
    });
    referencedCues.slice(1).forEach((cue, index) => {
      const previous = referencedCues[index];
      if (cue.startMs < previous.startMs || cue.endMs < previous.endMs) {
        errors.push({
          code: 'cue_order', message: 'Source cues must form a monotonic scene interval.',
          path: ['scenes', sceneIndex, 'sourceCueIds', index + 1],
        });
      }
    });
    const sceneInterval = firstCue && lastCue
      ? cueFrameInterval(
        { startMs: firstCue.startMs, endMs: lastCue.endMs },
        input.video.fps,
        projectDuration,
      )
      : null;
    if (firstCue && lastCue && !sceneInterval) {
      errors.push({
        code: 'cue_bounds', message: 'Source cues compile outside the video frame range.',
        path: ['scenes', sceneIndex, 'sourceCueIds'],
      });
    }

    const roles = new Map<string, number>();
    if (scene.components.length > 2) {
      warnings.push({
        code: 'too_many_subjects', message: 'A scene should have no more than two visual subjects.',
        path: ['scenes', sceneIndex, 'components'],
      });
    }

    scene.components.forEach((component, componentIndex) => {
      const path = ['scenes', sceneIndex, 'components', componentIndex] as Array<string | number>;
      if (sceneInterval) pendingIntervals.push({
        key: `${scene.sceneId}:${componentIndex}`,
        startFrame: sceneInterval.startFrame,
        endFrame: sceneInterval.endFrame,
      });
      const count = roles.get(component.role) ?? 0;
      roles.set(component.role, count + 1);
      if (count === 1) {
        warnings.push({ code: 'duplicate_role', message: `Duplicate visual role: ${component.role}`, path: [...path, 'role'] });
      }

      const definition = registryDefinition(registry, component.componentId);
      if (!definition) {
        errors.push({ code: 'unknown_component', message: `Unknown component: ${component.componentId}`, path: [...path, 'componentId'] });
        return;
      }
      if (component.componentVersion !== definition.version) {
        errors.push({ code: 'component_version', message: `Incompatible component version: ${component.componentId}`, path: [...path, 'componentVersion'] });
      }

      const editableProps = Object.entries(definition.props).filter(([, prop]) => prop.agentEditable);
      for (const [key, prop] of editableProps) {
        if (prop.required && !(key in component.content)) {
          errors.push({ code: 'required_content', message: `Missing required content: ${key}`, path: [...path, 'content', key] });
        }
      }

      for (const [key, value] of Object.entries(component.content)) {
        const prop = definition.props[key];
        if (!prop || !prop.agentEditable) {
          errors.push({ code: 'unknown_content_field', message: `Unknown or locked content field: ${key}`, path: [...path, 'content', key] });
          continue;
        }
        if (!contentMatchesType(value, prop)) {
          errors.push({ code: 'content_type', message: `Invalid value for content field: ${key}`, path: [...path, 'content', key] });
          continue;
        }

        validateProvenance(value, key, sourceText, [...path, 'content', key], errors);
        if (Array.isArray(value)) {
          const { minItems, maxItems } = definition.selection;
          if ((minItems !== undefined && value.length < minItems) || (maxItems !== undefined && value.length > maxItems)) {
            errors.push({ code: 'list_capacity', message: `List capacity is invalid for ${component.componentId}.${key}`, path: [...path, 'content', key] });
          }
          const fields = prop.legacy.listFields;
          if (fields) {
            const editableFields = fields.filter((field) => prop.agentEditableItemFields?.includes(field.key));
            const allowed = new Set(editableFields.map((field) => field.key));
            value.forEach((item, itemIndex) => {
              if (!item || typeof item !== 'object' || Array.isArray(item)) {
                errors.push({ code: 'content_type', message: `List item must be an object: ${key}`, path: [...path, 'content', key, itemIndex] });
                return;
              }
              for (const field of editableFields) {
                if (!(field.key in item)) {
                  errors.push({ code: 'required_content', message: `Missing list item field: ${field.key}`, path: [...path, 'content', key, itemIndex, field.key] });
                }
              }
              for (const [itemKey, itemValue] of Object.entries(item)) {
                if (!allowed.has(itemKey)) {
                  errors.push({ code: 'unknown_content_field', message: `Unknown list item field: ${itemKey}`, path: [...path, 'content', key, itemIndex, itemKey] });
                } else if (typeof itemValue !== 'string') {
                  errors.push({ code: 'content_type', message: `List item field must be text: ${itemKey}`, path: [...path, 'content', key, itemIndex, itemKey] });
                }
              }
            });
          }
        } else if (typeof value === 'string' && value.length > warningLength(prop)) {
          warnings.push({ code: 'recommended_length', message: `Content exceeds the recommended length: ${key}`, path: [...path, 'content', key] });
        }
      }

      const preset = component.placementPreset ?? definition.layout.preferredZones[0] ?? 'auto';
      const box = boxFor(preset, definition, input.video);
      if (firstCue && lastCue) {
        for (const previous of placed) {
          const timeOverlaps = firstCue.startMs < previous.endMs && previous.startMs < lastCue.endMs;
          if (timeOverlaps && (definition.layout.exclusive || previous.exclusive)) {
            errors.push({
              code: 'exclusive_conflict',
              message: `Exclusive components overlap: ${previous.componentId} and ${component.componentId}`,
              path,
            });
          }
          if (timeOverlaps && boxesOverlap(previous.box, box)) {
            warnings.push({
              code: 'footprint_collision',
              message: `Declared component footprints collide: scene ${previous.sceneIndex} component ${previous.index} and scene ${sceneIndex} component ${componentIndex}`,
              path,
            });
          }
        }
        placed.push({
          index: componentIndex,
          sceneIndex,
          componentId: component.componentId,
          exclusive: definition.layout.exclusive,
          startMs: firstCue.startMs,
          endMs: lastCue.endMs,
          box,
        });
      }
    });
  });

  const allocation = allocateTimelineTracks(
    existingEffects.map(({ track, startFrame, durationInFrames }) => ({
      track, startFrame, endFrame: startFrame + durationInFrames,
    })),
    pendingIntervals,
    allocationOptions,
  );
  if (!allocation.ok) {
    if (allocation.code === 'instance_limit') {
      errors.push({
        code: 'effect_capacity',
        message: `Projects support at most ${MAX_EFFECT_INSTANCES} effect instances.`,
        path: ['scenes'],
      });
    } else if (allocation.code === 'search_limit') {
      errors.push({
        code: 'search_limit',
        message: 'Timeline track allocation search limit was reached.',
        path: ['scenes'],
      });
    } else {
      errors.push({
        code: 'track_capacity',
        message: 'No timeline track allocation exists within the 64-track limit.',
        path: ['scenes'],
      });
    }
  }

  for (const cue of input.cues) {
    if (!usedCueIds.has(cue.cueId)) {
      warnings.push({ code: 'unused_cue', message: `Subtitle cue is unused: ${cue.cueId}`, path: ['cues', cue.cueId] });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
