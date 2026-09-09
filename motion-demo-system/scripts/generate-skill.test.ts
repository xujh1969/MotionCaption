import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { effectRegistry } from '../src/effects/registry';
import { toComponentMeta } from '../src/project/componentMeta';
import { EffectInstanceFrame } from '../src/composition/EffectInstanceFrame';
import { compileAgentDraft } from '../src/project/compileDraft';
import { AgentDraftSchema, AgentInputSchema } from '../src/project/schema';
import { validateAgentDraft } from '../src/project/validateDraft';
import { ConfigProvider, EffectClipCtx } from '../src/remotion/config';
import {
  compareSkillArtifacts,
  generateSkillArtifacts,
  writeSkillArtifacts,
} from './generate-skill.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const generatedRoots = ['skill', 'src/agent/generated/componentManifest.json'];

const safeMixedLists = [
  { id: 'fx-04', key: 'items', safe: ['name', 'val'], locked: 'color', items: [
    { name: '算力', val: '10' }, { name: '能效', val: '20' }, { name: '精度', val: '30' }, { name: '速度', val: '40' },
  ] },
  { id: 'fx-08', key: 'bars', safe: ['g', 'n'], locked: 'color', items: [
    { n: '进度甲', g: '10' }, { n: '进度乙', g: '20' },
  ] },
  { id: 't3-04', key: 'rows', safe: ['d', 'k', 'v'], locked: 'at', items: [
    { k: '延迟', v: '10ms', d: '低延迟' }, { k: '功耗', v: '20W', d: '低功耗' },
  ] },
  { id: 't4-02', key: 'nodes', safe: ['cn', 'en'], locked: 'color', items: [
    { cn: '阶段甲', en: 'STAGE A' }, { cn: '阶段乙', en: 'STAGE B' },
  ] },
  { id: 't5-02', key: 'items', safe: ['d', 't', 'tag'], locked: 'color', items: [
    { tag: 'DONE', t: '任务甲', d: '已经完成' }, { tag: 'NEXT', t: '任务乙', d: '等待开始' },
  ] },
  { id: 't5-05', key: 'cards', safe: ['main', 'small'], locked: 'color', items: [
    { small: '工作强度', main: '持续上升' }, { small: '人员经验', main: '稳步增长' },
  ] },
  { id: 't5-06', key: 'items', safe: ['label', 'title'], locked: 'color', items: [
    { label: '时间问题', title: '标题出场过早' }, { label: '位置问题', title: '数字遮挡人物' },
  ] },
  { id: 't7-01', key: 'items', safe: ['cat', 'val'], locked: 'hl', items: [
    { cat: '版本甲', val: '10' }, { cat: '版本乙', val: '20' },
  ] },
  { id: 't7-03', key: 'segs', safe: ['name', 'pct'], locked: 'color', items: [
    { name: '推理算力', pct: '40' }, { name: '缓存开销', pct: '60' },
  ] },
  { id: 't7-04', key: 'lines', safe: ['data', 'name'], locked: 'color', items: [
    { name: '模型甲', data: '10,20,30' }, { name: '模型乙', data: '20,30,40' },
  ] },
] as const;

const editableDefaults = (id: string): Record<string, unknown> => Object.fromEntries(
  Object.entries(effectRegistry.get(id).props)
    .filter(([, prop]) => prop.agentEditable)
    .map(([key, prop]) => {
      if (prop.type !== 'list' || typeof prop.default !== 'string') return [key, prop.default];
      return [key, JSON.parse(prop.default)];
    }),
);

const fileState = (): string => execFileSync(
  'git',
  ['status', '--short', '--', ...generatedRoots],
  { cwd: projectRoot, encoding: 'utf8' },
);

describe('generated component skill', () => {
  const definitions = effectRegistry.list();
  const artifacts = generateSkillArtifacts(definitions, AgentDraftSchema, definitions.map(toComponentMeta));

  it('creates exactly one discoverable reference per approved component', () => {
    const approved = definitions
      .filter(({ selection }) => selection.suitableFor.length > 0 && selection.avoidFor.length > 0)
      .map(({ id }) => id)
      .sort();
    const references = [...artifacts.keys()]
      .filter((path) => path.startsWith('skill/references/components/'))
      .map((path) => path.replace('skill/references/components/', '').replace(/\.md$/, ''))
      .sort();

    expect(references).toEqual(approved);
    for (const id of approved) {
      expect(artifacts.get('skill/SKILL.md')).toContain(`references/components/${id}.md`);
    }
  });

  it('puts one syntactically valid component JSON example in every reference', () => {
    for (const definition of definitions) {
      const reference = artifacts.get(`skill/references/components/${definition.id}.md`)!;
      const examples = [...reference.matchAll(/```json\n([\s\S]*?)\n```/g)];
      expect(examples, definition.id).toHaveLength(1);
      expect(() => JSON.parse(examples[0][1]), definition.id).not.toThrow();
      expect(JSON.parse(examples[0][1])).toMatchObject({
        componentId: definition.id,
        componentVersion: definition.version,
      });
    }
  });

  it('makes every generated example pass the real schema and application content validator', () => {
    for (const definition of definitions) {
      const reference = artifacts.get(`skill/references/components/${definition.id}.md`)!;
      const component = JSON.parse([...reference.matchAll(/```json\n([\s\S]*?)\n```/g)][0][1]);
      const input = {
        kind: 'captionforge.agent-input', schemaVersion: 1, componentLibraryVersion: 1,
        video: { width: 1920, height: 1080, fps: 30, durationMs: 4000 },
        cues: [{ cueId: 'cue-1', startMs: 0, endMs: 4000, text: JSON.stringify(component.content) }],
      } as const;
      const draft = {
        kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
        scenes: [{ sceneId: 'scene-1', sourceCueIds: ['cue-1'], components: [component] }],
      };

      expect(AgentInputSchema.safeParse(input).success, definition.id).toBe(true);
      expect(AgentDraftSchema.safeParse(draft).success, definition.id).toBe(true);
      expect(validateAgentDraft(draft, input).errors, definition.id).toEqual([]);
    }
  });

  it('exposes only agent-editable content properties and keeps style/layout locked', () => {
    const manifest = JSON.parse(artifacts.get('src/agent/generated/componentManifest.json')!);

    for (const definition of definitions) {
      const item = manifest.components.find(({ id }: { id: string }) => id === definition.id);
      const editableKeys = Object.entries(definition.props)
        .filter(([, prop]) => prop.agentEditable)
        .map(([key]) => key)
        .sort();
      expect(Object.keys(item.content).sort(), definition.id).toEqual(editableKeys);
      expect(Object.values(item.content).every((prop: any) => prop.role === 'content')).toBe(true);

      const reference = artifacts.get(`skill/references/components/${definition.id}.md`)!;
      for (const [key, prop] of Object.entries(definition.props)) {
        expect(reference.includes(`\`${key}\``), `${definition.id}.${key}`).toBe(prop.agentEditable);
      }
    }
  });

  it('publishes structured exact list item fields and capacities in the manifest', () => {
    const manifest = JSON.parse(artifacts.get('src/agent/generated/componentManifest.json')!);
    const steps = manifest.components.find(({ id }: { id: string }) => id === 't4-01').content.steps;

    expect(steps).toMatchObject({
      type: 'list',
      minItems: 2,
      maxItems: 4,
      itemFields: [
        { key: 'd', required: true, type: 'string' },
        { key: 'n', required: true, type: 'string' },
        { key: 't', required: true, type: 'string' },
      ],
    });
  });

  it.each(safeMixedLists)('$id exposes only reviewed $key content fields', ({ id, key, safe, locked }) => {
    const definition = effectRegistry.get(id);
    expect(definition.props[key].agentEditable).toBe(true);
    expect(definition.props[key].agentEditableItemFields).toEqual(safe);
    const manifest = JSON.parse(artifacts.get('src/agent/generated/componentManifest.json')!);
    const list = manifest.components.find((item: { id: string }) => item.id === id).content[key];
    expect(list.itemFields.map(({ key: field }: { key: string }) => field)).toEqual(safe);
    expect(JSON.stringify(list)).not.toContain(locked);
  });

  it.each(safeMixedLists)('$id validates, compiles, and maps safe list content into its render config', ({
    id, key, safe, locked, items,
  }) => {
    const content = { ...editableDefaults(id), [key]: items };
    const cue = { cueId: 'cue-1', startMs: 0, endMs: 4000, text: JSON.stringify(content) };
    const input = {
      kind: 'captionforge.agent-input', schemaVersion: 1, componentLibraryVersion: 1,
      video: { width: 1920, height: 1080, fps: 30, durationMs: 4000 }, cues: [cue],
    } as const;
    const draft = {
      kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
      scenes: [{ sceneId: 'scene-1', sourceCueIds: ['cue-1'], components: [{
        componentId: id, componentVersion: 1, role: 'items', content,
      }] }],
    } as const;

    expect(validateAgentDraft(draft, input).errors, id).toEqual([]);
    const [effect] = compileAgentDraft({
      kind: 'captionforge.project', schemaVersion: 1,
      video: { width: 1920, height: 1080, fps: 30, durationInFrames: 120 }, cues: [cue], effects: [],
    }, draft, { createInstanceId: () => `effect-${id}` });
    const formalItems = effect.props[key] as Array<Record<string, unknown>>;
    expect(formalItems.map((item) => Object.fromEntries(safe.map((field) => [field, item[field]]))), id)
      .toEqual(items);
    if (locked === 'at') {
      // at 是渲染层契约字段：AI 未提供时不注入任何默认值（渲染器回退均匀节奏）
      expect(formalItems.every((item) => !(locked in item)), id).toBe(true);
    } else {
      expect(formalItems.every((item) => locked in item), id).toBe(true);
    }

    const provider = EffectInstanceFrame({ effect }) as any;
    expect(provider.type, id).toBe(ConfigProvider);
    expect(JSON.parse(provider.props.value[key]), id).toEqual(formalItems);
    // EffectInstanceFrame 内层先包实例时长上下文，最内层才是组件渲染器
    expect(provider.props.children.type, id).toBe(EffectClipCtx.Provider);
    expect(provider.props.children.props.value, id).toBe(effect.durationInFrames);
    expect(provider.props.children.props.children.type, id).toBe(effectRegistry.get(id).component);
  });

  it.each(safeMixedLists)('$id rejects the locked $locked list field at an exact JSON path', ({
    id, key, locked, items,
  }) => {
    const content = {
      ...editableDefaults(id),
      [key]: items.map((item, index) => index === 0 ? { ...item, [locked]: 'forbidden' } : item),
    };
    const input = {
      kind: 'captionforge.agent-input', schemaVersion: 1, componentLibraryVersion: 1,
      video: { width: 1920, height: 1080, fps: 30, durationMs: 4000 },
      cues: [{ cueId: 'cue-1', startMs: 0, endMs: 4000, text: JSON.stringify(content) }],
    } as const;
    const draft = {
      kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
      scenes: [{ sceneId: 'scene-1', sourceCueIds: ['cue-1'], components: [{
        componentId: id, componentVersion: 1, role: 'items', content,
      }] }],
    } as const;

    // locked='at' 是合法的可选数值字段：非数值仍报 content_type；其余锁定字段报 unknown_content_field
    expect(validateAgentDraft(draft, input).errors).toContainEqual(expect.objectContaining({
      code: locked === 'at' ? 'content_type' : 'unknown_content_field',
      path: ['scenes', 0, 'components', 0, 'content', key, 0, locked],
    }));
  });

  it('t3-04 accepts a numeric at and preserves it through compile', () => {
    const content = {
      ...editableDefaults('t3-04'),
      rows: [
        { k: '延迟', v: '10ms', d: '低延迟', at: 1.5 },
        { k: '功耗', v: '20W', d: '低功耗' },
      ],
    };
    const cue = { cueId: 'cue-1', startMs: 0, endMs: 4000, text: JSON.stringify(content) };
    const input = {
      kind: 'captionforge.agent-input', schemaVersion: 1, componentLibraryVersion: 1,
      video: { width: 1920, height: 1080, fps: 30, durationMs: 4000 }, cues: [cue],
    } as const;
    const draft = {
      kind: 'captionforge.agent-draft', schemaVersion: 1, componentLibraryVersion: 1,
      scenes: [{ sceneId: 'scene-1', sourceCueIds: ['cue-1'], components: [{
        componentId: 't3-04', componentVersion: 1, role: 'items', content,
      }] }],
    } as const;

    expect(validateAgentDraft(draft, input).errors).toEqual([]);
    const [effect] = compileAgentDraft({
      kind: 'captionforge.project', schemaVersion: 1,
      video: { width: 1920, height: 1080, fps: 30, durationInFrames: 120 }, cues: [cue], effects: [],
    }, draft, { createInstanceId: () => 'effect-at' });
    const rows = effect.props.rows as Array<Record<string, unknown>>;
    expect(rows[0].at).toBe(1.5);   // 数值 at 透传
    expect('at' in rows[1]).toBe(false); // 未提供的条目不注入默认值
  });

  it('is byte-stable with sorted categories, IDs, properties, and JSON keys', () => {
    const reversed = [...definitions].reverse();
    const second = generateSkillArtifacts(reversed, AgentDraftSchema, reversed.map(toComponentMeta));
    expect([...second.entries()]).toEqual([...artifacts.entries()]);

    const manifestText = artifacts.get('src/agent/generated/componentManifest.json')!;
    expect(`${JSON.stringify(JSON.parse(manifestText), null, 2)}\n`).toBe(manifestText);
    expect(JSON.parse(manifestText).libraryVersion).toBe(1);

    const metaText = artifacts.get('skill/scripts/validation-meta.json')!;
    expect(`${JSON.stringify(JSON.parse(metaText), null, 2)}\n`).toBe(metaText);
    expect(JSON.parse(metaText).components.length).toBe(definitions.length);
  });

  it('keeps detailed component contracts out of the root selection index', () => {
    const root = artifacts.get('skill/SKILL.md')!;
    expect(root).toContain('| ID | Summary | Motion feel | Use for | Avoid | Details |');
    expect(root).not.toContain('| Structure |');
    expect(root).not.toContain('| Capacity |');
    expect(root).not.toContain('titleText:text');
  });

  it('writes idempotently and check comparison reports missing, stale, and orphan IDs', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'motion-skill-'));
    try {
      writeSkillArtifacts(artifacts, fixtureRoot);
      const first = [...artifacts].map(([path]) => [path, readFileSync(join(fixtureRoot, path), 'utf8')]);
      writeSkillArtifacts(artifacts, fixtureRoot);
      const second = [...artifacts].map(([path]) => [path, readFileSync(join(fixtureRoot, path), 'utf8')]);
      expect(second).toEqual(first);

      rmSync(join(fixtureRoot, 'skill/references/components/fx-01.md'));
      writeFileSync(join(fixtureRoot, 'skill/references/components/fx-02.md'), 'stale\n');
      writeFileSync(join(fixtureRoot, 'skill/references/components/orphan-01.md'), 'orphan\n');
      expect(compareSkillArtifacts(artifacts, fixtureRoot)).toEqual({
        missing: ['fx-01'],
        stale: ['fx-02'],
        orphan: ['orphan-01'],
      });
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('a second project generation produces no additional Git diff', () => {
    const gitState = () => [
      execFileSync('git', ['diff', '--no-ext-diff', '--', ...generatedRoots], {
        cwd: projectRoot,
        encoding: 'utf8',
      }),
      fileState(),
    ].join('\n');
    const before = gitState();
    execFileSync('node', ['scripts/generate-skill.mjs'], { cwd: projectRoot, encoding: 'utf8' });
    expect(gitState()).toBe(before);
  });

  it('check:skill does not modify generated files or the worktree', () => {
    const before = fileState();
    execFileSync('node', ['scripts/check-skill.mjs'], { cwd: projectRoot, encoding: 'utf8' });
    expect(fileState()).toBe(before);
  });
});

describe('external draft validation', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'motion-draft-'));
  const inputPath = join(fixtureRoot, 'agent-input.json');
  const draftPath = join(fixtureRoot, 'draft.json');
  const input = {
    kind: 'captionforge.agent-input',
    schemaVersion: 1,
    componentLibraryVersion: 1,
    video: { width: 1920, height: 1080, fps: 30, durationMs: 5000 },
    cues: [{
      cueId: 'cue-1',
      startMs: 0,
      endMs: 5000,
      text: '人工智能正在改变创作方式，核心观点值得强调。',
    }],
  } as const;
  const forwardDraft = {
    kind: 'captionforge.agent-draft',
    schemaVersion: 1,
    componentLibraryVersion: 1,
    scenes: [{
      sceneId: 'scene-1',
      sourceCueIds: ['cue-1'],
      components: [
        {
          componentId: 't1-01', componentVersion: 1, role: 'title', placementPreset: 'left-top',
          content: {
            enText: 'AI',
            subText: '人工智能正在改变创作方式',
            tagText: 'AI',
            titleText: '核心观点值得强调',
          },
        },
        {
          componentId: 't2-01', componentVersion: 1, role: 'body', placementPreset: 'right-bottom',
          content: { contentText: '人工智能正在改变创作方式，核心观点值得强调。' },
        },
      ],
    }],
  } as const;

  beforeAll(() => {
    expect(AgentInputSchema.safeParse(input).success).toBe(true);
    writeFileSync(inputPath, JSON.stringify(input));
    writeFileSync(draftPath, JSON.stringify(forwardDraft));
  });
  afterAll(() => rmSync(fixtureRoot, { recursive: true, force: true }));

  it('lets an agent construct a valid two-component draft from root index and selected references', () => {
    const allDefinitions = effectRegistry.list();
    const artifacts = generateSkillArtifacts(
      allDefinitions,
      AgentDraftSchema,
      allDefinitions.map(toComponentMeta),
    );
    const root = artifacts.get('skill/SKILL.md')!;
    expect(root).toContain('references/components/t1-01.md');
    expect(root).toContain('references/components/t2-01.md');
    expect(artifacts.get('skill/references/components/t1-01.md')).toContain('titleText');
    expect(artifacts.get('skill/references/components/t2-01.md')).toContain('contentText');
    expect(validateAgentDraft(forwardDraft, input).valid).toBe(true);

    const result = spawnSync('node', ['scripts/validate-agent-draft.mjs', draftPath, inputPath], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ valid: true, errors: [] });
  });

  it('exits 1 and prints exact JSON paths for schema and source-rule errors', () => {
    const invalidPath = join(fixtureRoot, 'invalid.json');
    // 注入未知内容字段制造错误（数字溯源校验已移除，不能再靠凭空数字触发）。
    writeFileSync(invalidPath, JSON.stringify({
      ...forwardDraft,
      scenes: [{
        ...forwardDraft.scenes[0],
        components: [{
          ...forwardDraft.scenes[0].components[0],
          content: { ...forwardDraft.scenes[0].components[0].content, bogusField: '凭空字段' },
        }],
      }],
    }));
    const result = spawnSync('node', ['scripts/validate-agent-draft.mjs', invalidPath, inputPath], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '$.scenes[0].components[0].content.bogusField' }),
    ]));

    writeFileSync(invalidPath, JSON.stringify({
      ...forwardDraft,
      scenes: [{
        ...forwardDraft.scenes[0],
        components: [{
          componentId: 't1-01',
          componentVersion: 1,
          content: forwardDraft.scenes[0].components[0].content,
        }],
      }],
    }));
    const schemaResult = spawnSync('node', ['scripts/validate-agent-draft.mjs', invalidPath, inputPath], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    expect(schemaResult.status).toBe(1);
    expect(JSON.parse(schemaResult.stdout).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '$.scenes[0].components[0].role' }),
    ]));
  });
});
