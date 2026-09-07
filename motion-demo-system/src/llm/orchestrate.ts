import { importAgentSequence } from '../agent/importAgentSequence';
import { AgentDraftSchema } from '../project/schema';
import type { AgentDraft, MotionProject } from '../project/types';
import type { DraftDiagnostic } from '../project/validateDraft';
import { LlmAbortedError, throwIfAborted, type LlmChatMessage, type LlmProvider } from './provider';

export interface ComponentSummary {
  componentId: string;
  componentVersion: number;
  name: string;
  suitableFor: string[];
  avoidFor: string[];
}

export interface OrchestrationOptions {
  project: MotionProject;
  style: string;
  components: ComponentSummary[];
  /** Loads the generated skill reference markdown for a selected component. */
  loadReference: (componentId: string) => string | null;
  signal?: AbortSignal;
}

export type OrchestrationResult =
  | { ok: true; effects: import('../project/types').MotionEffectInstance[]; warnings: DraftDiagnostic[]; attempts: 1 | 2 }
  | { ok: false; errors: DraftDiagnostic[]; attempts: 1 | 2 };

const SYSTEM_PROMPT = [
  '你是 CaptionForge 的字幕动效编排助手。',
  '你会收到字幕内容、画布参数、可选的风格偏好和组件资料，任务是挑选组件并填写它们允许编辑的内容字段。',
  '规则：',
  '1. 只输出一个 JSON 对象，禁止输出任何解释、注释或 Markdown 代码围栏以外的文字。',
  '2. 内容字段只能使用组件资料中明确列为可编辑的键；风格、布局、坐标等一切样式属性由系统锁定，禁止出现在 JSON 中。',
  '3. 内容必须基于字幕原文，不得编造字幕里不存在的事实。',
].join('\n');

const SELECTION_INSTRUCTION = [
  '请从下方组件清单中选出最适合表达这批字幕的组件（1-6 个）。',
  '只输出 JSON：{"selectedComponentIds": ["组件ID", ...]}。',
  '',
  '## 画布',
  '{{CANVAS}}',
  '',
  '## 字幕',
  '{{CUES}}',
  '',
  '## 风格偏好',
  '{{STYLE}}',
  '',
  '## 组件清单（ID | 名称 | 适用 | 不适用）',
  '{{COMPONENTS}}',
].join('\n');

const DRAFT_INSTRUCTION = [
  '基于选定的组件资料，为这批字幕产出一个完整的 CaptionForge Agent 草稿。',
  '只输出一个符合以下结构的 JSON 对象：',
  '{"kind":"captionforge.agent-draft","schemaVersion":1,"componentLibraryVersion":1,"scenes":[{"sceneId":"scene-1","sourceCueIds":["..."],"components":[{"componentId":"...","componentVersion":1,"role":"...","content":{...},"placementPreset":"auto"}]}]}',
  '每个组件的 content 只能包含其资料中列出的可编辑键。',
  '',
  '## 画布',
  '{{CANVAS}}',
  '',
  '## 字幕',
  '{{CUES}}',
  '',
  '## 风格偏好',
  '{{STYLE}}',
  '',
  '## 选定组件资料',
  '{{REFERENCES}}',
].join('\n');

/** Extracts a JSON object string, tolerating Markdown code fences around it. */
export function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

const canvasBlock = (project: MotionProject): string => (
  `${project.video.width}x${project.video.height} · ${project.video.fps}fps · ${project.video.durationInFrames} 帧`
);

const cuesBlock = (project: MotionProject): string => (
  project.cues.length
    ? project.cues.map((cue) => (
      `[${cue.cueId}] ${cue.startMs}-${cue.endMs}ms ${cue.text}`
    )).join('\n')
    : '（无字幕）'
);

const componentsBlock = (components: ComponentSummary[]): string => (
  components.map((component) => (
    `${component.componentId} v${component.componentVersion} | ${component.name}`
    + ` | ${component.suitableFor.join('；') || '—'}`
    + ` | ${component.avoidFor.join('；') || '—'}`
  )).join('\n')
);

const fill = (template: string, values: Record<string, string>): string => (
  Object.entries(values).reduce(
    (text, [token, value]) => text.split(`{{${token}}}`).join(value),
    template,
  )
);

interface StageOutcome {
  text: string;
  parsed: unknown;
  messages: LlmChatMessage[];
}

class OrchestrationFailure extends Error {
  constructor(
    public readonly diagnostic: DraftDiagnostic,
    public readonly messages: LlmChatMessage[],
    public readonly raw: string | null,
  ) {
    super(diagnostic.message);
  }
}

/**
 * Runs one completion and parses its reply as a JSON object. Throws
 * OrchestrationFailure so the caller can decide whether a repair round is
 * still available.
 */
async function runStage(
  provider: LlmProvider,
  messages: LlmChatMessage[],
  signal: AbortSignal | undefined,
  describeError: (detail: string) => DraftDiagnostic,
): Promise<StageOutcome> {
  let text: string;
  try {
    throwIfAborted(signal);
    text = await provider.complete({ system: SYSTEM_PROMPT, messages, signal });
  } catch (error) {
    if (error instanceof LlmAbortedError || (error instanceof Error && error.name === 'AbortError')) {
      throw new OrchestrationFailure({ code: 'aborted', message: 'AI 编排已取消。' }, messages, null);
    }
    throw new OrchestrationFailure(
      describeError(error instanceof Error ? error.message : String(error)),
      messages,
      null,
    );
  }
  const json = extractJsonObject(text);
  if (!json) {
    throw new OrchestrationFailure(
      describeError('模型输出中没有可解析的 JSON 对象。'),
      messages,
      text,
    );
  }
  try {
    return { text, parsed: JSON.parse(json), messages };
  } catch (error) {
    throw new OrchestrationFailure(
      describeError(`JSON 解析失败：${error instanceof Error ? error.message : '未知错误'}`),
      messages,
      text,
    );
  }
}

function repairMessages(
  failed: { text: string; messages: LlmChatMessage[] },
  errors: readonly string[],
): LlmChatMessage[] {
  return [
    ...failed.messages,
    {
      role: 'user' as const,
      content: [
        '你上一次的输出无效。输出原文如下：',
        '<<<',
        failed.text,
        '>>>',
        '错误如下：',
        ...errors.map((error) => `- ${error}`),
        '请重新输出修正后的完整 JSON 对象，仍然只输出 JSON。',
      ].join('\n'),
    },
  ];
}

export async function orchestrateEffects(
  provider: LlmProvider,
  options: OrchestrationOptions,
): Promise<OrchestrationResult> {
  const { project, style, components, loadReference, signal } = options;
  const shared = {
    CANVAS: canvasBlock(project),
    CUES: cuesBlock(project),
    STYLE: style.trim() || '（未指定）',
  };

  // Stage 1 — component selection from summaries only.
  let selection: StageOutcome;
  try {
    selection = await runStage(
      provider,
      [{ role: 'user', content: fill(SELECTION_INSTRUCTION, {
        ...shared,
        COMPONENTS: componentsBlock(components),
      }) }],
      signal,
      (detail) => ({ code: 'selection_invalid', message: `组件选择阶段失败：${detail}` }),
    );
  } catch (error) {
    if (error instanceof OrchestrationFailure) {
      // Aborting must never trigger another completion.
      if (error.diagnostic.code === 'aborted') {
        return { ok: false, errors: [error.diagnostic], attempts: 1 };
      }
      // One repair round for the selection stage.
      try {
        selection = await runStage(
          provider,
          repairMessages({ text: error.raw ?? '', messages: error.messages }, [error.diagnostic.message]),
          signal,
          (detail) => ({ code: 'selection_invalid', message: `组件选择阶段失败：${detail}` }),
        );
    } catch (retryError) {
      const failure = retryError instanceof OrchestrationFailure
        ? retryError
        : new OrchestrationFailure(
          { code: 'selection_invalid', message: `组件选择阶段失败：${retryError instanceof Error ? retryError.message : '未知错误'}` },
          [],
          null,
        );
      return {
        ok: false,
        errors: [failure.diagnostic],
        attempts: failure.diagnostic.code === 'aborted' ? 1 : 2,
      };
    }
  } else {
    throw error;
  }
  }

  const parsedSelection = selection.parsed as { selectedComponentIds?: unknown };
  const requestedIds = Array.isArray(parsedSelection?.selectedComponentIds)
    ? parsedSelection.selectedComponentIds.filter((id): id is string => typeof id === 'string')
    : [];
  const knownIds = new Set(components.map((component) => component.componentId));
  const selectedIds = [...new Set(requestedIds)].filter((id) => knownIds.has(id));
  const references = selectedIds
    .map((componentId) => ({ componentId, reference: loadReference(componentId) }))
    .filter((entry): entry is { componentId: string; reference: string } => entry.reference !== null);

  if (!references.length) {
    return {
      ok: false,
      errors: [{ code: 'no_components', message: '模型没有选中任何有效组件，无法生成动效草稿。' }],
      attempts: 1,
    };
  }

  // Stage 2 — full agent draft with only the selected references.
  const draftMessages = (): LlmChatMessage[] => [{
    role: 'user',
    content: fill(DRAFT_INSTRUCTION, {
      ...shared,
      REFERENCES: references
        .map(({ componentId, reference }) => `### ${componentId}\n\n${reference}`)
        .join('\n\n'),
    }),
  }];

  const compile = (candidate: unknown): { project: MotionProject; warnings: DraftDiagnostic[] } => {
    const parsed = AgentDraftSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new OrchestrationFailure(
        {
          code: 'draft_schema_invalid',
          message: `草稿结构校验失败：${parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('；')}`,
        },
        draftMessages(),
        JSON.stringify(candidate),
      );
    }
    const draft: AgentDraft = parsed.data;
    const imported = importAgentSequence(project, draft);
    if (!imported.ok) {
      throw new OrchestrationFailure(
        imported.errors[0] ?? { code: 'draft_invalid', message: '草稿校验失败。' },
        draftMessages(),
        JSON.stringify(candidate),
      );
    }
    return imported;
  };

  try {
    const stage = await runStage(provider, draftMessages(), signal, (detail) => ({
      code: 'draft_invalid',
      message: `草稿生成阶段失败：${detail}`,
    }));
    const imported = compile(stage.parsed);
    return { ok: true, effects: imported.project.effects, warnings: imported.warnings, attempts: 1 };
  } catch (error) {
    if (!(error instanceof OrchestrationFailure)) throw error;
    if (error.diagnostic.code === 'aborted') {
      return { ok: false, errors: [error.diagnostic], attempts: 1 };
    }

    // Exactly one repair round; never a third completion.
    try {
      const stage = await runStage(
        provider,
        repairMessages({ text: error.raw ?? '', messages: error.messages }, [error.diagnostic.message]),
        signal,
        (detail) => ({ code: 'draft_invalid', message: `草稿生成阶段失败：${detail}` }),
      );
      const imported = compile(stage.parsed);
      return { ok: true, effects: imported.project.effects, warnings: imported.warnings, attempts: 2 };
    } catch (retryError) {
      if (!(retryError instanceof OrchestrationFailure)) throw retryError;
      return {
        ok: false,
        errors: [retryError.diagnostic],
        attempts: retryError.diagnostic.code === 'aborted' ? 1 : 2,
      };
    }
  }
}
