import { z } from 'zod';
import { FILE_KINDS } from './types';
import { MAX_EFFECT_INSTANCES, MAX_TRACK_INDEX } from './limits';

const positiveNumber = z.number().finite().positive();
const positiveInteger = z.number().int().positive();
const nonnegativeInteger = z.number().int().nonnegative();

const PlacementPresetSchema = z.enum([
  'auto',
  'left-top',
  'left-center',
  'left-bottom',
  'right-top',
  'right-center',
  'right-bottom',
  'full-width',
]);

export const SubtitleCueSchema = z.object({
  cueId: z.string().min(1),
  startMs: z.number().finite().nonnegative(),
  endMs: z.number().finite(),
  text: z.string().min(1),
}).strict().refine(({ startMs, endMs }) => endMs > startMs, {
  message: 'endMs must be greater than startMs',
  path: ['endMs'],
});

const AgentInputVideoSchema = z.object({
  width: positiveNumber,
  height: positiveNumber,
  fps: positiveNumber,
  durationMs: positiveNumber,
}).strict();

const MotionProjectVideoSchema = z.object({
  width: positiveNumber,
  height: positiveNumber,
  fps: positiveNumber,
  durationInFrames: positiveInteger,
}).strict();

const AgentDraftComponentSchema = z.object({
  componentId: z.string(),
  componentVersion: z.number(),
  role: z.string(),
  content: z.record(z.unknown()),
  placementPreset: PlacementPresetSchema.optional(),
}).strict();

const AgentDraftSceneSchema = z.object({
  sceneId: z.string(),
  sourceCueIds: z.array(z.string().min(1)).min(1),
  components: z.array(AgentDraftComponentSchema),
}).strict();

export const AgentInputSchema = z.object({
  kind: z.literal(FILE_KINDS.agentInput),
  schemaVersion: z.literal(1),
  componentLibraryVersion: z.literal(1),
  video: AgentInputVideoSchema,
  cues: z.array(SubtitleCueSchema),
}).strict();

export const AgentDraftSchema = z.object({
  kind: z.literal(FILE_KINDS.agentDraft),
  schemaVersion: z.literal(1),
  componentLibraryVersion: z.literal(1),
  scenes: z.array(AgentDraftSceneSchema),
}).strict().superRefine(({ scenes }, context) => {
  const componentCount = scenes.reduce((total, scene) => total + scene.components.length, 0);
  if (componentCount <= MAX_EFFECT_INSTANCES) return;
  context.addIssue({
    code: z.ZodIssueCode.too_big,
    maximum: MAX_EFFECT_INSTANCES,
    type: 'array',
    inclusive: true,
    exact: false,
    message: `Drafts support at most ${MAX_EFFECT_INSTANCES} effect instances.`,
    path: ['scenes'],
  });
});

const MotionEffectInstanceSchema = z.object({
  instanceId: z.string(),
  sceneId: z.string().optional(),
  componentId: z.string(),
  componentVersion: z.number(),
  sourceCueIds: z.array(z.string().min(1)),
  startFrame: nonnegativeInteger,
  durationInFrames: positiveInteger,
  track: nonnegativeInteger.max(MAX_TRACK_INDEX),
  zIndex: z.number(),
  props: z.record(z.unknown()),
  transform: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    scale: z.number().finite().positive(),
    rotation: z.number().finite(),
  }).strict(),
}).strict();

export const MotionProjectSchema = z.object({
  kind: z.literal(FILE_KINDS.project),
  schemaVersion: z.literal(1),
  video: MotionProjectVideoSchema,
  cues: z.array(SubtitleCueSchema),
  effects: z.array(MotionEffectInstanceSchema).max(MAX_EFFECT_INSTANCES),
}).strict().superRefine(({ video, effects }, context) => {
  effects.forEach((effect, index) => {
    if (effect.startFrame + effect.durationInFrames <= video.durationInFrames) return;
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'effect must end within the project duration',
      path: ['effects', index, 'durationInFrames'],
    });
  });
});
