import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validateAgentDraft } from '../src/project/validateDraft';
import type { AgentDraftValidationResult } from '../src/project/validateDraftCore';

/**
 * Regression gate for the dual-track validator: the standalone bundle shipped
 * inside the skill (skill/scripts/validate-agent-draft.mjs, built from the
 * shared validateDraftCore) must produce byte-identical diagnostics to the
 * in-app validateAgentDraft on the same fixtures. Any divergence between the
 * bundled rules and the program's own rules fails here.
 */
const projectRoot = resolve(import.meta.dirname, '..');
const standalonePath = join(projectRoot, 'skill', 'scripts', 'validate-agent-draft.mjs');

const jsonPath = (parts: Array<string | number> = []): string => `$${parts.map((part) => (
  typeof part === 'number' ? `[${part}]` : /^[A-Za-z_$][\w$]*$/.test(part) ? `.${part}` : `[${JSON.stringify(part)}]`
)).join('')}`;

const serialize = (result: AgentDraftValidationResult) => ({
  valid: result.valid,
  errors: result.errors.map(({ code, message, path = [] }) => ({
    code,
    message,
    path: jsonPath(path),
  })),
  warnings: result.warnings.map(({ code, message, path = [] }) => ({
    code,
    message,
    path: jsonPath(path),
  })),
});

const input = {
  kind: 'captionforge.agent-input',
  schemaVersion: 1,
  componentLibraryVersion: 1,
  video: { width: 1920, height: 1080, fps: 30, durationMs: 12000 },
  cues: [
    { cueId: 'cue-1', startMs: 0, endMs: 2000, text: '算力云平台正式发布' },
    { cueId: 'cue-2', startMs: 2000, endMs: 5000, text: '单卡吞吐提升 2.5 倍' },
    { cueId: 'cue-3', startMs: 5000, endMs: 12000, text: '覆盖 30 个城市节点' },
  ],
};

const draftBase = {
  kind: 'captionforge.agent-draft',
  schemaVersion: 1,
  componentLibraryVersion: 1,
};

const cases: Array<{ name: string; draft: unknown; input?: unknown }> = [
  {
    name: 'valid draft',
    draft: {
      ...draftBase,
      scenes: [
        {
          sceneId: 's1',
          sourceCueIds: ['cue-1', 'cue-2', 'cue-3'],
          components: [
            {
              componentId: 'fx-01',
              componentVersion: 1,
              role: 'chapter',
              content: { enText: 'LAUNCH', titleText: '算力云平台正式发布' },
              placementPreset: 'auto',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'unknown cue and unknown component',
    draft: {
      ...draftBase,
      scenes: [
        {
          sceneId: 's9',
          sourceCueIds: ['cue-999'],
          components: [
            {
              componentId: 'nope-01',
              componentVersion: 9,
              role: 'x',
              content: { titleText: '3.14 不存在的数字' },
            },
          ],
        },
      ],
    },
  },
  {
    name: 'schema shape errors',
    draft: { kind: 'captionforge.agent-draft', scenes: 'not-an-array' },
  },
  {
    // 数字溯源校验已移除：两侧都应放行（一致性仍需保持）。
    name: 'numeric claims are not import-checked (grounding moved to authoring)',
    draft: {
      ...draftBase,
      scenes: [
        {
          sceneId: 's1',
          sourceCueIds: ['cue-1'],
          components: [
            {
              componentId: 'fx-01',
              componentVersion: 1,
              role: 'chapter',
              content: { enText: 'GROWTH', titleText: '增长 3.14 倍' },
            },
          ],
        },
      ],
    },
  },
  {
    name: 'cue bounds outside the video frame range',
    draft: {
      ...draftBase,
      scenes: [
        {
          sceneId: 's1',
          sourceCueIds: ['cue-1'],
          components: [
            {
              componentId: 'fx-01',
              componentVersion: 1,
              role: 'chapter',
              content: { enText: 'LATE', titleText: '晚于成片' },
            },
          ],
        },
      ],
    },
    input: {
      kind: 'captionforge.agent-input',
      schemaVersion: 1,
      componentLibraryVersion: 1,
      video: { width: 1920, height: 1080, fps: 30, durationMs: 1000 },
      cues: [{ cueId: 'cue-1', startMs: 2000, endMs: 3000, text: '晚于成片' }],
    },
  },
];

const fixtureRoot = mkdtempSync(join(tmpdir(), 'mc-standalone-'));

describe('standalone skill validator matches the in-app rules', () => {
  beforeAll(() => {
    if (!existsSync(standalonePath)) {
      spawnSync('node', ['scripts/build-standalone-validator.mjs'], { cwd: projectRoot });
    }
    expect(existsSync(standalonePath)).toBe(true);
  });

  afterAll(() => rmSync(fixtureRoot, { recursive: true, force: true }));

  for (const testCase of cases) {
    it(testCase.name, () => {
      const draftPath = join(fixtureRoot, 'draft.json');
      const inputPath = join(fixtureRoot, 'input.json');
      writeFileSync(draftPath, JSON.stringify(testCase.draft));
      writeFileSync(inputPath, JSON.stringify(testCase.input ?? input));

      const engine = validateAgentDraft(testCase.draft, testCase.input ?? input);
      const spawned = spawnSync('node', [standalonePath, draftPath, inputPath], {
        encoding: 'utf8',
      });

      expect(spawned.status).toBe(engine.valid ? 0 : 1);
      expect(JSON.parse(spawned.stdout)).toEqual(serialize(engine));
      expect(engine.valid).toBe(engine.errors.length === 0);
    });
  }
});
