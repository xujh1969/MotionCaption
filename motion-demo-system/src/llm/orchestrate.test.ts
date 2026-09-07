import { describe, expect, it, vi } from 'vitest';
import type { MotionProject } from '../project/types';
import { createScriptedProvider, LlmAbortedError, type LlmProvider } from './provider';
import { orchestrateEffects, type ComponentSummary, type OrchestrationResult } from './orchestrate';

const project = (): MotionProject => ({
  kind: 'captionforge.project', schemaVersion: 1,
  video: { width: 1920, height: 1080, fps: 30, durationInFrames: 300 },
  cues: [{ cueId: 'cue-1', startMs: 1000, endMs: 2000, text: 'AI 编排标题与说明' }],
  effects: [{
    instanceId: 'existing', componentId: 't1-05', componentVersion: 1,
    sourceCueIds: ['cue-1'], startFrame: 0, durationInFrames: 30, track: 0, zIndex: 1,
    props: { titleText: '旧标题' }, transform: { x: 0, y: 0, scale: 1, rotation: 0 },
  }],
});

const components: ComponentSummary[] = [
  {
    componentId: 't1-05', componentVersion: 1, name: '标题+说明组合',
    suitableFor: ['Key title with a supporting line.'],
    avoidFor: ['Avoid data lists.'],
  },
  {
    componentId: 't2-01', componentVersion: 1, name: '发光边框卡片',
    suitableFor: ['Quotation card.'],
    avoidFor: ['Avoid charts.'],
  },
];

const reference = (componentId: string): string => (
  componentId === 't1-05'
    ? '# t1-05\n\nEditable content keys: titleText, descText.'
    : '# t2-01\n\nEditable content keys: contentText.'
);

const selectionReply = '{"selectedComponentIds": ["t1-05"]}';

const draftReply = JSON.stringify({
  kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
  scenes: [{
    sceneId: 'scene-1', sourceCueIds: ['cue-1'],
    components: [{
      componentId: 't1-05', componentVersion: 1, role: 'title',
      content: { titleText: 'AI 标题', descText: 'AI 说明' },
    }],
  }],
});

const okOptions = () => ({
  project: project(),
  style: '科技感',
  components,
  loadReference: reference,
});

describe('orchestrateEffects', () => {
  it('succeeds on the first pass with a two-stage request flow', async () => {
    const requests: Array<{ messages: Array<{ role: string; content: string }> }> = [];
    const provider = createScriptedProvider([selectionReply, draftReply], (request, index) => {
      requests[index] = request;
    });

    const result = await orchestrateEffects(provider, okOptions());

    expect(result).toMatchObject({ ok: true, attempts: 1 });
    if (!result.ok) return;
    expect(result.warnings).toEqual([]);
    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]).toMatchObject({
      componentId: 't1-05', props: { titleText: 'AI 标题', descText: 'AI 说明' },
    });

    // Stage 1 carries summaries only; stage 2 carries the full selected reference.
    expect(requests[0].messages[0].content).toContain('t1-05');
    expect(requests[0].messages[0].content).not.toContain('Editable content keys');
    expect(requests[1].messages[0].content).toContain('Editable content keys: titleText, descText.');
    expect(requests[1].messages[0].content).not.toContain('# t2-01');
    expect(requests[1].messages[0].content).toContain('科技感');
  });

  it('repairs invalid stage-two JSON exactly once and reports attempts 2', async () => {
    const requests: Array<{ messages: Array<{ role: string; content: string }> }> = [];
    const provider = createScriptedProvider(
      [selectionReply, 'not json at all', draftReply],
      (request, index) => { requests[index] = request; },
    );

    const result = await orchestrateEffects(provider, okOptions());

    expect(result).toMatchObject({ ok: true, attempts: 2 });
    const repairRequest = requests[2];
    const lastMessage = repairRequest.messages[repairRequest.messages.length - 1];
    expect(lastMessage?.role).toBe('user');
    expect(lastMessage?.content).toContain('not json at all');
  });

  it('fails after one repair when the model never produces valid output', async () => {
    const provider = createScriptedProvider([selectionReply, 'nope', 'still nope']);

    const result = await orchestrateEffects(provider, okOptions());

    expect(result).toMatchObject({ ok: false, attempts: 2 });
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.every((error) => error.message)).toBe(true);
  });

  it('rejects selections that contain no known component', async () => {
    const provider = createScriptedProvider([
      '{"selectedComponentIds": ["ghost-99"]}',
      draftReply,
    ]);

    const result = await orchestrateEffects(provider, okOptions());

    expect(result).toMatchObject({ ok: false, attempts: 1 });
    if (result.ok) return;
    expect(result.errors[0]).toMatchObject({ code: 'no_components' });
  });

  it('repairs drafts with an incompatible component library version', async () => {
    const staleDraft = JSON.parse(draftReply) as Record<string, unknown>;
    staleDraft.componentLibraryVersion = 2;
    const provider = createScriptedProvider([
      selectionReply,
      JSON.stringify(staleDraft),
      draftReply,
    ]);

    const result = await orchestrateEffects(provider, okOptions());

    expect(result).toMatchObject({ ok: true, attempts: 2 });
  });

  it('leaves the input project untouched and never writes store state', async () => {
    const options = okOptions();
    const before = structuredClone(options.project);
    const provider = createScriptedProvider([selectionReply, draftReply]);

    const result: OrchestrationResult = await orchestrateEffects(provider, options);

    expect(result.ok).toBe(true);
    expect(options.project).toEqual(before);
  });

  it('fails fast when the signal is already aborted', async () => {
    const provider: LlmProvider = { complete: vi.fn(async () => draftReply) };
    const controller = new AbortController();
    controller.abort();

    const result = await orchestrateEffects(provider, { ...okOptions(), signal: controller.signal });

    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.errors[0]).toMatchObject({ code: 'aborted' });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it('surfaces an abort raised mid-run by the provider', async () => {
    const provider = createScriptedProvider([selectionReply, new LlmAbortedError() as unknown as string]);

    const result = await orchestrateEffects(provider, okOptions());

    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.errors[0]).toMatchObject({ code: 'aborted' });
  });
});
