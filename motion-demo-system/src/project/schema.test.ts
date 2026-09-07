import { describe, expect, it } from 'vitest';
import { AgentDraftSchema, AgentInputSchema, MotionProjectSchema } from './schema';

const validCues = [{
  cueId: 'cue-1',
  startMs: 0,
  endMs: 4000,
  text: 'First cue',
}];

const validAgentInput = {
  kind: 'captionforge.agent-input',
  schemaVersion: 1,
  componentLibraryVersion: 1,
  video: { width: 1920, height: 1080, fps: 30, durationMs: 10000 },
  cues: validCues,
};

const validDraft = {
  kind: 'captionforge.agent-draft',
  schemaVersion: 1,
  componentLibraryVersion: 1,
  scenes: [{
    sceneId: 'scene-1',
    sourceCueIds: ['cue-1'],
    components: [
      {
        componentId: 't1-01',
        componentVersion: 1,
        role: 'title',
        content: { titleText: 'First' },
        placementPreset: 'left-top',
      },
      {
        componentId: 't2-01',
        componentVersion: 1,
        role: 'body',
        content: { contentText: 'Second' },
      },
    ],
  }],
};

const validProject = {
  kind: 'captionforge.project',
  schemaVersion: 1,
  video: { width: 1920, height: 1080, fps: 30, durationInFrames: 300 },
  cues: validCues,
  effects: [{
    instanceId: 'effect-1',
    sceneId: 'scene-1',
    componentId: 't1-01',
    componentVersion: 1,
    sourceCueIds: ['cue-1'],
    startFrame: 0,
    durationInFrames: 120,
    track: 0,
    zIndex: 1,
    props: { titleText: 'First' },
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  }],
};

describe('AgentInputSchema', () => {
  it('accepts sourced cue input', () => {
    expect(AgentInputSchema.parse(validAgentInput)).toEqual(validAgentInput);
  });

  it('rejects invalid cue timing', () => {
    expect(() => AgentInputSchema.parse({
      ...validAgentInput,
      cues: [{ ...validCues[0], endMs: 0 }],
    })).toThrow();
  });

  it('rejects unknown cue fields', () => {
    expect(() => AgentInputSchema.parse({
      ...validAgentInput,
      cues: [{ ...validCues[0], extra: true }],
    })).toThrow();
  });
});

describe('AgentDraftSchema', () => {
  it('accepts a scene with two components', () => {
    expect(AgentDraftSchema.parse(validDraft)).toEqual(validDraft);
  });

  it('rejects unknown object fields', () => {
    expect(() => AgentDraftSchema.parse({
      ...validDraft,
      scenes: [{ ...validDraft.scenes[0], extra: true }],
    })).toThrow();
  });

  it('rejects an incorrect kind', () => {
    expect(() => AgentDraftSchema.parse({ ...validDraft, kind: 'captionforge.project' })).toThrow();
  });

  it('rejects an unknown schema version', () => {
    expect(() => AgentDraftSchema.parse({ ...validDraft, schemaVersion: 2 })).toThrow();
  });

  it('rejects empty source cue references', () => {
    expect(() => AgentDraftSchema.parse({
      ...validDraft,
      scenes: [{ ...validDraft.scenes[0], sourceCueIds: [] }],
    })).toThrow();
  });

  it('rejects empty scene source cue IDs', () => {
    expect(() => AgentDraftSchema.parse({
      ...validDraft,
      scenes: [{ ...validDraft.scenes[0], sourceCueIds: [''] }],
    })).toThrow();
  });

  it('rejects unknown component fields', () => {
    expect(() => AgentDraftSchema.parse({
      ...validDraft,
      scenes: [{
        ...validDraft.scenes[0],
        components: [{ ...validDraft.scenes[0].components[0], extra: true }],
      }],
    })).toThrow();
  });

  it('rejects stringified lists', () => {
    expect(() => AgentDraftSchema.parse({
      ...validDraft,
      scenes: JSON.stringify(validDraft.scenes),
    })).toThrow();
  });

  it('rejects more than 256 components across scenes with a precise aggregate issue', () => {
    const result = AgentDraftSchema.safeParse({
      ...validDraft,
      scenes: [
        { ...validDraft.scenes[0], components: Array.from({ length: 128 }, () => validDraft.scenes[0].components[0]) },
        { ...validDraft.scenes[0], sceneId: 'scene-2', components: Array.from({ length: 129 }, () => validDraft.scenes[0].components[0]) },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toContainEqual(expect.objectContaining({
      code: 'too_big', path: ['scenes'], maximum: 256,
    }));
  });
});

describe('MotionProjectSchema', () => {
  it('accepts a manual effect without subtitle cue provenance', () => {
    const manualProject = structuredClone(validProject);
    manualProject.cues = [];
    manualProject.effects[0].sourceCueIds = [];

    expect(MotionProjectSchema.safeParse(manualProject).success).toBe(true);
  });

  it('rejects more than 256 formal effect instances', () => {
    expect(() => MotionProjectSchema.parse({
      ...validProject,
      effects: Array.from({ length: 257 }, (_, index) => ({
        ...validProject.effects[0], instanceId: `effect-${index}`,
      })),
    })).toThrow();
  });

  it.each([0, 1.5])('rejects a non-positive or fractional project duration: %s', (durationInFrames) => {
    expect(() => MotionProjectSchema.parse({
      ...validProject,
      video: { ...validProject.video, durationInFrames },
    })).toThrow();
  });

  it('rejects a zero-frame effect duration', () => {
    expect(() => MotionProjectSchema.parse({
      ...validProject,
      effects: [{ ...validProject.effects[0], durationInFrames: 0 }],
    })).toThrow();
  });

  it.each([-1, 1.5, 64, 1e9])('rejects an invalid or unsafe track index: %s', (track) => {
    expect(() => MotionProjectSchema.parse({
      ...validProject,
      effects: [{ ...validProject.effects[0], track }],
    })).toThrow();
  });

  it.each([
    ['startFrame', 0.5],
    ['durationInFrames', 12.5],
  ])('rejects a fractional %s', (field, value) => {
    expect(() => MotionProjectSchema.parse({
      ...validProject,
      effects: [{ ...validProject.effects[0], [field]: value }],
    })).toThrow();
  });

  it('rejects an effect that extends beyond the project duration', () => {
    expect(() => MotionProjectSchema.parse({
      ...validProject,
      effects: [{
        ...validProject.effects[0],
        startFrame: 200,
        durationInFrames: 101,
      }],
    })).toThrow();
  });

  it('rejects an invalid transform', () => {
    expect(() => MotionProjectSchema.parse({
      ...validProject,
      effects: [{ ...validProject.effects[0], transform: { x: 0, y: 0, scale: 1 } }],
    })).toThrow();
  });

  it('rejects an empty effect source cue ID', () => {
    expect(() => MotionProjectSchema.parse({
      ...validProject,
      effects: [{ ...validProject.effects[0], sourceCueIds: [''] }],
    })).toThrow();
  });

  it.each([0, -1])('rejects a non-positive transform scale: %i', (scale) => {
    expect(() => MotionProjectSchema.parse({
      ...validProject,
      effects: [{
        ...validProject.effects[0],
        transform: { ...validProject.effects[0].transform, scale },
      }],
    })).toThrow();
  });

  it('rejects unknown effect fields', () => {
    expect(() => MotionProjectSchema.parse({
      ...validProject,
      effects: [{ ...validProject.effects[0], extra: true }],
    })).toThrow();
  });

  it('rejects unknown transform fields', () => {
    expect(() => MotionProjectSchema.parse({
      ...validProject,
      effects: [{
        ...validProject.effects[0],
        transform: { ...validProject.effects[0].transform, extra: true },
      }],
    })).toThrow();
  });

  it.each([
    ['startFrame', -1],
    ['durationInFrames', -1],
  ])('rejects negative %s', (field, value) => {
    expect(() => MotionProjectSchema.parse({
      ...validProject,
      effects: [{ ...validProject.effects[0], [field]: value }],
    })).toThrow();
  });
});
